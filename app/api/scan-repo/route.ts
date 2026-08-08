import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/scanner";
import { logScan } from "@/lib/logger/logger";
import { verifyWithAI } from "@/lib/aiVerification";
import { analyzeIntent } from "@/lib/aiIntentAnalysis/aiIntentAnalysis";
import { prisma } from "@/lib/db/prisma";
import type { RiskLevel } from "@/types/types";

// ─── Risk helpers ──────────────────────────────────────────────────────────────

function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 25) return "Safe";
  if (score <= 50) return "Low";
  if (score <= 75) return "Medium";
  return "Critical";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }

    const { repoUrl } = body as Record<string, unknown>;

    if (typeof repoUrl !== "string" || !repoUrl.trim()) {
      return NextResponse.json({ error: "Valid repoUrl string is required." }, { status: 400 });
    }

    // Normalise the URL:
    // 1. Trim whitespace.
    // 2. Strip trailing slash.
    // 3. Prepend https:// if no protocol is present (so URL() can parse it).
    // 4. Validate it is a github.com URL with at least owner + repo path segments.
    // 5. Strip a trailing ".git" from the repo segment.
    let normalized = repoUrl.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    let owner: string;
    let repo: string;
    try {
      const url = new URL(normalized);
      if (url.hostname !== "github.com") {
        return NextResponse.json(
          { error: "Only GitHub repository URLs are supported (e.g. github.com/owner/repo)." },
          { status: 400 }
        );
      }
      const segments = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
      if (segments.length < 2) {
        return NextResponse.json(
          { error: "Invalid GitHub URL format — could not extract owner and repo. Example: github.com/owner/repo" },
          { status: 400 }
        );
      }
      owner = segments[0];
      // Strip .git suffix if present
      repo = segments[1].replace(/\.git$/i, "");
    } catch {
      return NextResponse.json(
        { error: "Invalid GitHub URL format. Example: github.com/owner/repo or https://github.com/owner/repo.git" },
        { status: 400 }
      );
    }

    // Fetch README from GitHub API
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Aegis-Scanner"
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch default branch via GitHub API
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers
    });

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return NextResponse.json(
          { error: `Repository "${owner}/${repo}" not found. Ensure the repo is public and the URL is correct.` },
          { status: 404 }
        );
      } else if (repoRes.status === 403) {
        const rateLimitMsg = process.env.GITHUB_TOKEN
          ? "GitHub API rate limit reached. Wait a few minutes or use a different token."
          : "GitHub API rate limit reached. Add a GITHUB_TOKEN to increase the limit, or wait a few minutes.";
        return NextResponse.json({ error: rateLimitMsg }, { status: 403 });
      }
      return NextResponse.json({ error: `GitHub API error: ${repoRes.statusText}` }, { status: repoRes.status });
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";

    // Fetch Git Trees API recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      if (treeRes.status === 403) {
        const rateLimitMsg = process.env.GITHUB_TOKEN
          ? "GitHub API rate limit reached. Wait a few minutes or use a different token."
          : "GitHub API rate limit reached. Add a GITHUB_TOKEN to increase the limit, or wait a few minutes.";
        return NextResponse.json({ error: rateLimitMsg }, { status: 403 });
      }
      return NextResponse.json(
        { error: `Failed to fetch repository tree: ${treeRes.statusText}` },
        { status: treeRes.status }
      );
    }

    const treeData = await treeRes.json();
    const allFiles = (treeData.tree || []) as Array<{ path: string; type: string; size?: number }>;

    // Filter to text-based files
    const TEXT_EXTENSIONS = [
      ".md", ".txt", ".js", ".ts", ".jsx", ".tsx", ".json", ".yml", ".yaml",
      ".py", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp", ".cs",
      ".rb", ".php", ".sh", ".bash", ".env", ".toml", ".ini", ".cfg"
    ];

    const textFiles = allFiles
      .filter((f) => f.type === "blob" && TEXT_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)))
      .slice(0, 30);

    if (textFiles.length === 0) {
      return NextResponse.json(
        { error: "No scannable text files found in repository." },
        { status: 400 }
      );
    }

    // Fetch global settings
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const strictMode            = settings?.strictMode            ?? false;
    const learningMode          = settings?.learningMode          ?? false;
    const aiVerificationEnabled = settings?.aiVerificationEnabled ?? false;
    const intentAnalysisEnabled = settings?.intentAnalysisEnabled ?? false;

    // Scan each file: fetch content, then run regex + intent in parallel
    const fileResults = [];
    let highestFinalScore: number = 0;
    let highestFinalLevel: RiskLevel = "Safe";

    for (const file of textFiles) {
      try {
        const fileRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${defaultBranch}`,
          { headers }
        );

        if (fileRes.ok) {
          const fileData = await fileRes.json();
          if (fileData.encoding === "base64" && typeof fileData.content === "string") {
            const b64 = fileData.content.replace(/\n/g, "");
            const decoded = Buffer.from(b64, "base64").toString("utf8");

            // Run regex pipeline and intent analysis in parallel
            const [scanResult, intentResult] = await Promise.all([
              Promise.resolve(runFullScan(decoded, { strictMode })),
              intentAnalysisEnabled ? analyzeIntent(decoded) : Promise.resolve(null),
            ]);

            // AI Verification (if enabled and regex level is Medium or Critical)
            if (aiVerificationEnabled && (scanResult.riskLevel === "Medium" || scanResult.riskLevel === "Critical")) {
              const aiResult = await verifyWithAI(decoded, scanResult.detectedPatterns);
              if (aiResult) {
                scanResult.aiVerification = aiResult;
              }
            }

            // Compute per-file final score
            const regexScore      = scanResult.riskScore;
            const intentRiskScore = intentResult?.intentRiskScore ?? null;
            const intentReasoning = intentResult?.reasoning        ?? null;
            const finalScore      = Math.max(regexScore, intentRiskScore ?? 0);
            const finalRiskLevel  = scoreToRiskLevel(finalScore);

            fileResults.push({
              filePath:         file.path,
              regexScore,
              intentRiskScore,
              intentReasoning,
              finalScore,
              finalRiskLevel,
              // legacy fields kept for backward compat
              riskScore:            finalScore,
              riskLevel:            finalRiskLevel,
              detectedPatterns:     scanResult.detectedPatterns,
              originalContent:      scanResult.originalContent,
              sanitizedContent:     scanResult.sanitizedContent,
              aiVerification:       scanResult.aiVerification,
            });

            // Track the worst-case file using the merged final score
            if (finalScore > highestFinalScore) {
              highestFinalScore = finalScore;
              highestFinalLevel = finalRiskLevel;
            }
          }
        } else if (fileRes.status === 403) {
          const rateLimitMsg = process.env.GITHUB_TOKEN
            ? "GitHub API rate limit reached while fetching files. Wait a few minutes or use a different token."
            : "GitHub API rate limit reached while fetching files. Add a GITHUB_TOKEN to increase the limit, or wait a few minutes.";
          return NextResponse.json({ error: rateLimitMsg }, { status: 403 });
        }
      } catch {
        // Skip files that fail to fetch
        continue;
      }
    }

    if (fileResults.length === 0) {
      return NextResponse.json(
        { error: "Failed to read any file content from repository." },
        { status: 500 }
      );
    }

    // Determine middleware decision based on highest final risk
    let status: "Blocked" | "Allowed" = (highestFinalLevel === "Medium" || highestFinalLevel === "Critical")
      ? "Blocked"
      : "Allowed";
    if (learningMode) {
      status = "Allowed";
    }

    // Persist aggregate log entry
    try {
      await logScan({
        toolName: "github",
        scenario: "live-repo",
        riskScore: highestFinalScore,
        riskLevel: highestFinalLevel,
        detectedPatterns: fileResults.flatMap(f => f.detectedPatterns),
        originalContent: `Scanned ${fileResults.length} files`,
        sanitizedContent: `Scanned ${fileResults.length} files`,
        status,
      });
    } catch (logErr) {
      console.error("[Aegis /api/scan-repo] logScan failed:", logErr);
    }

    // Return per-file results with intent fields included
    return NextResponse.json({
      files: fileResults.map(f => ({
        filePath:              f.filePath,
        regexScore:            f.regexScore,
        intentRiskScore:       f.intentRiskScore,
        intentReasoning:       f.intentReasoning,
        finalScore:            f.finalScore,
        finalRiskLevel:        f.finalRiskLevel,
        // legacy aliases
        riskScore:             f.finalScore,
        riskLevel:             f.finalRiskLevel,
        detectedPatternsCount: f.detectedPatterns.length,
        detectedPatterns:      f.detectedPatterns,
        originalContent:       f.originalContent,
        sanitizedContent:      f.sanitizedContent,
      })),
      overallRiskScore: highestFinalScore,
      overallRiskLevel: highestFinalLevel,
      filesScanned:     fileResults.length,
      status,
    }, { status: 200 });

  } catch (err) {
    console.error("[Aegis /api/scan-repo] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error. Please try again." }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

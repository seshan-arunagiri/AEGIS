import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/scanner";
import { logScan } from "@/lib/logger/logger";
import { verifyWithAI } from "@/lib/aiVerification";
import { analyzeIntent } from "@/lib/aiIntentAnalysis/aiIntentAnalysis";
import { prisma } from "@/lib/db/prisma";
import pLimit from "p-limit";
import type { RiskLevel, BatchScanRequest, BatchScanResult } from "@/types/types";

// ─── Risk helpers ──────────────────────────────────────────────────────────────

function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 25) return "Safe";
  if (score <= 50) return "Low";
  if (score <= 75) return "Medium";
  return "Critical";
}

// Cap concurrent Groq calls at 5 to stay within the free-tier limit of
// 30 req/min. At 5 concurrent we can process a 30-file batch in ~6 rounds
// (each round ≤ 2 s), well within a 60-second window.
const GROQ_CONCURRENCY = 5;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth check: require x-aegis-token header matching AEGIS_CI_TOKEN env var
    const authToken = request.headers.get("x-aegis-token");

    if (!process.env.AEGIS_CI_TOKEN) {
      return NextResponse.json(
        { error: "Server configuration error: AEGIS_CI_TOKEN not set" },
        { status: 500 }
      );
    }

    if (!authToken || authToken !== process.env.AEGIS_CI_TOKEN) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing x-aegis-token header" },
        { status: 401 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    const { files } = body as Partial<BatchScanRequest>;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "files array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Validate each file has path and content
    for (const file of files) {
      if (typeof file !== "object" || file === null) {
        return NextResponse.json(
          { error: "Each file must be an object with path and content" },
          { status: 400 }
        );
      }
      if (typeof file.path !== "string" || typeof file.content !== "string") {
        return NextResponse.json(
          { error: "Each file must have path (string) and content (string)" },
          { status: 400 }
        );
      }
    }

    // Fetch global settings
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const strictMode            = settings?.strictMode            ?? false;
    const learningMode          = settings?.learningMode          ?? false;
    const aiVerificationEnabled = settings?.aiVerificationEnabled ?? false;
    const intentAnalysisEnabled = settings?.intentAnalysisEnabled ?? false;

    // p-limit instance: at most GROQ_CONCURRENCY files processed at once.
    // Each file task is async (awaits up to 2 Groq calls), so this bounds
    // the number of in-flight Groq requests to 2 × GROQ_CONCURRENCY = 10
    // (one intent + one verification per file in the worst case).
    const limit = pLimit(GROQ_CONCURRENCY);

    // Scan all files concurrently within the concurrency cap
    const fileResults = await Promise.all(
      files.map((file) =>
        limit(async () => {
          // Run regex pipeline and intent analysis in parallel
          const [scanResult, intentResult] = await Promise.all([
            Promise.resolve(runFullScan(file.content, { strictMode })),
            intentAnalysisEnabled ? analyzeIntent(file.content) : Promise.resolve(null),
          ]);

          // AI Verification (if enabled and regex level is Medium or Critical)
          if (
            aiVerificationEnabled &&
            (scanResult.riskLevel === "Medium" || scanResult.riskLevel === "Critical")
          ) {
            const aiResult = await verifyWithAI(file.content, scanResult.detectedPatterns);
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

          return {
            path:                  file.path,
            regexScore,
            intentRiskScore,
            intentReasoning,
            finalScore,
            finalRiskLevel,
            // legacy aliases — BatchScanResult consumers that read riskScore/riskLevel
            // will see the merged final value, not the raw regex score
            riskScore:             finalScore,
            riskLevel:             finalRiskLevel,
            detectedPatternsCount: scanResult.detectedPatterns.length,
            detectedPatterns:      scanResult.detectedPatterns,
            aiVerification:        scanResult.aiVerification,
          };
        })
      )
    );

    // Aggregate: highest finalScore across all files
    let highestFinalScore: number = 0;
    let highestFinalLevel: RiskLevel = "Safe";

    for (const r of fileResults) {
      if (r.finalScore > highestFinalScore) {
        highestFinalScore = r.finalScore;
        highestFinalLevel = r.finalRiskLevel;
      }
    }

    // Determine overall status based on merged highest risk
    let overallStatus: "Blocked" | "Allowed" =
      highestFinalLevel === "Medium" || highestFinalLevel === "Critical"
        ? "Blocked"
        : "Allowed";

    if (learningMode) {
      overallStatus = "Allowed";
    }

    // Log aggregate entry
    try {
      await logScan({
        toolName: "ci-pipeline",
        scenario: "github-action",
        riskScore: highestFinalScore,
        riskLevel: highestFinalLevel,
        detectedPatterns: fileResults.flatMap(f => f.detectedPatterns),
        originalContent: `Scanned ${fileResults.length} files`,
        sanitizedContent: `Scanned ${fileResults.length} files`,
        status: overallStatus,
      });
    } catch (logErr) {
      console.error("[Aegis /api/scan-batch] logScan failed:", logErr);
    }

    // Return results — include intent fields so CI consumers can log them
    return NextResponse.json<BatchScanResult>({
      overallRiskScore: highestFinalScore,
      overallRiskLevel: highestFinalLevel,
      overallStatus,
      filesScanned: fileResults.length,
      files: fileResults.map(f => ({
        path:                  f.path,
        riskScore:             f.finalScore,
        riskLevel:             f.finalRiskLevel,
        detectedPatternsCount: f.detectedPatternsCount,
      })),
    }, { status: 200 });

  } catch (err) {
    console.error("[Aegis /api/scan-batch] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

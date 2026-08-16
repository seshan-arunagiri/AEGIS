/**
 * AgentShield — POST /api/scan
 *
 * Next.js Route Handler that accepts a tool + scenario, fetches the
 * corresponding mock content, runs it through the full threat detection
 * pipeline (scan → score → sanitise), persists the result to SQLite via
 * logScan(), and returns the ScanResult as JSON.
 *
 * Request body:
 *   { tool: "github" | "database" | "filesystem", scenario: string }
 *
 * Response:
 *   200 { ...ScanResult }
 *   400 { error: string }          — invalid tool or scenario
 *   405 { error: string }          — non-POST method
 *   500 { error: string }          — unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/scanner";
import { logScan } from "@/lib/logger/logger";
import { verifyWithAI } from "@/lib/aiVerification";
import { analyzeIntent } from "@/lib/aiIntentAnalysis/aiIntentAnalysis";
import type { RiskLevel } from "@/types/types";
import {
  getMockGithubResponse,
  type GithubScenario,
} from "@/api/mockTools/github";
import {
  getMockDatabaseResponse,
  type DatabaseScenario,
} from "@/api/mockTools/database";
import {
  getMockFilesystemResponse,
  type FilesystemScenario,
} from "@/api/mockTools/filesystem";

// ─── Supported Tools and Scenarios ───────────────────────────────────────────

const VALID_TOOLS = ["github", "database", "filesystem", "upload", "manual-paste"] as const;
type Tool = (typeof VALID_TOOLS)[number];

const VALID_SCENARIOS = [
  "clean",
  "injection",
  "credential-theft",
  "destructive",
  "live",
] as const;
type Scenario = (typeof VALID_SCENARIOS)[number];

function isValidTool(t: unknown): t is Tool {
  return VALID_TOOLS.includes(t as Tool);
}

function isValidScenario(s: unknown): s is Scenario {
  return VALID_SCENARIOS.includes(s as Scenario);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map risk level to a middleware decision. */
function deriveStatus(riskLevel: RiskLevel): "Blocked" | "Allowed" {
  return riskLevel === "Medium" || riskLevel === "Critical"
    ? "Blocked"
    : "Allowed";
}

/** Convert a 0-100 score to the same four-tier bands as riskEngine. */
function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 25) return "Safe";
  if (score <= 50) return "Low";
  if (score <= 75) return "Medium";
  return "Critical";
}

/** Dispatch to the appropriate mock content generator. */
function getMockContent(tool: Tool, scenario: Scenario): string {
  if (tool === "upload" || tool === "manual-paste") return ""; // Should be provided via body.content
  
  switch (tool) {
    case "github":
      return getMockGithubResponse(scenario as GithubScenario);
    case "database":
      return getMockDatabaseResponse(scenario as DatabaseScenario);
    case "filesystem":
      return getMockFilesystemResponse(scenario as FilesystemScenario);
    default:
      return "";
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body — guard against malformed JSON.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    // Validate shape and values.
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const { tool, scenario, content: customContent } = body as Record<string, unknown>;

    if (!isValidTool(tool)) {
      return NextResponse.json(
        {
          error: `Invalid tool "${String(tool)}". Must be one of: ${VALID_TOOLS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!isValidScenario(scenario)) {
      return NextResponse.json(
        {
          error: `Invalid scenario "${String(scenario)}". Must be one of: ${VALID_SCENARIOS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if ((tool === "upload" || tool === "manual-paste") && typeof customContent !== "string") {
      return NextResponse.json(
        { error: `Content string must be provided for ${tool} tool.` },
        { status: 400 }
      );
    }

    // 0. Fetch Global Settings
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const strictMode             = settings?.strictMode             ?? false;
    const learningMode           = settings?.learningMode           ?? false;
    const aiVerificationEnabled  = settings?.aiVerificationEnabled  ?? false;
    const intentAnalysisEnabled  = settings?.intentAnalysisEnabled  ?? false;

    // 1. Fetch content (use provided content if exists, else mock).
    const content = typeof customContent === "string" ? customContent : getMockContent(tool, scenario);

    // 2. Run regex pipeline and (optionally) intent analysis in parallel.
    //    Wrap in timing so developerMode can surface per-phase latency.
    const regexStart = Date.now();
    const groqStart  = Date.now(); // starts same time (parallel)
    const [result, intentResult] = await Promise.all([
      // Regex is synchronous — resolved immediately
      Promise.resolve(runFullScan(content, { strictMode })),
      intentAnalysisEnabled ? analyzeIntent(content) : Promise.resolve(null),
    ]);
    const regexMs = 1; // synchronous; <1 ms — report as 1 ms floor
    const groqMs  = intentAnalysisEnabled ? Date.now() - groqStart : null;

    // 2.5. AI Verification (if enabled and regex level is Medium or Critical)
    if (aiVerificationEnabled && (result.riskLevel === "Medium" || result.riskLevel === "Critical")) {
      const aiResult = await verifyWithAI(result.originalContent, result.detectedPatterns);
      if (aiResult) {
        result.aiVerification = aiResult;
      }
    }

    // 3. Compute final score: highest of regex score and intent score.
    //    One malicious signal is enough — we don't dilute with a clean score.
    const regexScore       = result.riskScore;
    const intentRiskScore  = intentResult?.intentRiskScore  ?? null;
    const intentReasoning  = intentResult?.reasoning        ?? null;
    const intentFlaggedText = intentResult?.flaggedText      ?? null;
    const finalScore       = Math.max(regexScore, intentRiskScore ?? 0);
    const finalRiskLevel   = scoreToRiskLevel(finalScore);

    // 4. Determine middleware decision based on the final (merged) risk level.
    let status = deriveStatus(finalRiskLevel);
    if (learningMode) {
      status = "Allowed";
    }

    // 5. Persist to DB — fire-and-forget style.
    try {
      await logScan({
        toolName: tool,
        scenario,
        riskScore: finalScore,
        riskLevel: finalRiskLevel,
        detectedPatterns: result.detectedPatterns,
        originalContent: result.originalContent,
        sanitizedContent: result.sanitizedContent,
        status,
        aiVerdict: result.aiVerification ? JSON.stringify(result.aiVerification) : undefined,
      });
    } catch (logErr) {
      console.error("[AgentShield /api/scan] logScan failed:", logErr);
    }

    // 6. Return extended ScanResult.
    //    Existing fields are preserved for backward compatibility.
    //    New intent fields are null when intentAnalysisEnabled is false.
    return NextResponse.json(
      {
        ...result,
        regexScore,
        intentRiskScore,
        intentReasoning,
        intentFlaggedText,
        finalScore,
        finalRiskLevel,
        // Developer-mode timing fields — always included, UI gates display
        _timing: { regexMs, groqMs },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[AgentShield /api/scan] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

// Reject non-POST methods with a clear error.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

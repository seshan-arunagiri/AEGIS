"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScanResult, RiskLevel, ThreatCategory } from "@/types/types";

// ─── Extended type: API now returns extra intent-analysis fields ───────────────
// These fields are optional so the component is backward-compatible when
// intentAnalysisEnabled is false and the old ScanResult shape is returned.
export interface ExtendedScanResult extends ScanResult {
  regexScore?:         number;           // raw regex-only score
  intentRiskScore?:    number | null;
  intentReasoning?:    string | null;
  intentFlaggedText?:  string | null;    // specific span that drove the score
  finalScore?:         number;           // Math.max(regex, intent)
  finalRiskLevel?:     RiskLevel;
  /** Server-measured phase latencies (ms) — only used in Developer Mode */
  _timing?:            { regexMs: number; groqMs: number | null } | null;
}

// ─── Risk colour mapping ──────────────────────────────────────────────────────

const RISK_CONFIG: Record<
  RiskLevel,
  {
    color: string;          // Tailwind text colour
    bg: string;             // Badge background
    border: string;         // Ring / border
    ring: string;           // SVG circle stroke
    fill: string;           // SVG arc fill
    label: string;
  }
> = {
  Safe: {
    color:  "text-emerald-400",
    bg:     "bg-emerald-500/10",
    border: "border-emerald-500/20",
    ring:   "stroke-emerald-900/30",
    fill:   "stroke-emerald-400",
    label:  "Safe",
  },
  Low: {
    color:  "text-yellow-400",
    bg:     "bg-yellow-500/10",
    border: "border-yellow-500/20",
    ring:   "stroke-yellow-900/30",
    fill:   "stroke-yellow-400",
    label:  "Low Risk",
  },
  Medium: {
    color:  "text-orange-400",
    bg:     "bg-orange-500/10",
    border: "border-orange-500/20",
    ring:   "stroke-orange-900/30",
    fill:   "stroke-orange-400",
    label:  "Medium Risk",
  },
  Critical: {
    color:  "text-red-400",
    bg:     "bg-red-500/10",
    border: "border-red-500/20",
    ring:   "stroke-red-900/30",
    fill:   "stroke-red-400",
    label:  "Critical",
  },
};

// ─── Category label formatter ─────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ThreatCategory, string> = {
  instruction_override:   "Instruction Override",
  system_manipulation:    "System Manipulation",
  credential_exfiltration:"Credential Exfiltration",
  destructive_command:    "Destructive Command",
  shell_injection:        "Shell Injection",
  suspicious_encoding:    "Suspicious Encoding",
};

// ─── Radial score ring ────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  riskLevel: RiskLevel;
}

function ScoreRing({ score, riskLevel }: ScoreRingProps) {
  const cfg = RISK_CONFIG[riskLevel];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arc = (score / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center" aria-label={`Risk score ${score} out of 100`}>
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90" aria-hidden="true">
        {/* Background ring */}
        <circle
          cx="56" cy="56" r={radius}
          fill="none"
          strokeWidth="8"
          className={cfg.ring}
        />
        {/* Score arc — animated */}
        <motion.circle
          cx="56" cy="56" r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cfg.fill}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - arc }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      {/* Score label */}
      <div className="absolute flex flex-col items-center">
        <motion.span
          className={cn("text-3xl font-bold tabular-nums", cfg.color)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-zinc-600">/100</span>
      </div>
    </div>
  );
}

// ─── Main ResultPanel ─────────────────────────────────────────────────────────

interface ResultPanelProps {
  result: ExtendedScanResult | null;
  isLoading: boolean;
  /** When true, shows rule IDs, timing breakdown, and raw JSON */
  developerMode?: boolean;
}

export function ResultPanel({ result, isLoading, developerMode = false }: ResultPanelProps) {
  // Prefer the merged final level when intent analysis ran; fall back to regex level.
  const displayLevel   = result?.finalRiskLevel   ?? result?.riskLevel   ?? "Safe";
  const displayScore   = result?.finalScore        ?? result?.riskScore   ?? 0;
  const regexScore     = result?.regexScore        ?? result?.riskScore   ?? 0;
  const intentScore    = result?.intentRiskScore   ?? null;
  const intentReason   = result?.intentReasoning   ?? null;
  const intentFlagged  = result?.intentFlaggedText ?? null;

  // "AI Catch" only fires when the AI verdict moves the needle into a WORSE
  // risk tier than regex alone — not just a higher raw number within the same band.
  const LEVEL_ORD = { Safe: 0, Low: 1, Medium: 2, Critical: 3 } as const;
  const riskTier  = (s: number) =>
    s <= 25 ? LEVEL_ORD.Safe : s <= 50 ? LEVEL_ORD.Low : s <= 75 ? LEVEL_ORD.Medium : LEVEL_ORD.Critical;
  const aiCaughtIt = intentScore !== null && riskTier(intentScore) > riskTier(regexScore);

  const isBlocked = displayLevel === "Medium" || displayLevel === "Critical";

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <span className="text-xs font-medium text-zinc-500">Aegis Analysis</span>
        </div>
        <span className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-600">
          SCAN RESULT
        </span>
      </div>

      {/* Body — scrollable, fills remaining height */}
      <div className="flex-1 overflow-auto p-5 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]">
        {isLoading ? (
          // Loading state
          <div className="flex flex-col items-center gap-6 pt-8" aria-busy="true" aria-label="Scanning content">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="h-28 w-28 animate-pulse rounded-full border-8 border-white/[0.04]" />
              <span className="absolute text-xs text-zinc-700">Scanning...</span>
            </div>
            <div className="w-full space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ) : result ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={result.timestamp}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col gap-5"
            >
              {/* Score + Level row */}
              <div className="flex items-center gap-6">
                <ScoreRing score={displayScore} riskLevel={displayLevel} />
                <div className="flex flex-col gap-2">
                  {/* Risk level badge — driven by finalRiskLevel when available */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                      RISK_CONFIG[displayLevel].bg,
                      RISK_CONFIG[displayLevel].border,
                      RISK_CONFIG[displayLevel].color
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", {
                      "bg-emerald-400": displayLevel === "Safe",
                      "bg-yellow-400":  displayLevel === "Low",
                      "bg-orange-400":  displayLevel === "Medium",
                      "bg-red-400":     displayLevel === "Critical",
                    })} />
                    {RISK_CONFIG[displayLevel].label}
                  </span>

                  {/* Block / Allow status */}
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      isBlocked
                        ? "border-red-500/20 bg-red-500/[0.07]"
                        : "border-emerald-500/20 bg-emerald-500/[0.07]"
                    )}
                  >
                    {isBlocked ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span className={cn("text-xs font-semibold", isBlocked ? "text-red-400" : "text-emerald-400")}>
                      {isBlocked ? "BLOCKED" : "ALLOWED"}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {isBlocked
                        ? "— response suppressed"
                        : "— response forwarded to agent"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Score breakdown (shown only when intent analysis ran) ── */}
              {intentScore !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex flex-col gap-1.5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    Score Breakdown
                  </h3>

                  {/* Pattern match row */}
                  <div className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                    <span className="text-[11px] text-zinc-400">Pattern Match</span>
                    <span className="font-mono text-[11px] text-zinc-300">
                      {regexScore}/100
                      <span className={cn("ml-1.5 text-[10px]", RISK_CONFIG[result!.riskLevel].color)}>
                        ({RISK_CONFIG[result!.riskLevel].label})
                      </span>
                    </span>
                  </div>

                  {/* AI Intent Analysis card — reasoning is the centrepiece */}
                  <div
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border px-3 py-3",
                      aiCaughtIt
                        ? "border-amber-500/30 bg-amber-500/[0.06]"
                        : "border-sky-500/20 bg-sky-500/[0.04]"
                    )}
                  >
                    {/* Header row: label + optional AI Catch badge + score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {/* Brain icon */}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                          strokeLinejoin="round"
                          className={cn(aiCaughtIt ? "text-amber-400" : "text-sky-400")}
                          aria-hidden="true"
                        >
                          <path d="M9.5 2a2.5 2.5 0 0 1 5 0v.5" />
                          <path d="M15 4.5A4.5 4.5 0 0 1 19.5 9v.5" />
                          <path d="M4.5 9A4.5 4.5 0 0 1 9 4.5" />
                          <path d="M2 14.5A6.5 6.5 0 0 0 9.5 21" />
                          <path d="M22 14.5A6.5 6.5 0 0 1 14.5 21" />
                          <path d="M12 21v-8" />
                          <path d="M8 13H6" />
                          <path d="M18 13h-2" />
                        </svg>
                        <span className={cn(
                          "text-[11px] font-semibold",
                          aiCaughtIt ? "text-amber-300" : "text-sky-300"
                        )}>
                          AI Intent Analysis
                        </span>
                        {aiCaughtIt && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-400">
                            AI Catch
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-zinc-300">
                        {intentScore}/100
                        {result?.finalRiskLevel && (
                          <span className={cn("ml-1.5 text-[10px]", RISK_CONFIG[result.finalRiskLevel].color)}>
                            ({RISK_CONFIG[result.finalRiskLevel].label})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Reasoning blockquote — always shown when intent ran */}
                    {intentReason && (
                      <div className={cn(
                        "flex gap-2.5 rounded-md border-l-2 py-2 pl-3 pr-2",
                        aiCaughtIt
                          ? "border-amber-400/50 bg-amber-500/[0.05]"
                          : "border-sky-400/40 bg-sky-500/[0.04]"
                      )}>
                        {/* Open-quote mark */}
                        <span className={cn(
                          "select-none font-serif text-2xl leading-none",
                          aiCaughtIt ? "text-amber-500/50" : "text-sky-500/40"
                        )} aria-hidden="true">&ldquo;</span>
                        <p className={cn(
                          "text-[12px] font-medium italic leading-relaxed",
                          aiCaughtIt ? "text-amber-100/80" : "text-zinc-200/80"
                        )}>
                          {intentReason}
                        </p>
                      </div>
                    )}

                    {/* Flagged span — the specific excerpt that drove the score */}
                    {intentFlagged && (
                      <div className="flex items-start gap-1.5 pt-0.5">
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 pt-px">
                          Flagged text:
                        </span>
                        <code className={cn(
                          "rounded border px-1.5 py-0.5 font-mono text-[11px] leading-snug break-all",
                          aiCaughtIt
                            ? "border-amber-500/25 bg-amber-500/[0.08] text-amber-200/90"
                            : "border-sky-500/20 bg-sky-500/[0.06] text-sky-200/90"
                        )}>
                          &ldquo;{intentFlagged}&rdquo;
                        </code>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Detected patterns */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                    Detected Patterns
                  </h3>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-600">
                    {result.detectedPatterns.length} matched
                  </span>
                </div>

                {result.detectedPatterns.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-3 py-3">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-xs text-emerald-500/80">No threats detected — content is safe</span>
                  </div>
                ) : (
                  <motion.div
                    className="flex flex-col gap-1.5"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.05 } },
                      hidden: {},
                    }}
                  >
                    {result.detectedPatterns.map((p, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, x: -8 },
                          visible: { opacity: 1, x: 0 },
                        }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate text-[11px] font-medium text-zinc-300">
                            {p.pattern}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {CATEGORY_LABELS[p.category]}
                          </span>
                        </div>
                        <span className={cn(
                          "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium",
                          p.weight >= 30
                            ? "border-red-500/20 bg-red-500/10 text-red-400"
                            : p.weight >= 25
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                            : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                        )}>
                          +{p.weight}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* AI Verification (if present) */}
              {result.aiVerification && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
                      AI Verification
                    </h3>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-purple-500">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className={cn(
                    "rounded-lg border px-3 py-2.5",
                    result.aiVerification.verdict === "likely-threat"
                      ? "border-red-500/20 bg-red-500/[0.07]"
                      : result.aiVerification.verdict === "likely-false-positive"
                      ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                      : "border-zinc-500/20 bg-zinc-500/[0.07]"
                  )}>
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        result.aiVerification.verdict === "likely-threat"
                          ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : result.aiVerification.verdict === "likely-false-positive"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400"
                      )}>
                        {result.aiVerification.verdict === "likely-threat"
                          ? "Likely Threat"
                          : result.aiVerification.verdict === "likely-false-positive"
                          ? "Likely False Positive"
                          : "Uncertain"}
                      </span>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {result.aiVerification.reasoning}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Developer Mode panel ────────────────────────────────── */}
              {developerMode && result && (
                <motion.div
                  key="dev-panel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded border border-dashed border-zinc-700/60 bg-zinc-900/40 p-3 space-y-3"
                >
                  {/* Header */}
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Developer Mode
                  </p>

                  {/* Rule IDs per detected pattern */}
                  {result.detectedPatterns.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-600 font-medium">Pattern Rule IDs</p>
                      <div className="flex flex-col gap-0.5">
                        {result.detectedPatterns.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[10px]">
                            <code className="font-mono text-zinc-400 bg-zinc-800/60 px-1 rounded truncate max-w-[60%]">
                              {(p as { id?: string }).id ?? p.pattern}
                            </code>
                            <span className="text-zinc-600 shrink-0">
                              {p.category} · +{p.weight}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timing breakdown */}
                  {result._timing && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-600 font-medium">Phase Timing</p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 w-20 shrink-0">Regex scan</span>
                          <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-emerald-600/70 rounded-full" style={{ width: "4%" }} />
                          </div>
                          <code className="text-[10px] font-mono text-zinc-400 w-12 text-right">
                            {result._timing.regexMs}ms
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 w-20 shrink-0">Groq (intent)</span>
                          <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-sky-600/70 rounded-full"
                              style={{ width: result._timing.groqMs ? "96%" : "0%" }}
                            />
                          </div>
                          <code className="text-[10px] font-mono text-zinc-400 w-12 text-right">
                            {result._timing.groqMs != null ? `${result._timing.groqMs}ms` : "—"}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw JSON — collapsible */}
                  <details className="group">
                    <summary className="text-[10px] text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors">
                      Raw API Response
                      <span className="ml-1 text-zinc-700 group-open:hidden">▸</span>
                      <span className="ml-1 text-zinc-700 hidden group-open:inline">▾</span>
                    </summary>
                    <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-zinc-950/60 p-2 text-[9.5px] font-mono leading-relaxed text-zinc-400 whitespace-pre-wrap break-all border border-zinc-800/50">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </motion.div>
              )}

              {/* Timestamp */}
              <p className="text-[10px] text-zinc-700">
                Scanned at {new Date(result.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                })} UTC
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">No scan results yet</p>
              <p className="mt-1 text-xs text-zinc-700">Run a scan to see the threat analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

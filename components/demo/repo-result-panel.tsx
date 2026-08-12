"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RepoScanResult, FileScanResult, RiskLevel } from "@/types/types";

// Extend FileScanResult locally to include the intent fields the API already returns.
// These are optional so the component stays backward-compatible.
interface FileScanResultWithIntent extends FileScanResult {
  regexScore?:      number | null;
  intentRiskScore?: number | null;
  intentReasoning?: string | null;
  finalScore?:      number | null;
  finalRiskLevel?:  RiskLevel;
}

interface RepoScanResultWithIntent extends Omit<RepoScanResult, "files"> {
  files: FileScanResultWithIntent[];
}

interface RepoResultPanelProps {
  result: RepoScanResultWithIntent | null;
  isLoading: boolean;
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "Safe":
      return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    case "Low":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Medium":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Critical":
      return "text-red-400 bg-red-400/10 border-red-400/20";
  }
}

export function RepoResultPanel({ result, isLoading }: RepoResultPanelProps) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-white/[0.06] bg-gradient-to-br from-zinc-950 to-black p-8">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-500">Scanning repository files...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-white/[0.06] bg-gradient-to-br from-zinc-950 to-black p-8">
        <p className="text-sm text-zinc-600">Run a scan to see results</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col rounded-lg border border-white/[0.06] bg-gradient-to-br from-zinc-950 to-black overflow-hidden"
    >
      {/* Overall Summary */}
      <div className="border-b border-white/[0.06] p-4 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Repository Scan Summary</h3>
          <Badge className={getRiskColor(result.overallRiskLevel)}>
            {result.overallRiskLevel}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-zinc-500">Files Scanned</p>
            <p className="text-white font-mono">{result.filesScanned}</p>
          </div>
          <div>
            <p className="text-zinc-500">Overall Risk Score</p>
            <p className="text-white font-mono">{result.overallRiskScore}/100</p>
          </div>
          <div>
            <p className="text-zinc-500">Status</p>
            <p className={`font-mono ${result.status === "Blocked" ? "text-red-400" : "text-emerald-400"}`}>
              {result.status}
            </p>
          </div>
        </div>
      </div>

      {/* Per-File Table */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="space-y-2">
            {result.files.map((file) => (
              <div
                key={file.filePath}
                className="rounded-md border border-white/[0.06] bg-black/40 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFile(expandedFile === file.filePath ? null : file.filePath)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge className={`${getRiskColor(file.riskLevel)} shrink-0`}>
                      {file.riskLevel}
                    </Badge>
                    <span className="text-xs text-zinc-300 font-mono truncate">
                      {file.filePath}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-500">
                      {file.detectedPatternsCount} pattern{file.detectedPatternsCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-zinc-600 font-mono">
                      {file.riskScore}/100
                    </span>
                    <svg
                      className={`h-4 w-4 text-zinc-500 transition-transform ${
                        expandedFile === file.filePath ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedFile === file.filePath && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/[0.06]"
                    >
                       <div className="p-3 bg-black/60 space-y-3">
                          {/* ── Score breakdown (only when intent analysis ran) ── */}
                          {typeof file.intentRiskScore === "number" && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                                Score Breakdown
                              </p>
                              {/* Pattern match row */}
                              <div className="flex items-center justify-between rounded border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
                                <span className="text-[11px] text-zinc-400">Pattern Match</span>
                                <span className="font-mono text-[11px] text-zinc-300">
                                  {file.regexScore ?? file.riskScore}/100
                                  <span className={`ml-1.5 text-[10px] ${getRiskColor(file.riskLevel).split(" ")[0]}`}>
                                    ({file.riskLevel})
                                  </span>
                                </span>
                              </div>
                              {/* AI Intent row */}
                              {(() => {
                                const intentScore   = file.intentRiskScore!;
                                const regexScoreVal = file.regexScore ?? file.riskScore;
                                const aiCaughtIt    = intentScore > regexScoreVal;
                                const intentLevel   = file.finalRiskLevel ?? file.riskLevel;
                                return (
                                  <div className={`flex flex-col gap-2 rounded border px-2.5 py-2 ${
                                    aiCaughtIt
                                      ? "border-amber-500/30 bg-amber-500/[0.06]"
                                      : "border-sky-500/20 bg-sky-500/[0.04]"
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-semibold ${
                                          aiCaughtIt ? "text-amber-300" : "text-sky-300"
                                        }`}>
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
                                        <span className={`ml-1.5 text-[10px] ${getRiskColor(intentLevel).split(" ")[0]}`}>
                                          ({intentLevel})
                                        </span>
                                      </span>
                                    </div>
                                    {file.intentReasoning && (
                                      <div className={`flex gap-2 rounded border-l-2 py-1.5 pl-2.5 pr-1.5 ${
                                        aiCaughtIt
                                          ? "border-amber-400/50 bg-amber-500/[0.05]"
                                          : "border-sky-400/40 bg-sky-500/[0.04]"
                                      }`}>
                                        <span className={`select-none font-serif text-xl leading-none ${
                                          aiCaughtIt ? "text-amber-500/50" : "text-sky-500/40"
                                        }`} aria-hidden="true">&ldquo;</span>
                                        <p className={`text-[11px] font-medium italic leading-relaxed ${
                                          aiCaughtIt ? "text-amber-100/80" : "text-zinc-200/80"
                                        }`}>
                                          {file.intentReasoning}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* ── Detected patterns ── */}
                          {file.detectedPatterns.length > 0 ? (
                           <div className="space-y-2">
                             <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                               Detected Patterns
                             </p>
                             {file.detectedPatterns.map((pattern, idx) => (
                               <div
                                 key={idx}
                                 className="rounded border border-white/[0.06] bg-black/40 p-2"
                               >
                                 <div className="flex items-start justify-between gap-2">
                                   <div className="flex-1">
                                     <p className="text-xs text-white font-medium">
                                       {pattern.pattern}
                                     </p>
                                     <p className="text-[10px] text-zinc-500 mt-0.5">
                                       Category: {pattern.category}
                                     </p>
                                   </div>
                                   <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                                     +{pattern.weight}
                                   </span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <p className="text-xs text-zinc-600">No threats detected in this file</p>
                         )}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

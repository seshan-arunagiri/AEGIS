"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ToolSelector } from "@/components/demo/tool-selector";
import { ScenarioSelector } from "@/components/demo/scenario-selector";
import { ResponsePanel } from "@/components/demo/response-panel";
import { ResultPanel } from "@/components/demo/result-panel";
import type { DemoTool, DemoScenario } from "@/components/demo/demo-types";
import type { RepoScanResult } from "@/types/types";
import type { ExtendedScanResult } from "@/components/demo/result-panel";
import { RepoResultPanel } from "@/components/demo/repo-result-panel";

// ─── Mock content preview — fetched locally before the scan ──────────────────
// We also call /api/scan, but we want to show the raw content in the left
// panel immediately. So we fetch it from a separate lightweight endpoint, or
// we replicate the content retrieval on the client side by calling /api/preview.
// Simpler approach: the API route returns originalContent inside ScanResult —
// we just display that after the scan completes. Before scan, show placeholder.

interface ScanState {
  status: "idle" | "loading" | "done" | "error";
  result: ExtendedScanResult | null;
  repoResult: RepoScanResult | null;
  errorMessage: string | null;
}

const INITIAL_STATE: ScanState = {
  status: "idle",
  result: null,
  repoResult: null,
  errorMessage: null,
};

export default function DemoPage() {
  const [tool, setTool] = useState<DemoTool>("github");
  const [scenario, setScenario] = useState<DemoScenario>("clean");
  const [scanState, setScanState] = useState<ScanState>(INITIAL_STATE);

  type InputMode = "mock" | "upload" | "github" | "paste";
  const [inputMode, setInputMode] = useState<InputMode>("mock");
  const [fileContent, setFileContent] = useState<string>("");
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [pasteContent, setPasteContent] = useState<string>("");
  const [scanDuration, setScanDuration] = useState<number | null>(null);

  // Reset results when tool or scenario changes
  const handleToolChange = useCallback((t: DemoTool) => {
    setTool(t);
    setScanState(INITIAL_STATE);
  }, []);

  const handleScenarioChange = useCallback((s: DemoScenario) => {
    setScenario(s);
    setScanState(INITIAL_STATE);
  }, []);

  const handleRunScan = useCallback(async () => {
    setScanState({ status: "loading", result: null, repoResult: null, errorMessage: null });
    setScanDuration(null);
    const t0 = Date.now();

    try {
      let response: Response;

      if (inputMode === "mock") {
        response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool, scenario }),
        });
      } else if (inputMode === "upload") {
        if (!fileContent) throw new Error("Please select a file to upload first.");
        response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "upload", scenario: "live", content: fileContent }),
        });
      } else if (inputMode === "github") {
        if (!repoUrl) throw new Error("Please enter a valid GitHub repository URL.");
        response = await fetch("/api/scan-repo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl }),
        });
      } else {
        if (!pasteContent.trim()) throw new Error("Please paste some text to scan.");
        response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "manual-paste", scenario: "live", content: pasteContent }),
        });
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const elapsed = Date.now() - t0;
      setScanDuration(elapsed);

      // Check if this is a repo scan result (has 'files' array)
      if (inputMode === "github" && "files" in data) {
        setScanState({ status: "done", result: null, repoResult: data as RepoScanResult, errorMessage: null });
      } else {
        setScanState({ status: "done", result: data as ExtendedScanResult, repoResult: null, errorMessage: null });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setScanState({ status: "error", result: null, repoResult: null, errorMessage: message });
    }
  }, [tool, scenario, inputMode, fileContent, repoUrl, pasteContent]);

  const isLoading = scanState.status === "loading";
  const rawContent = scanState.result?.originalContent ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-14">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="border-b border-white/[0.06] px-6 py-12 relative overflow-hidden"
        >
          {/* Header background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-background to-background pointer-events-none" aria-hidden="true" />
          
          <div className="mx-auto max-w-6xl relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-zinc-500 tracking-widest">
                INTERACTIVE DEMO
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Live Threat Scanner
            </h1>
            <p className="mt-2 text-base text-zinc-400">
              Select a tool and scenario to see Aegis intercept real attack patterns in MCP tool responses.
            </p>
          </div>
        </motion.div>

        {/* ── Controls ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border-b border-white/[0.06] px-6 py-5"
        >
          <div className="mx-auto max-w-6xl space-y-4">
            {/* Input Mode Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setInputMode("mock")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inputMode === "mock" ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                Mock Scenario
              </button>
              <button
                onClick={() => setInputMode("upload")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inputMode === "upload" ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                File Upload
              </button>
              <button
                onClick={() => setInputMode("github")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inputMode === "github" ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                GitHub Repo
              </button>
              <button
                onClick={() => setInputMode("paste")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  inputMode === "paste" ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                Paste Text
              </button>
            </div>

            {inputMode === "mock" && (
              <div className="flex gap-8">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                    MCP Tool
                  </label>
                  <ToolSelector selected={tool} onChange={handleToolChange} />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                    Attack Scenario
                  </label>
                  <ScenarioSelector selected={scenario} onChange={handleScenarioChange} />
                </div>
              </div>
            )}

            {inputMode === "upload" && (
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Upload File (.md, .txt, .json)
                </label>
                <input
                  type="file"
                  accept=".md,.txt,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFileContent(await file.text());
                      setScanState(INITIAL_STATE);
                    }
                  }}
                  className="block w-full max-w-sm text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                />
              </div>
            )}

            {inputMode === "github" && (
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Public GitHub Repo URL
                </label>
                <div className="flex flex-col gap-1 max-w-sm">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setScanState(INITIAL_STATE);
                    }}
                    placeholder="github.com/owner/repo"
                    className="w-full bg-background border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20"
                  />
                  <p className="text-[10px] text-zinc-500">Scans up to 30 text-based files for hidden instructions or malicious content. Public repos only — subject to GitHub rate limits.</p>
                </div>
              </div>
            )}

            {inputMode === "paste" && (
              <div className="w-full">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Raw Text Input
                </label>
                <textarea
                  value={pasteContent}
                  onChange={(e) => {
                    setPasteContent(e.target.value);
                    setScanState(INITIAL_STATE);
                  }}
                  maxLength={20000}
                  placeholder="Paste any text, log, or tool response to scan for prompt injection or malicious instructions..."
                  className="w-full min-h-[160px] bg-background border border-white/[0.06] rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 font-mono resize-y"
                />
                <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                  <span>{pasteContent.length} / 20,000 characters</span>
                  {pasteContent.length >= 20000 && <span className="text-orange-500">Character limit reached</span>}
                </div>
              </div>
            )}

            {/* Run scan button + error */}
            <div className="flex items-center gap-4 pt-1">
              <button
                id="run-scan-btn"
                type="button"
                onClick={handleRunScan}
                disabled={isLoading || (inputMode === "paste" && !pasteContent.trim())}
                className="group flex items-center gap-2.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-primary disabled:hover:shadow-none"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scanning...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Run Scan
                  </>
                )}
              </button>

              {scanState.status === "done" && (scanState.result || scanState.repoResult) && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-zinc-600"
                >
                  {scanState.repoResult ? (
                    <>Scan completed &mdash; {scanState.repoResult.filesScanned} file{scanState.repoResult.filesScanned !== 1 ? "s" : ""} scanned
                      {scanDuration !== null && <> in {scanDuration < 1000 ? `${scanDuration}ms` : `${(scanDuration / 1000).toFixed(1)}s`}</>}
                    </>
                  ) : (
                    <>Scan completed{scanDuration !== null && <> in {scanDuration < 1000 ? `${scanDuration}ms` : `${(scanDuration / 1000).toFixed(1)}s`}</>} &mdash; {scanState.result?.detectedPatterns.length} pattern{scanState.result?.detectedPatterns.length !== 1 ? "s" : ""} detected</>
                  )}
                </motion.p>
              )}

              {scanState.status === "error" && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-red-400"
                  role="alert"
                >
                  {scanState.errorMessage}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Panels ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mx-auto max-w-6xl px-6 py-6"
        >
          {inputMode === "github" && scanState.repoResult ? (
            // Full-width repo result for GitHub scans
            <section aria-labelledby="repo-result-heading" className="flex flex-col">
              <h2 id="repo-result-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                Repository Scan Results
              </h2>
              <div className="min-h-[520px] max-h-[600px] overflow-hidden">
                <RepoResultPanel
                  result={scanState.repoResult}
                  isLoading={isLoading}
                />
              </div>
            </section>
          ) : (
            // Two-column layout for other scans
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left — Raw tool response */}
              <section aria-labelledby="response-panel-heading" className="flex flex-col">
                <h2 id="response-panel-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Incoming Tool Response
                </h2>
                <div className="min-h-[420px] max-h-[560px] lg:h-[520px] overflow-hidden">
                  <ResponsePanel
                    content={rawContent}
                    isLoading={isLoading}
                    tool={tool}
                  />
                </div>
              </section>

              {/* Right — Scan result */}
              <section aria-labelledby="result-panel-heading" className="flex flex-col">
                <h2 id="result-panel-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Aegis Analysis
                </h2>
                <div className="min-h-[420px] max-h-[560px] lg:h-[520px] overflow-hidden">
                  <ResultPanel
                    result={scanState.result}
                    isLoading={isLoading}
                  />
                </div>
              </section>
            </div>
          )}
        </motion.div>

        {/* ── How it works strip ───────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              How it works
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
              {[
                {
                  step: "01",
                  title: "Tool responds",
                  description: "Your AI agent calls an MCP tool and receives a response.",
                },
                {
                  step: "02",
                  title: "Aegis intercepts",
                  description: "The response is passed through the scanner before reaching the agent.",
                },
                {
                  step: "03",
                  title: "Pattern matching",
                  description: "34 threat patterns across 6 categories are checked with regex.",
                },
                {
                  step: "04",
                  title: "Risk scoring",
                  description: "A weighted score is computed. Medium/Critical responses are blocked.",
                },
              ].map((item, i) => (
                <div key={item.step} className="flex flex-1 items-start gap-3">
                  {i > 0 && (
                    <div className="hidden h-px w-6 self-center bg-white/[0.06] sm:block shrink-0" aria-hidden="true" />
                  )}
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-700">{item.step}</span>
                      <span className="text-xs font-medium text-zinc-400">{item.title}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

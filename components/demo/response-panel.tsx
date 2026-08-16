"use client";

// ResponsePanel — shows the raw "incoming tool response" in a monospace code block.
// This is what the AI agent would receive from the MCP tool before AgentShield intercepts it.

interface ResponsePanelProps {
  content: string | null;
  isLoading: boolean;
  tool: string;
}

export function ResponsePanel({ content, isLoading, tool }: ResponsePanelProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted dark:border-white/[0.06] dark:bg-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" aria-hidden="true" />
          <span className="ml-2 font-mono text-[11px] text-zinc-600">
            mcp://{tool}/response
          </span>
        </div>
        <span className="rounded border border-border bg-card dark:border-white/[0.06] dark:bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-zinc-600 font-bold tracking-[0.15em]">
          RAW OUTPUT
        </span>
      </div>

      {/* Body — scrollable, fills remaining height */}
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          // Loading skeleton
          <div className="flex h-full flex-col gap-2 p-4" aria-busy="true" aria-label="Loading tool response">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-white/[0.04]"
                style={{ width: `${55 + ((i * 17) % 40)}%` }}
              />
            ))}
          </div>
        ) : content ? (
          <pre className="h-full overflow-auto p-4 font-mono text-[12px] leading-relaxed text-zinc-400 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]">
            {content}
          </pre>
        ) : (
          // Empty state
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted dark:border-white/[0.06] dark:bg-white/[0.02]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600">No tool response yet</p>
              <p className="mt-1 text-xs text-zinc-700">Select a tool and scenario, then run a scan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

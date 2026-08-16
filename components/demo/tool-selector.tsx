"use client";

import { cn } from "@/lib/utils";
import type { DemoTool } from "./demo-types";
import { TOOLS } from "./demo-types";

// ─── Icon components ──────────────────────────────────────────────────────────

function GitIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 012 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  git: <GitIcon />,
  db: <DatabaseIcon />,
  fs: <FolderIcon />,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ToolSelectorProps {
  selected: DemoTool;
  onChange: (tool: DemoTool) => void;
}

export function ToolSelector({ selected, onChange }: ToolSelectorProps) {
  return (
    <div role="group" aria-label="Select MCP tool" className="flex items-center gap-1 rounded-xl border border-border bg-muted dark:border-white/[0.07] dark:bg-white/[0.03] p-1">
      {TOOLS.map((tool) => {
        const isSelected = tool.id === selected;
        return (
          <button
            key={tool.id}
            id={`tool-${tool.id}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(tool.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
              isSelected
                ? "bg-background text-foreground shadow-sm border border-border dark:bg-white dark:text-black dark:border-transparent"
                : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
            )}
          >
            <span className={cn(isSelected ? "text-foreground dark:text-black" : "text-muted-foreground dark:text-zinc-500")}>
              {ICONS[tool.icon]}
            </span>
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { DemoScenario } from "./demo-types";
import { SCENARIOS } from "./demo-types";

interface ScenarioSelectorProps {
  selected: DemoScenario;
  onChange: (scenario: DemoScenario) => void;
}

// Visual accent colours for each scenario
const SCENARIO_STYLES: Record<DemoScenario, { active: string; dot: string }> = {
  clean: {
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  injection: {
    active: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    dot: "bg-yellow-400",
  },
  "credential-theft": {
    active: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    dot: "bg-orange-400",
  },
  destructive: {
    active: "border-red-500/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
};

export function ScenarioSelector({ selected, onChange }: ScenarioSelectorProps) {
  return (
    <div role="group" aria-label="Select attack scenario" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SCENARIOS.map((scenario) => {
        const isSelected = scenario.id === selected;
        const styles = SCENARIO_STYLES[scenario.id];
        return (
          <button
            key={scenario.id}
            id={`scenario-${scenario.id}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(scenario.id)}
            title={scenario.description}
            className={cn(
              "group flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-150",
              isSelected
                ? cn(styles.active, "border-opacity-100")
                : "border-border bg-muted text-muted-foreground hover:border-border/80 hover:bg-accent hover:text-foreground dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-500 dark:hover:border-white/10 dark:hover:bg-white/[0.04] dark:hover:text-zinc-300"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  isSelected ? styles.dot : "bg-zinc-700"
                )}
              />
              <span className="text-xs font-semibold tracking-wide">
                {scenario.label}
              </span>
            </div>
            <p className={cn(
              "text-[11px] leading-snug transition-colors",
              isSelected ? "opacity-80" : "text-zinc-600 group-hover:text-zinc-500"
            )}>
              {scenario.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

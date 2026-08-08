"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Activity, ShieldAlert, Code, Moon, Settings as SettingsIcon, Sparkles, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import type { AppSettings } from "@prisma/client";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleToggle = async (field: keyof Omit<AppSettings, "id">, newValue: boolean) => {
    if (!settings) return;

    // Optimistic UI update
    const previousSettings = { ...settings };
    setSettings({ ...settings, [field]: newValue });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!res.ok) throw new Error("Failed to update setting");
      
      toast.success(`${field} has been ${newValue ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update ${field}. Reverting changes.`);
      // Revert optimistic update
      setSettings(previousSettings);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global Aegis behavior and UI preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Strict Mode
            </CardTitle>
            <CardDescription>
              Lower risk threshold — flags Medium risk as Blocked instead of Allowed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable Strict Mode</span>
              <p className="text-xs text-muted-foreground">Applies immediately to all incoming traffic.</p>
            </div>
            <Switch 
              checked={settings?.strictMode || false} 
              onCheckedChange={(checked) => handleToggle("strictMode", checked)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Learning Mode
            </CardTitle>
            <CardDescription>
              Log all scans without blocking, for pattern tuning and reducing false positives.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable Learning Mode</span>
              <p className="text-xs text-muted-foreground">Overrides Strict Mode to allow all payloads.</p>
            </div>
            <Switch 
              checked={settings?.learningMode || false} 
              onCheckedChange={(checked) => handleToggle("learningMode", checked)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              Developer Mode
            </CardTitle>
            <CardDescription>
              Show raw pattern match details in demo and logs UI for debugging regex rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable Developer Mode</span>
              <p className="text-xs text-muted-foreground">Exposes internal scanner metrics.</p>
            </div>
            <Switch 
              checked={settings?.developerMode || false} 
              onCheckedChange={(checked) => handleToggle("developerMode", checked)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI-Assisted Verification (Groq)
            </CardTitle>
            <CardDescription>
              Uses Groq's Llama 3.3 70B to double-check Medium and Critical risk results and reduce false positives. Requires GROQ_API_KEY on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable AI Verification</span>
              <p className="text-xs text-muted-foreground">Runs for Medium and Critical risk detections.</p>
            </div>
            <Switch 
              checked={settings?.aiVerificationEnabled || false} 
              onCheckedChange={(checked) => handleToggle("aiVerificationEnabled", checked)} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-sky-400" />
              Independent AI Intent Analysis
            </CardTitle>
            <CardDescription>
              Runs a separate Groq LLaMA call in parallel with the regex scan to judge the
              semantic intent of content — catches manipulation attempts that don't match any
              keyword pattern. Final risk score is the higher of the two. Requires GROQ_API_KEY.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable Intent Analysis</span>
              <p className="text-xs text-muted-foreground">Runs in parallel — no latency impact on the regex scan.</p>
            </div>
            <Switch
              checked={settings?.intentAnalysisEnabled || false}
              onCheckedChange={(checked) => handleToggle("intentAnalysisEnabled", checked)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-slate-400" />
              Dark Mode
            </CardTitle>
            <CardDescription>
              Toggle the dark appearance of the Aegis dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Enable Dark Mode</span>
              <p className="text-xs text-muted-foreground">Persistent across browser sessions.</p>
            </div>
            <Switch 
              checked={settings?.darkMode || true} 
              onCheckedChange={(checked) => handleToggle("darkMode", checked)} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Activity, ShieldAlert, CheckCircle, Database, ChevronLeft, ChevronRight } from "lucide-react";

import type { ScanLog } from "@prisma/client";
import type { ThreatPattern } from "@/types/types";

// Extends ScanLog because we parse the detectedPatterns JSON string back to an array
interface ParsedScanLog extends Omit<ScanLog, "detectedPatterns"> {
  detectedPatterns: ThreatPattern[];
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ParsedScanLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [toolFilter, setToolFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  const [selectedLog, setSelectedLog] = useState<ParsedScanLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);

  // Fetch developerMode on mount — same pattern as demo page
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.developerMode) setDeveloperMode(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (toolFilter !== "All") query.append("tool", toolFilter);
        if (statusFilter !== "All") query.append("status", statusFilter);
        if (riskFilter !== "All") query.append("riskLevel", riskFilter);

        const res = await fetch(`/api/logs?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
          setTotal(data.total);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [page, toolFilter, statusFilter, riskFilter]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'Critical': return 'border-red-500/50 text-red-500';
      case 'Medium': return 'border-orange-500/50 text-orange-500';
      case 'Low': return 'border-yellow-500/50 text-yellow-500';
      default: return 'border-emerald-500/50 text-emerald-500';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan Logs</h1>
        <p className="text-muted-foreground mt-1">Detailed view of all AI agent tool responses scanned by Aegis.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <CardTitle>Log Explorer</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={toolFilter} onValueChange={(val) => handleFilterChange(setToolFilter, val || "All")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Tools</SelectItem>
                <SelectItem value="github">github</SelectItem>
                <SelectItem value="database">database</SelectItem>
                <SelectItem value="filesystem">filesystem</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val) => handleFilterChange(setStatusFilter, val || "All")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Allowed">Allowed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={(val) => handleFilterChange(setRiskFilter, val || "All")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Risks</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Safe">Safe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  {developerMode && <TableHead className="text-xs text-zinc-600">Rule IDs</TableHead>}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <Activity className="w-6 h-6 text-muted-foreground animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      No logs found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {logs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            {log.toolName}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">
                          {log.scenario}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRiskColor(log.riskLevel)}>
                            {log.riskScore} • {log.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === "Blocked" ? "destructive" : "secondary"}>
                            {log.status === "Blocked" && <ShieldAlert className="w-3 h-3 mr-1" />}
                            {log.status === "Allowed" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {log.status}
                          </Badge>
                        </TableCell>
                        {/* Developer Mode: inline rule IDs column */}
                        {developerMode && (
                          <TableCell className="max-w-[180px]">
                            <div className="flex flex-col gap-0.5">
                              {log.detectedPatterns.slice(0, 3).map((p, i) => (
                                <code key={i} className="text-[9px] font-mono text-zinc-600 truncate block">
                                  {(p as { id?: string }).id ?? p.pattern}
                                </code>
                              ))}
                              {log.detectedPatterns.length > 3 && (
                                <span className="text-[9px] text-zinc-700">+{log.detectedPatterns.length - 3} more</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Dialog open={dialogOpen && selectedLog?.id === log.id} onOpenChange={(open) => {
                            if (open) setSelectedLog(log);
                            setDialogOpen(open);
                          }}>
                            <DialogTrigger className="text-sm text-primary hover:underline font-medium">
                              View Details
                            </DialogTrigger>
                            {selectedLog && selectedLog.id === log.id && (
                              <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-3 text-xl">
                                    Scan Details: {selectedLog.toolName}
                                    <Badge variant={selectedLog.status === "Blocked" ? "destructive" : "secondary"}>
                                      {selectedLog.status}
                                    </Badge>
                                  </DialogTitle>
                                </DialogHeader>
                                
                                <div className="space-y-6 mt-4">
                                  {/* Threat Patterns */}
                                  <div>
                                    <h3 className="font-medium mb-3 flex items-center gap-2">
                                      <ShieldAlert className="w-4 h-4 text-orange-500" />
                                      Detected Threats ({selectedLog.detectedPatterns.length})
                                    </h3>
                                    {selectedLog.detectedPatterns.length > 0 ? (
                                      <div className="grid gap-2 border border-border rounded-md p-3 bg-secondary/20">
                                        {selectedLog.detectedPatterns.map((p, i) => (
                                          <div key={i} className="flex justify-between items-start text-sm">
                                            <div className="font-mono text-xs break-all bg-muted px-1.5 py-0.5 rounded text-orange-400">
                                              {p.pattern}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                              <span className="text-muted-foreground capitalize text-xs">{p.category.replace(/_/g, " ")}</span>
                                              <Badge variant="outline">+{p.weight}</Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground italic">No threats detected.</div>
                                    )}
                                  </div>

                                  {/* Content Diff */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">Original Tool Output</h3>
                                      <pre className="text-[11px] font-mono bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap max-h-96 border border-border/50 text-foreground">
                                        {selectedLog.originalContent}
                                      </pre>
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">Sanitized Agent Input</h3>
                                      <pre className="text-[11px] font-mono bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap max-h-96 border border-border/50 text-foreground">
                                        {/* Highlight the redaction token specifically if it exists */}
                                        {selectedLog.sanitizedContent.split("[REMOVED MALICIOUS INSTRUCTION]").map((part, i, arr) => (
                                          <span key={i}>
                                            {part}
                                            {i !== arr.length - 1 && (
                                              <span className="bg-red-500/20 text-red-400 px-1 font-bold">[REMOVED MALICIOUS INSTRUCTION]</span>
                                            )}
                                          </span>
                                        ))}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* Developer Mode: raw JSON */}
                                  {developerMode && (
                                    <div>
                                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                        <span className="text-muted-foreground">Raw Log Entry (Developer Mode)</span>
                                      </h3>
                                      <details className="group">
                                        <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors mb-1">
                                          Show raw JSON
                                          <span className="ml-1 group-open:hidden">▸</span>
                                          <span className="ml-1 hidden group-open:inline">▾</span>
                                        </summary>
                                        <pre className="text-[10px] font-mono bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-64 border border-border/50 text-foreground">
                                          {JSON.stringify(selectedLog, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  )}

                                </div>
                              </DialogContent>
                            )}
                          </Dialog>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{logs.length}</span> of <span className="font-medium">{total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </button>
              <div className="text-sm font-medium px-2">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

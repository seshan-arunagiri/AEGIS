"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, Activity, Hash, AlertTriangle, CheckCircle, Database } from "lucide-react";
import Link from "next/link";

// Types
import type { LogStats } from "@/lib/logger/logger";
import type { ScanLog } from "@prisma/client";

interface TopThreat {
  category: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ScanLog[]>([]);
  const [topThreats, setTopThreats] = useState<TopThreat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsRes, logsRes, threatsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/logs?pageSize=6"),
          fetch("/api/top-threats?limit=100")
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setRecentLogs(logsData.logs || []);
        }
        if (threatsRes.ok) {
          const threatsData = await threatsRes.json();
          setTopThreats(threatsData.threats || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasNoData = stats?.totalRequests === 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-background to-background pointer-events-none -z-10" aria-hidden="true" />
      
      <div className="relative z-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">Dashboard</h1>
        <p className="text-base text-zinc-400 mt-2">Overview of Aegis security metrics and recent activity.</p>
      </div>

      {hasNoData ? (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">No scans recorded yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mb-6">
              Head over to the Demo page to run some simulated tool calls and generate threat data.
            </p>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4">
              Go to Demo
            </Link>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="hover:bg-white/[0.02] hover:border-emerald-500/30 transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
                  <p className="text-xs text-muted-foreground">Scanned by Aegis</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="hover:bg-white/[0.02] hover:border-emerald-500/30 transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats?.blocked || 0}</div>
                  <p className="text-xs text-muted-foreground">Malicious payloads intercepted</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="hover:bg-white/[0.02] hover:border-emerald-500/30 transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Allowed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">{stats?.allowed || 0}</div>
                  <p className="text-xs text-muted-foreground">Safe tool responses</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="hover:bg-white/[0.02] hover:border-emerald-500/30 transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{stats?.averageRisk || 0}</div>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all recent traffic</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Tool</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map((log) => (
                        <TableRow 
                          key={log.id}
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            {log.toolName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.riskLevel === 'Critical' ? 'border-red-500/50 text-red-500' :
                              log.riskLevel === 'Medium' ? 'border-orange-500/50 text-orange-500' :
                              log.riskLevel === 'Low' ? 'border-yellow-500/50 text-yellow-500' :
                              'border-emerald-500/50 text-emerald-500'
                            }>
                              {log.riskScore} • {log.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={log.status === "Blocked" ? "destructive" : "secondary"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-center">
                    <Link href="/logs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      View all logs &rarr;
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Threats */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Top Threats</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {topThreats.length === 0 ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 h-full justify-center pb-8">
                      <Shield className="w-4 h-4" />
                      No threats detected recently
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topThreats.map((threat) => (
                        <div key={threat.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                            <span className="text-sm truncate capitalize" title={threat.category}>
                              {threat.category.replace(/_/g, " ")}
                            </span>
                          </div>
                          <Badge variant="outline" className="shrink-0">{threat.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Database,
  FileCode2,
  GitCompare,
  PlayCircle,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ComparisonRun, getLatestComparisonRun } from "@/lib/api";
import {
  ActionLink,
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspacePageShell,
} from "@/components/workspace/project-workspace";

export default function ProjectDashboardPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [comparisonRun, setComparisonRun] = useState<ComparisonRun | null>(null);

  const refreshDashboard = React.useCallback(async () => {
    await workspace.reload();
    try {
      const run = await getLatestComparisonRun(projectId);
      setComparisonRun(run);
    } catch {
      setComparisonRun(null);
    }
  }, [projectId, workspace]);

  useEffect(() => {
    void refreshDashboard();
  }, [projectId]);

  const summary = comparisonRun?.result?.summary || {};
  const needsReview = Boolean(summary.needs_review);

  const quickActions = [
    {
      id: "sql",
      title: "Upload SQL Dump",
      description: "Initialize or replace the active source for this project.",
      icon: UploadCloud,
      tone: "teal" as const,
    },
    {
      id: "explorer",
      title: "Truth Explorer",
      description: "Browse staged tables and inspect representative rows.",
      icon: Search,
      tone: "blue" as const,
    },
    {
      id: "mapping",
      title: "Schema Mapping",
      description: "Prepare source-to-target column bindings before export.",
      icon: FileCode2,
      tone: "violet" as const,
    },
    {
      id: "simulation",
      title: "Simulation Sandbox",
      description: "Dry-run migration scripts to verify target compatibility.",
      icon: PlayCircle,
      tone: "amber" as const,
    },
    {
      id: "comparison",
      title: "Compare SQL Dumps",
      description: "Statically compare two SQL dumps to isolate dialect differences.",
      icon: GitCompare,
      tone: "teal" as const,
    },
    {
      id: "comparison/mismatches",
      title: "Review Mismatches",
      description: "Audit missing tables, column data-type conflicts, and PK mismatches.",
      icon: AlertCircle,
      tone: "amber" as const,
    },
  ];

  const statusSeries = workspace.recentJobs.map((job, index) => ({
    label: `Job ${index + 1}`,
    completed: job.status === "completed" ? 1 : 0,
    processing: job.status === "restoring" || job.status === "analyzing" || job.status === "uploaded" ? 1 : 0,
  }));

  // Format bytes helper for showing file sizes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspace.project.name}
          description={workspace.project.description || "Unified database migration, schema integrity audit, and translation workspace."}
          badge={<StatusBadge status={workspace.sourceStatus.status || "idle"} />}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={refreshDashboard}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {workspace.sourceStatus.active_job_id && (
                <button
                  className={workspaceActions.primary}
                  onClick={() => router.push(`/dashboard/project/${projectId}/simulation`)}
                >
                  <PlayCircle className="h-4 w-4" />
                  Simulation Sandbox
                </button>
              )}
            </>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            title="Migration Status" 
            value={(workspace.sourceStatus.status || "idle").replace(/_/g, " ")} 
            hint={workspace.sourceStatus.filename || "No source dump uploaded"} 
            tone="teal" 
          />
          <StatCard 
            title="Staged Database" 
            value={`${workspace.sourceStatus.metrics.tables} Tables`} 
            hint={`${workspace.sourceStatus.metrics.rows.toLocaleString()} staged rows`} 
            tone="blue" 
          />
          <StatCard 
            title="Reconciliation" 
            value={comparisonRun ? (needsReview ? "Mismatches Found" : "Schemas Match") : "No Comparison"} 
            hint={comparisonRun ? "Audit scan complete" : "Awaiting scan execution"} 
            tone={needsReview ? "amber" : "teal"} 
          />
          <StatCard 
            title="Total Mismatches" 
            value={comparisonRun?.result?.differences?.counts?.total_mismatches || 0} 
            hint="Table, column, type, and row differences" 
            tone="amber" 
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(`/dashboard/project/${projectId}/${action.id}`)}
              className="rounded-3xl border border-brand-border bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-brand-borderHover shadow-premium"
            >
              <div className="rounded-2xl bg-stone-100 p-3 w-fit">
                <action.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="mt-5 text-lg font-semibold text-text-primary">{action.title}</div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{action.description}</p>
              <div className="mt-5">
                <ActionLink>Open workspace</ActionLink>
              </div>
            </button>
          ))}
        </div>

        {/* Activity & Comparison Grid */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SectionCard title="Activity Timeline" description="Recent workspace events and source transitions">
              {workspace.timeline.length > 0 ? (
                <div className="space-y-4">
                  {workspace.timeline.map((entry) => (
                    <div key={`${entry.title}-${entry.time}`} className="flex gap-4 rounded-2xl border border-brand-border bg-white px-4 py-4 shadow-sm">
                      <div className="mt-1 h-3 w-3 rounded-full bg-brand-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-sm font-medium text-text-primary">{entry.title}</div>
                          <StatusBadge status={entry.status} />
                        </div>
                        <div className="mt-1 text-sm text-text-secondary">{entry.subtitle}</div>
                      </div>
                      <div className="text-xs text-text-muted">{entry.time}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No data available yet" description="Upload a SQL source to start building a project activity timeline." />
              )}
            </SectionCard>

            {comparisonRun ? (
              <SectionCard title="Latest Comparison Summary" description="Reconciliation overview between the uploaded schema comparison runs">
                <DataTable
                  columns={[
                    { key: "metric", label: "Metric" },
                    { key: "value", label: "Value" },
                  ]}
                  rows={[
                    { metric: "Source A (Baseline)", value: comparisonRun.source_a_original_filename },
                    { metric: "Source B (Target)", value: comparisonRun.source_b_original_filename },
                    { metric: "Matched tables", value: summary.matched_tables || 0 },
                    { metric: "Column name mismatches", value: summary.column_mismatches || 0 },
                    { metric: "Data-type conflicts", value: summary.type_mismatches || 0 },
                    { metric: "Primary-key conflicts", value: summary.primary_key_mismatches || 0 },
                    { metric: "Row-count conflicts", value: summary.row_count_mismatches || 0 },
                    { metric: "Missing rows count", value: summary.missing_rows || 0 },
                    { metric: "Value (cell) mismatches", value: summary.cell_mismatches || 0 },
                  ]}
                />
              </SectionCard>
            ) : null}
          </div>

          <div className="space-y-6">
            <SectionCard title="Current Source Profile" description="Staged legacy database attachment">
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-border bg-stone-50 p-4">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-brand-primary" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">{workspace.sourceStatus.filename || "No source attached"}</div>
                      <div className="text-xs text-text-muted capitalize">{workspace.sourceStatus.dialect || "Dialect pending"}</div>
                    </div>
                  </div>
                </div>
                {workspace.sourceStatus.file_size ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 text-xs font-semibold text-stone-600 flex justify-between">
                    <span>File size</span>
                    <span>{formatBytes(workspace.sourceStatus.file_size)}</span>
                  </div>
                ) : null}
                <div className="flex flex-col gap-2">
                  <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${projectId}/diagnostics`)}>
                    <BarChart3 className="h-4 w-4" />
                    View extraction diagnostics
                  </button>
                  <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                    <ArrowRight className="h-4 w-4" />
                    Manage source uploads
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Job Execution History" description="Extraction runs and staging jobs recorded inside this project">
              {workspace.recentJobs.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "filename", label: "Source File" },
                    {
                      key: "status",
                      label: "Status",
                      render: (row) => <StatusBadge status={row.status}>{row.status}</StatusBadge>,
                    },
                    { key: "created_at", label: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "—" },
                  ]}
                  rows={workspace.recentJobs}
                />
              ) : (
                <EmptyState title="No staging history" description="Recent job statuses appear here after your first upload." />
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

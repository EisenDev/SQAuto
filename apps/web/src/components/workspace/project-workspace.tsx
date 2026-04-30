"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileCode2,
  FileSearch,
  Link2,
  Loader2,
  PlayCircle,
  Save,
  Server,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { safeFetch } from "@/lib/api_client";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type WorkspaceStatus =
  | "completed"
  | "processing"
  | "failed"
  | "idle"
  | "warning"
  | "mock"
  | "locked";

export interface WorkspaceColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primary?: boolean;
  foreign?: string;
}

export interface WorkspaceTable {
  name: string;
  rowCount: number;
  sizeMb: number;
  columns: WorkspaceColumn[];
  sampleRows: Record<string, unknown>[];
}

export interface WorkspaceGraphNode {
  id: string;
  label: string;
  columns: WorkspaceColumn[];
  primary_keys: string[];
  position?: { x: number; y: number };
}

export interface WorkspaceGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relation_type?: string;
  status?: string;
}

export interface PipelineStep {
  name: string;
  status: WorkspaceStatus;
  duration: string;
}

export interface WorkspaceIssue {
  table: string;
  issueType: string;
  severity: "low" | "medium" | "high";
  affectedRows: number;
  detail: string;
}

export interface WorkspaceTarget {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  db_type?: string;
  ssl_mode?: string | null;
}

export interface WorkspaceRun {
  id: string;
  status: string;
  mode: string;
  started_at: string | null;
  finished_at: string | null;
  summary: Record<string, any> | null;
}

export interface WorkspaceDataState {
  project: {
    id: string;
    name: string;
    description?: string | null;
    organization_id?: string | null;
  };
  sourceStatus: {
    project_id: string;
    active_job_id: string | null;
    status: string | null;
    filename: string | null;
    file_size: number;
    dialect: string | null;
    metrics: {
      tables: number;
      rows: number;
      data_size_mb: number;
    };
    updated_at: string | null;
  };
  jobs: Array<{
    id: string;
    status: string;
    filename: string;
    file_size?: number | null;
    created_at?: string;
    is_active?: boolean;
  }>;
  logsPreview: string[];
  activeJob: any | null;
  tables: WorkspaceTable[];
  graph: { nodes: WorkspaceGraphNode[]; edges: WorkspaceGraphEdge[] };
  pipeline: PipelineStep[];
  issues: WorkspaceIssue[];
  diagnosticsSeries: Array<{ label: string; rows: number; duration: number }>;
  tableDistribution: Array<{ name: string; sizeMb: number; rows: number }>;
  timeline: Array<{ title: string; subtitle: string; time: string; status: WorkspaceStatus }>;
  recentJobs: Array<{ id: string; filename: string; status: string; created_at?: string }>;
  mappingSuggestions: Array<{ source: string; target: string; reason: string; confidence: string }>;
  exportOptions: Array<{ id: string; title: string; description: string; format: string; ready: boolean }>;
  destinations: WorkspaceTarget[];
  runs: WorkspaceRun[];
  usingMockData: boolean;
  hasAnyJob: boolean;
  hasExtraction: boolean;
  loading: boolean;
  error: string | null;
}

function buildEmptyState(projectId: string): WorkspaceDataState {
  return {
    project: {
      id: projectId,
      name: "Project Workspace",
      description: null,
      organization_id: null,
    },
    sourceStatus: {
      project_id: projectId,
      active_job_id: null,
      status: null,
      filename: null,
      file_size: 0,
      dialect: null,
      metrics: {
        tables: 0,
        rows: 0,
        data_size_mb: 0,
      },
      updated_at: null,
    },
    jobs: [],
    logsPreview: [],
    activeJob: null,
    tables: [],
    graph: { nodes: [], edges: [] },
    pipeline: [],
    issues: [],
    diagnosticsSeries: [],
    tableDistribution: [],
    timeline: [],
    recentJobs: [],
    mappingSuggestions: [],
    exportOptions: [],
    destinations: [],
    runs: [],
    usingMockData: false,
    hasAnyJob: false,
    hasExtraction: false,
    loading: true,
    error: null,
  };
}

function deriveTimeline(jobs: WorkspaceDataState["jobs"], sourceStatus: WorkspaceDataState["sourceStatus"], logsPreview: string[]) {
  const timeline: WorkspaceDataState["timeline"] = [];
  if (sourceStatus.filename) {
    timeline.push({
      title: "Current source",
      subtitle: sourceStatus.filename,
      time: sourceStatus.updated_at ? new Date(sourceStatus.updated_at).toLocaleString() : "Recently",
      status: sourceStatus.status === "failed" ? "failed" : sourceStatus.status ? "completed" : "idle",
    });
  }
  for (const job of jobs.slice(0, 3)) {
    timeline.push({
      title: job.is_active ? "Active job updated" : "Job recorded",
      subtitle: job.filename,
      time: job.created_at ? new Date(job.created_at).toLocaleString() : "Unknown time",
      status:
        job.status === "completed"
          ? "completed"
          : job.status === "failed"
            ? "failed"
            : job.status === "uploaded" || job.status === "restoring" || job.status === "analyzing"
              ? "processing"
              : "idle",
    });
  }
  for (const line of logsPreview.slice(0, 2)) {
    timeline.push({
      title: "Recent log",
      subtitle: line,
      time: "Log preview",
      status: /error|fail/i.test(line) ? "failed" : /warn/i.test(line) ? "warning" : "idle",
    });
  }
  return timeline.slice(0, 5);
}

async function fetchProjectWorkspaceData(projectId: string): Promise<WorkspaceDataState> {
  const [projectRes, sourceRes, jobsRes, logsRes, activeJobRes] = await Promise.all([
    safeFetch(`${API_URL}/projects/${projectId}`),
    safeFetch(`${API_URL}/projects/${projectId}/source-status`),
    safeFetch(`${API_URL}/projects/${projectId}/jobs`),
    safeFetch(`${API_URL}/projects/${projectId}/logs?limit=10&page=1`),
    safeFetch(`${API_URL}/projects/${projectId}/active-job`),
  ]);
  const jobs =
    jobsRes.success && Array.isArray(jobsRes.data)
      ? jobsRes.data.map((job: any) => ({
          id: String(job.id),
          status: String(job.status),
          filename: String(job.original_filename || job.filename || "source.sql"),
          file_size: job.file_size,
          created_at: job.created_at,
          is_active: job.is_active,
        }))
      : [];
  const logsPreview = logsRes.success && Array.isArray(logsRes.data?.lines) ? logsRes.data.lines : [];
  const sourceStatus = sourceRes.success
    ? {
        ...sourceRes.data,
        metrics: {
          tables: Number(sourceRes.data.metrics?.tables || 0),
          rows: Number(sourceRes.data.metrics?.rows || 0),
          data_size_mb: Number(sourceRes.data.metrics?.data_size_mb || 0),
        },
      }
    : buildEmptyState(projectId).sourceStatus;

  return {
    ...buildEmptyState(projectId),
    project: projectRes.success
      ? {
          id: String(projectRes.data.id),
          name: projectRes.data.name,
          description: projectRes.data.description,
          organization_id: projectRes.data.organization_id,
        }
      : buildEmptyState(projectId).project,
    sourceStatus,
    jobs,
    logsPreview,
    activeJob: activeJobRes.success ? activeJobRes.data : null,
    recentJobs: jobs.slice(0, 5).map((job) => ({
      id: job.id,
      filename: job.filename,
      status: job.status,
      created_at: job.created_at,
    })),
    timeline: deriveTimeline(jobs, sourceStatus, logsPreview),
    exportOptions: [
      { id: "clean-sql", title: "Clean SQL", description: "Sanitized PostgreSQL-friendly export from staging.", format: ".sql", ready: sourceStatus.status === "completed" },
      { id: "translated-sql", title: "Translated SQL", description: "Dialect-converted output for the chosen target engine.", format: ".sql", ready: false },
      { id: "excel", title: "Excel Export", description: "Workbook package with summary, tables, and QA notes.", format: ".xlsx", ready: sourceStatus.status === "completed" },
    ],
    usingMockData: false,
    hasAnyJob: jobs.length > 0 || Boolean(sourceStatus.active_job_id),
    hasExtraction: sourceStatus.metrics.tables > 0 || sourceStatus.status === "completed",
    loading: false,
    error:
      projectRes.success || sourceRes.success || jobsRes.success || logsRes.success
        ? null
        : projectRes.error || sourceRes.error || jobsRes.error || logsRes.error || "Unable to load real data",
  };
}

export function useProjectData(projectId: string) {
  const emptyState = React.useMemo(() => buildEmptyState(projectId), [projectId]);
  const swr = useSWR(["project-workspace", projectId], () => fetchProjectWorkspaceData(projectId), {
    fallbackData: emptyState,
    dedupingInterval: 10000,
    focusThrottleInterval: 15000,
    revalidateOnFocus: false,
    keepPreviousData: true,
    refreshInterval: (data) => {
      const status = data?.sourceStatus?.status;
      if (status === "uploaded" || status === "restoring" || status === "analyzing") return 5000;
      return 0;
    },
  });

  return {
    ...(swr.data || emptyState),
    loading: swr.isLoading && !(swr.data && swr.data.hasAnyJob),
    refreshing: swr.isValidating,
    reload: async () => {
      await swr.mutate();
    },
  };
}

export const useProjectWorkspaceData = useProjectData;

export function StatusBadge({ status, children }: { status: WorkspaceStatus | string; children?: React.ReactNode }) {
  const value = String(status).toLowerCase();
  const tone =
    value === "completed"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
      : value === "processing" || value === "restoring" || value === "analyzing" || value === "uploaded"
        ? "bg-sky-500/15 text-sky-300 ring-sky-500/20"
        : value === "failed"
          ? "bg-rose-500/15 text-rose-300 ring-rose-500/20"
          : value === "warning"
            ? "bg-amber-500/15 text-amber-300 ring-amber-500/20"
            : value === "mock"
              ? "bg-violet-500/15 text-violet-300 ring-violet-500/20"
              : value === "locked"
                ? "bg-slate-700/50 text-slate-300 ring-slate-600/40"
                : "bg-slate-800/90 text-slate-300 ring-slate-700/40";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1", tone)}>
      {children || value.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          {badge}
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.9))] p-6 shadow-[0_20px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "teal",
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ElementType;
  tone?: "teal" | "blue" | "violet" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    teal: "from-teal-400/20 via-teal-400/10 to-transparent text-teal-300 ring-teal-400/20",
    blue: "from-sky-400/20 via-sky-400/10 to-transparent text-sky-300 ring-sky-400/20",
    violet: "from-violet-400/20 via-violet-400/10 to-transparent text-violet-300 ring-violet-400/20",
    amber: "from-amber-400/20 via-amber-400/10 to-transparent text-amber-300 ring-amber-400/20",
    rose: "from-rose-400/20 via-rose-400/10 to-transparent text-rose-300 ring-rose-400/20",
  };

  return (
    <div className="group rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-white/15">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
        </div>
        {Icon ? (
          <div className={cn("rounded-2xl bg-gradient-to-br p-3 ring-1", tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description ? <p className="text-xs text-slate-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Database,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/40 px-6 text-center">
      <div className="mb-5 rounded-3xl bg-slate-900/80 p-4 ring-1 ring-white/10">
        <Icon className="h-8 w-8 text-teal-300" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  className,
}: {
  columns: Array<{ key: string; label: string; render?: (row: any) => React.ReactNode; className?: string }>;
  rows: any[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10", className)}>
      <div className="max-h-[56vh] overflow-auto">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-slate-950/90">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500", column.className)}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/40">
            {rows.map((row, index) => (
              <tr key={row.id || row.name || index} className="transition-colors hover:bg-white/[0.03]">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-slate-300">
                    {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WorkspaceNote({
  usingMockData,
  loading,
  error,
}: {
  usingMockData: boolean;
  loading: boolean;
  error: string | null;
}) {
  if (!usingMockData && !loading && !error) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-teal-300" /> : error ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : <Sparkles className="h-4 w-4 text-violet-300" />}
      <span>
        {loading
          ? "Loading real workspace data."
          : error
            ? `Unable to load real data. ${error}`
            : "Preview UI only."}
      </span>
    </div>
  );
}

export const workspaceIcons = {
  diagnostics: BarChart3,
  explorer: FileSearch,
  visualizer: Link2,
  quality: ShieldAlert,
  mapping: FileCode2,
  export: Save,
  destination: Server,
  simulation: PlayCircle,
  settings: AlertTriangle,
  upload: Upload,
};

export const workspaceActions = {
  primary: "inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-teal-400",
  secondary: "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10",
  danger: "inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20",
};

export const workspaceEmptyActions = {
  upload: (
    <button className={workspaceActions.primary}>
      <Upload className="h-4 w-4" />
      Upload SQL dump
    </button>
  ),
};

export const workspaceMeta = {
  diagnostics: {
    title: "Extraction Diagnostics",
    description: "Detailed breakdown of ingestion and processing pipeline",
  },
  explorer: {
    title: "Source of Truth Explorer",
    description: "Browse extracted tables, search rows, and inspect staged data safely.",
  },
  visualizer: {
    title: "Schema Visualizer",
    description: "Understand table relationships, keys, and structural issues at a glance.",
  },
  quality: {
    title: "Data Quality & Integrity",
    description: "Surface duplicates, null risks, orphan records, and mismatch hotspots.",
  },
  mapping: {
    title: "Schema Mapping",
    description: "Align source columns to destination targets before migration execution.",
  },
  export: {
    title: "Export & Delivery",
    description: "Prepare clean SQL, translated SQL, and spreadsheet outputs from staged data.",
  },
  destination: {
    title: "Live Database Destinations",
    description: "Manage target database connections for validation and controlled migration.",
  },
  simulation: {
    title: "Migration Simulation",
    description: "Dry-run source jobs against target environments before any live move.",
  },
  settings: {
    title: "Project Settings",
    description: "Manage project identity, destructive actions, and reset controls.",
  },
};

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDurationFromRows(rows: number) {
  const seconds = Math.max(18, Math.round(rows / 1800));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function statusIcon(status: WorkspaceStatus | string) {
  const value = String(status).toLowerCase();
  if (value === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (value === "processing" || value === "analyzing" || value === "restoring") return <Loader2 className="h-4 w-4 animate-spin text-sky-300" />;
  if (value === "failed") return <AlertTriangle className="h-4 w-4 text-rose-300" />;
  if (value === "warning") return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  return <Clock3 className="h-4 w-4 text-slate-400" />;
}

export function severityTone(severity: string) {
  if (severity === "high") return "text-rose-300 bg-rose-500/15 ring-rose-500/20";
  if (severity === "medium") return "text-amber-300 bg-amber-500/15 ring-amber-500/20";
  return "text-sky-300 bg-sky-500/15 ring-sky-500/20";
}

export const systemGradient =
  "bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_100%)]";

export const workspacePageShell =
  "mx-auto w-full max-w-[1720px] space-y-8 animate-in fade-in duration-500";

export const workspaceViewportHeight =
  "h-[calc(100vh-15rem)] min-h-[34rem]";

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className={cn("min-h-full p-6 md:p-8", systemGradient)}>{children}</div>;
}

export function ActionLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-300">
      {children}
      <ArrowRight className="h-4 w-4" />
    </span>
  );
}

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

function seedNumber(text: string) {
  return Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildMockTables(projectId: string): WorkspaceTable[] {
  const seed = seedNumber(projectId);
  const names = ["customers", "orders", "order_items", "products", "invoices", "payments"];
  return names.map((name, index) => {
    const base = seed + index * 17;
    const rowCount = 500 + (base % 4000);
    const columns: WorkspaceColumn[] = [
      { name: `${name.slice(0, -1)}_id`, type: "uuid", primary: true },
      { name: "created_at", type: "timestamp" },
      { name: "updated_at", type: "timestamp", nullable: true },
      { name: index % 2 === 0 ? "status" : "amount", type: index % 2 === 0 ? "text" : "numeric" },
    ];
    if (name !== "customers") {
      columns.push({ name: "customer_id", type: "uuid", foreign: "customers.customer_id" });
    }

    return {
      name,
      rowCount,
      sizeMb: Number((rowCount / 180).toFixed(1)),
      columns,
      sampleRows: Array.from({ length: 6 }).map((_, rowIndex) => ({
        [columns[0].name]: `row-${index + 1}-${rowIndex + 1}`,
        created_at: `2026-04-${String(10 + rowIndex).padStart(2, "0")} 09:${String(rowIndex).padStart(2, "0")}`,
        updated_at: rowIndex % 3 === 0 ? null : `2026-04-${String(10 + rowIndex).padStart(2, "0")} 11:${String(rowIndex).padStart(2, "0")}`,
        [columns[3].name]: index % 2 === 0 ? ["ready", "review", "archived"][rowIndex % 3] : (150 + rowIndex * 12).toFixed(2),
        ...(name !== "customers" ? { customer_id: `cust-${rowIndex + 11}` } : {}),
      })),
    };
  });
}

function buildMockGraph(tables: WorkspaceTable[]) {
  const nodes: WorkspaceGraphNode[] = tables.map((table, index) => ({
    id: table.name,
    label: table.name,
    columns: table.columns,
    primary_keys: table.columns.filter((col) => col.primary).map((col) => col.name),
    position: { x: (index % 3) * 280, y: Math.floor(index / 3) * 220 },
  }));

  const edges: WorkspaceGraphEdge[] = tables
    .filter((table) => table.name !== "customers")
    .map((table) => ({
      id: `${table.name}-customers`,
      source: table.name,
      target: "customers",
      label: "customer_id -> customer_id",
      relation_type: "deterministic",
      status: "valid",
    }));

  return { nodes, edges };
}

function buildMockIssues(tables: WorkspaceTable[]): WorkspaceIssue[] {
  const picks = tables.slice(0, 4);
  return [
    {
      table: picks[0]?.name || "customers",
      issueType: "Duplicate Rows",
      severity: "medium",
      affectedRows: 14,
      detail: "Repeated natural-key combinations detected during sample scan.",
    },
    {
      table: picks[1]?.name || "orders",
      issueType: "Null Violations",
      severity: "high",
      affectedRows: 38,
      detail: "Required status field is empty in a subset of records.",
    },
    {
      table: picks[2]?.name || "order_items",
      issueType: "Orphan Records",
      severity: "medium",
      affectedRows: 9,
      detail: "Rows reference parents that were not found in the staging set.",
    },
    {
      table: picks[3]?.name || "payments",
      issueType: "Type Mismatches",
      severity: "low",
      affectedRows: 6,
      detail: "Numeric fields contain formatting noise in sampled rows.",
    },
  ];
}

function buildMockData(projectId: string): WorkspaceDataState {
  const tables = buildMockTables(projectId);
  const graph = buildMockGraph(tables);
  const issues = buildMockIssues(tables);
  const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0);
  const totalSize = Number(tables.reduce((sum, table) => sum + table.sizeMb, 0).toFixed(1));
  const projectName = `Project ${projectId.slice(0, 8).toUpperCase()}`;

  return {
    project: {
      id: projectId,
      name: projectName,
      description: "Migration workspace preview data",
    },
    sourceStatus: {
      project_id: projectId,
      active_job_id: null,
      status: null,
      filename: null,
      file_size: 0,
      dialect: "postgresql",
      metrics: {
        tables: tables.length,
        rows: totalRows,
        data_size_mb: totalSize,
      },
      updated_at: new Date().toISOString(),
    },
    jobs: [],
    logsPreview: [
      "[preview] awaiting new upload",
      "[preview] diagnostics shell rendered from cached fallback",
      "[preview] workspace remains interactive without backend data",
    ],
    activeJob: null,
    tables,
    graph,
    pipeline: [
      { name: "Upload", status: "completed", duration: "12s" },
      { name: "Decompression", status: "completed", duration: "8s" },
      { name: "Restore", status: "processing", duration: "41s" },
      { name: "Parsing", status: "idle", duration: "--" },
      { name: "Analysis", status: "idle", duration: "--" },
    ],
    issues,
    diagnosticsSeries: [
      { label: "00:00", rows: 0, duration: 0 },
      { label: "00:20", rows: 820, duration: 20 },
      { label: "00:40", rows: 2800, duration: 40 },
      { label: "01:00", rows: 6200, duration: 60 },
      { label: "01:20", rows: 9700, duration: 80 },
      { label: "01:40", rows: 13200, duration: 100 },
    ],
    tableDistribution: tables.map((table) => ({
      name: table.name,
      sizeMb: table.sizeMb,
      rows: table.rowCount,
    })),
    timeline: [
      { title: "Workspace initialized", subtitle: "Project shell is ready for ingestion.", time: "Just now", status: "completed" },
      { title: "Mock diagnostics loaded", subtitle: "Fallback data keeps the UI navigable.", time: "Now", status: "mock" },
      { title: "Awaiting upload", subtitle: "Upload a SQL dump to replace preview data.", time: "Pending", status: "idle" },
    ],
    recentJobs: [],
    mappingSuggestions: [
      { source: "customer_id", target: "customer_id", reason: "Exact name and type match", confidence: "98%" },
      { source: "status", target: "order_status", reason: "Shared semantic label", confidence: "84%" },
      { source: "amount", target: "total_amount", reason: "Numeric field similarity", confidence: "79%" },
    ],
    exportOptions: [
      { id: "clean-sql", title: "Clean SQL", description: "Sanitized PostgreSQL-friendly export from staging.", format: ".sql", ready: true },
      { id: "translated-sql", title: "Translated SQL", description: "Dialect-converted output for the chosen target engine.", format: ".sql", ready: false },
      { id: "excel", title: "Excel Export", description: "Workbook package with summary, tables, and QA notes.", format: ".xlsx", ready: true },
    ],
    destinations: [
      {
        id: "mock-target-1",
        name: "Warehouse Primary",
        host: "analytics.internal",
        port: 5432,
        database_name: "warehouse",
        username: "readonly",
        db_type: "postgresql",
        ssl_mode: "require",
      },
    ],
    runs: [],
    usingMockData: true,
    hasAnyJob: false,
    hasExtraction: false,
    loading: true,
    error: null,
  };
}

function normalizeTablesFromProfile(profile: any, fallbackTables: WorkspaceTable[]) {
  const tableMap = profile?.tables;
  if (!tableMap || typeof tableMap !== "object") return fallbackTables;

  return Object.entries(tableMap).map(([name, info]: [string, any], index) => {
    const fallback = fallbackTables[index % fallbackTables.length];
    const columns = Array.isArray(info?.columns)
      ? info.columns.map((col: any) => ({
          name: String(col.name || "column"),
          type: String(col.type || "text"),
          primary: Array.isArray(info?.primary_keys) ? info.primary_keys.includes(col.name) : false,
        }))
      : fallback.columns;

    return {
      name,
      rowCount: Number(info?.row_count || fallback.rowCount),
      sizeMb: Number(info?.size_mb || fallback.sizeMb),
      columns,
      sampleRows: fallback.sampleRows,
    };
  });
}

function buildPipeline(status: string | null) {
  const current = status || "idle";
  const order = ["uploaded", "restoring", "analyzing", "completed"];
  const currentIndex = order.indexOf(current);
  return [
    { name: "Upload", duration: "12s", status: current === "failed" ? "completed" : "completed" as WorkspaceStatus },
    { name: "Decompression", duration: "18s", status: currentIndex >= 1 || current === "completed" ? "completed" : "idle" as WorkspaceStatus },
    { name: "Restore", duration: "46s", status: current === "restoring" ? "processing" : currentIndex >= 2 || current === "completed" ? "completed" : current === "failed" ? "failed" : "idle" as WorkspaceStatus },
    { name: "Parsing", duration: "24s", status: current === "analyzing" ? "processing" : current === "completed" ? "completed" : current === "failed" && currentIndex >= 2 ? "failed" : "idle" as WorkspaceStatus },
    { name: "Analysis", duration: "31s", status: current === "completed" ? "completed" : current === "failed" && currentIndex >= 2 ? "failed" : "idle" as WorkspaceStatus },
  ];
}

function buildDiagnosticsSeries(totalRows: number) {
  return [
    { label: "00:00", rows: 0, duration: 0 },
    { label: "00:30", rows: Math.round(totalRows * 0.18), duration: 30 },
    { label: "01:00", rows: Math.round(totalRows * 0.36), duration: 60 },
    { label: "01:30", rows: Math.round(totalRows * 0.58), duration: 90 },
    { label: "02:00", rows: Math.round(totalRows * 0.79), duration: 120 },
    { label: "02:30", rows: totalRows, duration: 150 },
  ];
}

function deriveTimeline(data: WorkspaceDataState) {
  const timeline = [...data.timeline];
  if (data.sourceStatus.filename) {
    timeline.unshift({
      title: "Source attached",
      subtitle: data.sourceStatus.filename,
      time: data.sourceStatus.updated_at ? new Date(data.sourceStatus.updated_at).toLocaleString() : "Recently",
      status: data.sourceStatus.status === "failed" ? "failed" : "completed",
    });
  }
  if (data.recentJobs.length > 0) {
    timeline.unshift({
      title: "Recent workspace activity",
      subtitle: `${data.recentJobs.length} job records available for this project.`,
      time: "Latest sync",
      status: "processing",
    });
  }
  return timeline.slice(0, 5);
}

export function useProjectWorkspaceData(projectId: string) {
  const [state, setState] = React.useState<WorkspaceDataState>(() => buildMockData(projectId));

  const reload = React.useCallback(async () => {
    const fallback = buildMockData(projectId);
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const [projectRes, sourceRes, jobsRes, logsRes] = await Promise.all([
      safeFetch(`${API_URL}/projects/${projectId}`),
      safeFetch(`${API_URL}/projects/${projectId}/source-status`),
      safeFetch(`${API_URL}/projects/${projectId}/jobs`),
      safeFetch(`${API_URL}/projects/${projectId}/logs?limit=10&page=1`),
    ]);

    let activeJob: any = null;
    const activeJobId = sourceRes.success ? sourceRes.data?.active_job_id : null;
    if (activeJobId) {
      const jobRes = await safeFetch(`${API_URL}/jobs/${activeJobId}`);
      if (jobRes.success) activeJob = jobRes.data;
    }

    const tables = normalizeTablesFromProfile(activeJob?.profile, fallback.tables);
    const graph =
      activeJob?.profile?.graph?.nodes?.length
        ? {
            nodes: activeJob.profile.graph.nodes,
            edges: activeJob.profile.graph.edges || [],
          }
        : buildMockGraph(tables);

    const totalRows =
      Number(activeJob?.profile?.metadata?.total_rows) ||
      Number(sourceRes.success ? sourceRes.data?.metrics?.rows : 0) ||
      tables.reduce((sum, table) => sum + table.rowCount, 0);
    const totalTables =
      Number(activeJob?.profile?.metadata?.table_count) ||
      Number(sourceRes.success ? sourceRes.data?.metrics?.tables : 0) ||
      tables.length;
    const totalSize =
      Number(activeJob?.profile?.metadata?.data_size_mb) ||
      Number(sourceRes.success ? sourceRes.data?.metrics?.data_size_mb : 0) ||
      Number(tables.reduce((sum, table) => sum + table.sizeMb, 0).toFixed(1));

    const next: WorkspaceDataState = {
      ...fallback,
      project: projectRes.success
        ? {
            id: String(projectRes.data.id),
            name: projectRes.data.name,
            description: projectRes.data.description,
            organization_id: projectRes.data.organization_id,
          }
        : fallback.project,
      sourceStatus: sourceRes.success
        ? {
            ...sourceRes.data,
            metrics: {
              tables: Number(sourceRes.data.metrics?.tables || totalTables),
              rows: Number(sourceRes.data.metrics?.rows || totalRows),
              data_size_mb: Number(sourceRes.data.metrics?.data_size_mb || totalSize),
            },
          }
        : {
            ...fallback.sourceStatus,
            metrics: { tables: totalTables, rows: totalRows, data_size_mb: totalSize },
          },
      jobs: jobsRes.success && Array.isArray(jobsRes.data)
        ? jobsRes.data.map((job: any) => ({
            id: String(job.id),
            status: String(job.status),
            filename: String(job.original_filename || job.filename || "source.sql"),
            file_size: job.file_size,
            created_at: job.created_at,
            is_active: job.is_active,
          }))
        : fallback.jobs,
      logsPreview: logsRes.success && Array.isArray(logsRes.data?.lines) && logsRes.data.lines.length > 0
        ? logsRes.data.lines
        : fallback.logsPreview,
      activeJob,
      tables,
      graph,
      pipeline: buildPipeline(sourceRes.success ? sourceRes.data?.status : null),
      issues:
        activeJob?.profile?.integrity_issues && Array.isArray(activeJob.profile.integrity_issues)
          ? activeJob.profile.integrity_issues
          : buildMockIssues(tables),
      diagnosticsSeries: buildDiagnosticsSeries(totalRows),
      tableDistribution: tables.map((table) => ({
        name: table.name,
        sizeMb: table.sizeMb,
        rows: table.rowCount,
      })),
      recentJobs:
        jobsRes.success && Array.isArray(jobsRes.data)
          ? jobsRes.data.slice(0, 5).map((job: any) => ({
              id: String(job.id),
              filename: String(job.original_filename || job.filename || "source.sql"),
              status: String(job.status),
              created_at: job.created_at,
            }))
          : fallback.recentJobs,
      mappingSuggestions: tables.slice(0, 3).flatMap((table) =>
        table.columns.slice(0, 1).map((column: WorkspaceColumn) => ({
          source: `${table.name}.${column.name}`,
          target: `${table.name}.${column.name}`,
          reason: "Column name aligns with staged profile metadata.",
          confidence: "91%",
        })),
      ),
      exportOptions: fallback.exportOptions.map((item) => ({
        ...item,
        ready: Boolean(activeJob?.id) && (item.id !== "translated-sql" ? true : (sourceRes.data?.status === "completed")),
      })),
      destinations: fallback.destinations,
      runs: fallback.runs,
      usingMockData: !(projectRes.success && sourceRes.success),
      hasAnyJob: (jobsRes.success && Array.isArray(jobsRes.data) && jobsRes.data.length > 0) || Boolean(activeJobId),
      hasExtraction: Boolean(activeJob?.profile?.tables && Object.keys(activeJob.profile.tables).length > 0) || sourceRes.data?.status === "completed",
      loading: false,
      error: [projectRes, sourceRes, jobsRes, logsRes].every((res) => !res.success)
        ? projectRes.error || sourceRes.error || jobsRes.error || logsRes.error
        : null,
      timeline: fallback.timeline,
    };

    next.timeline = deriveTimeline(next);
    next.destinations = fallback.destinations;
    next.runs = fallback.runs;
    setState(next);
  }, [projectId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return {
    ...state,
    reload,
  };
}

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
      <div className="overflow-x-auto">
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
          ? "Refreshing workspace data."
          : error
            ? `Live data is partially unavailable. Showing fallback data. ${error}`
            : "Showing fallback preview data until live extraction details are available."}
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

"use client";

import React from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp, RefreshCw, UploadCloud, AlertTriangle } from "lucide-react";
import {
  ChartCard,
  EmptyState,
  formatBytes,
  formatDurationFromRows,
  PageFrame,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  statusIcon,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
} from "@/components/workspace/project-workspace";
import { useParams, useRouter } from "next/navigation";

export default function DiagnosticsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [errorsOpen, setErrorsOpen] = React.useState(true);

  const meta = workspaceMeta.diagnostics;

  if (!workspace.hasAnyJob && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader
          title={meta.title}
          description={meta.description}
          actions={
            <button className={workspaceActions.primary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
              <UploadCloud className="h-4 w-4" />
              Upload SQL dump
            </button>
          }
        />
        <div className="mt-8">
          <EmptyState
            title="Upload a SQL dump to view diagnostics"
            description="Pipeline metrics, row throughput, and extraction health will appear here once a project source has been processed."
          />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={meta.title}
          description={meta.description}
          badge={<StatusBadge status={workspace.usingMockData ? "mock" : workspace.sourceStatus.status || "idle"} />}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={workspaceActions.primary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                <UploadCloud className="h-4 w-4" />
                Manage Upload
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Tables Extracted" value={workspace.sourceStatus.metrics.tables} hint="Detected in staging profile" tone="teal" />
          <StatCard title="Rows Processed" value={workspace.sourceStatus.metrics.rows.toLocaleString()} hint="Current staged row volume" tone="blue" />
          <StatCard title="Data Size (MB)" value={workspace.sourceStatus.metrics.data_size_mb.toFixed(1)} hint={workspace.sourceStatus.file_size ? `Source ${formatBytes(workspace.sourceStatus.file_size)}` : "Compressed size unknown"} tone="violet" />
          <StatCard title="Processing Duration" value={formatDurationFromRows(workspace.sourceStatus.metrics.rows)} hint="Estimated from pipeline throughput" tone="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <ChartCard title="Rows Processed Over Time" description="Throughput trend across ingestion stages">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={workspace.diagnosticsSeries}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                <Line type="monotone" dataKey="rows" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 3, fill: "#2dd4bf" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Table Size Distribution" description="Largest staged tables by size">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workspace.tableDistribution.slice(0, 6)}>
                <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                <Bar dataKey="sizeMb" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Pipeline Status" description="Current ingestion pipeline state and stage durations">
            <div className="space-y-3">
              {workspace.pipeline.map((step) => (
                <div key={step.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(step.status)}
                    <div>
                      <div className="text-sm font-medium text-white">{step.name}</div>
                      <div className="text-xs text-slate-500">{step.duration}</div>
                    </div>
                  </div>
                  <StatusBadge status={step.status} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Warnings & Errors"
            description="Non-blocking diagnostics surfaced during staging and analysis"
            action={
              <button className={workspaceActions.secondary} onClick={() => setErrorsOpen((open) => !open)}>
                {errorsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {errorsOpen ? "Collapse" : "Expand"}
              </button>
            }
          >
            {errorsOpen ? (
              <div className="space-y-3">
                {(workspace.logsPreview.length > 0 ? workspace.logsPreview : ["No warnings captured yet."]).map((line, index) => (
                  <div key={`${line}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                      <span className="font-mono text-[13px] leading-6">{line}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}

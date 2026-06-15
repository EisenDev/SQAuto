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
  workspacePageShell,
  ProjectLockGuard,
} from "@/components/workspace/project-workspace";
import { getJobDiagnostics } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function DiagnosticsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [diagnostics, setDiagnostics] = React.useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [errorsOpen, setErrorsOpen] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDiagnostics() {
      if (!workspace.sourceStatus.active_job_id) {
        setDiagnostics(null);
        setPageError(null);
        return;
      }
      setLoadingDiagnostics(true);
      try {
        const result = await getJobDiagnostics(workspace.sourceStatus.active_job_id);
        if (!cancelled) {
          setDiagnostics(result);
          setPageError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setDiagnostics(null);
          setPageError(error?.message || "Unable to load real data");
        }
      } finally {
        if (!cancelled) {
          setLoadingDiagnostics(false);
        }
      }
    }

    void loadDiagnostics();

    return () => {
      cancelled = true;
    };
  }, [workspace.sourceStatus.active_job_id]);

  if (!workspace.hasAnyJob && !workspace.usingMockData) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="individual">
        <PageFrame>
          <PageHeader title={workspaceMeta.diagnostics.title} description={workspaceMeta.diagnostics.description} />
          <div className="mt-8">
            <EmptyState
              title="No source job available"
              description="A source schema must be uploaded before diagnostics telemetry can be populated."
              action={
                <button className={workspaceActions.primary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                  <UploadCloud className="h-4 w-4" />
                  Upload SQL Dump
                </button>
              }
            />
          </div>
        </PageFrame>
      </ProjectLockGuard>
    );
  }

  const durationData = diagnostics?.timeline?.timeline
    ? diagnostics.timeline.timeline.map((item: any) => ({
        name: item.step,
        duration: Number(item.duration_ms) / 1000,
      }))
    : workspace.pipeline.map((item) => ({
        name: item.name,
        duration: parseFloat(item.duration) || 0,
      }));

  const rowsWrittenData = diagnostics?.table_counts?.counts
    ? Object.entries(diagnostics.table_counts.counts).map(([name, count]) => ({
        name,
        rows: count,
      }))
    : workspace.tableDistribution.map((item) => ({
        name: item.name,
        rows: item.rows,
      }));

  return (
    <ProjectLockGuard projectId={projectId} allowedType="individual">
      <PageFrame>
        <div className={workspacePageShell}>
          <PageHeader
            title={workspaceMeta.diagnostics.title}
            description={workspaceMeta.diagnostics.description}
            badge={<StatusBadge status={workspace.sourceStatus.status || "idle"}>{workspace.sourceStatus.status || "idle"}</StatusBadge>}
            actions={
              <button
                className={workspaceActions.secondary}
                onClick={async () => {
                  await workspace.reload();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            }
          />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Tables Extracted" value={workspace.sourceStatus.metrics.tables} hint="Detected in staging profile" tone="teal" />
          <StatCard title="Rows Processed" value={workspace.sourceStatus.metrics.rows.toLocaleString()} hint="Current staged row volume" tone="blue" />
          <StatCard title="Data Size (MB)" value={workspace.sourceStatus.metrics.data_size_mb.toFixed(1)} hint={workspace.sourceStatus.file_size ? `Source ${formatBytes(workspace.sourceStatus.file_size)}` : "Compressed size unknown"} tone="violet" />
          <StatCard title="Processing Duration" value={diagnostics?.pipeline_steps?.[diagnostics.pipeline_steps.length - 1]?.duration || "No data available yet"} hint="Measured from job diagnostics" tone="amber" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <ChartCard title="Rows Processed Over Time" description="Throughput trend across ingestion stages">
            {diagnostics?.row_processing_timeline?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={diagnostics.row_processing_timeline}>
                <CartesianGrid stroke="rgba(28,25,23,0.04)" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#78716c" fontSize={12} />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(28,25,23,0.08)", borderRadius: 16 }} />
                <Line type="monotone" dataKey="rows" stroke="#0f766e" strokeWidth={3} dot={{ r: 3, fill: "#0f766e" }} />
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <EmptyState title="No data available yet" description="Rows timeline will appear after diagnostics are generated for this job." />
            )}
          </ChartCard>

          <ChartCard title="Table Size Distribution" description="Largest staged tables by size">
            {diagnostics?.largest_tables?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diagnostics.largest_tables.slice(0, 6)}>
                <CartesianGrid stroke="rgba(28,25,23,0.04)" strokeDasharray="4 4" />
                <XAxis dataKey="name" stroke="#78716c" fontSize={11} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(28,25,23,0.08)", borderRadius: 16 }} />
                <Bar dataKey="size_mb" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <EmptyState title="No data available yet" description="Largest tables will appear after the extracted source has been profiled." />
            )}
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Pipeline Status" description="Current ingestion pipeline state and stage durations">
            <div className="space-y-3">
              {(diagnostics?.pipeline_steps || []).map((step: any) => (
                <div key={step.name} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {statusIcon(step.status)}
                    <div>
                      <div className="text-sm font-semibold text-stone-900">{step.name}</div>
                      <div className="text-xs text-stone-500">{step.duration}</div>
                    </div>
                  </div>
                  <StatusBadge status={step.status} />
                </div>
              ))}
              {!diagnostics?.pipeline_steps?.length ? <EmptyState title="No data available yet" description="Pipeline stage details will appear after a real extraction job is available." /> : null}
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
                {(((diagnostics?.errors || []).concat(diagnostics?.warnings || [])).length > 0
                  ? (diagnostics?.errors || []).concat(diagnostics?.warnings || [])
                  : ["No diagnostics logs generated for this project run yet."]
                ).map((line: string, index: number) => (
                  <div key={`${line}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3 text-sm text-stone-700">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-mono text-[13px] leading-relaxed">{line}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </PageFrame>
    </ProjectLockGuard>
  );
}

"use client";

import React from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
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
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import {
  ExportStatusResponse,
  SimulationLogEntry,
  SimulationRunResponse,
  getJobExportStatus,
  getJobSimulationLogs,
  getJobSimulationResult,
  listMigrationTargets,
  startJobSimulation,
  testSavedMigrationTarget,
} from "@/lib/api";

const idleSimulation: SimulationRunResponse = {
  id: null,
  project_id: null,
  source_job_id: "",
  target_id: null,
  mode: "dry_run",
  status: "idle",
  started_at: null,
  finished_at: null,
  summary: null,
  created_at: null,
  updated_at: null,
};

export default function SimulationPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const router = useRouter();
  const activeJobId = workspace.sourceStatus.active_job_id || "";
  const [selectedTarget, setSelectedTarget] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [pageError, setPageError] = React.useState<{ message: string; errorType?: string | null; hint?: string | null; technicalDetails?: string | null; target?: any } | null>(null);

  const targetsQuery = useSWR(
    ["simulation-targets", params.projectId],
    () => listMigrationTargets(params.projectId),
    {
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const exportStatusQuery = useSWR(
    activeJobId ? ["simulation-export-status", activeJobId] : null,
    () => getJobExportStatus(activeJobId),
    {
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const resultQuery = useSWR(
    activeJobId ? ["simulation-result", activeJobId] : null,
    () => getJobSimulationResult(activeJobId),
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      keepPreviousData: true,
      refreshInterval: (data) => {
        const status = data?.status;
        if (status === "pending" || status === "running") return 5000;
        return 0;
      },
    },
  );

  const logsQuery = useSWR(
    activeJobId ? ["simulation-logs", activeJobId] : null,
    () => getJobSimulationLogs(activeJobId, 20),
    {
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      keepPreviousData: true,
      refreshInterval: () => {
        const status = resultQuery.data?.status;
        if (status === "pending" || status === "running") return 5000;
        return 0;
      },
    },
  );

  React.useEffect(() => {
    if (!selectedTarget && targetsQuery.data?.[0]) {
      setSelectedTarget(targetsQuery.data[0].id);
    }
  }, [selectedTarget, targetsQuery.data]);

  const simulation = resultQuery.data || idleSimulation;
  const summary = simulation.summary;
  const selectedTargetRecord = targetsQuery.data?.find((target) => target.id === selectedTarget) || null;
  const failureTarget = summary?.target || pageError?.target || selectedTargetRecord;
  const exportArtifacts = (exportStatusQuery.data as ExportStatusResponse | undefined)?.artifacts;
  const hasStoredArtifact = Boolean(
    exportArtifacts?.manual_edits_version?.sql ||
      exportArtifacts?.cleaned_sql_version?.sql ||
      Object.values(exportArtifacts?.translated_sql_version || {}).some((value: any) => Boolean(value?.sql)),
  );
  const diffData = summary
    ? [
        { name: "Expected", value: summary.rows_expected || 0 },
        { name: "Inserted", value: summary.rows_inserted || 0 },
      ]
    : [];
  const tableResults = summary?.table_results || [];
  const logs = logsQuery.data || [];

  async function runSimulation() {
    if (!activeJobId || !selectedTarget || running || !hasStoredArtifact) return;
    setRunning(true);
    try {
      await startJobSimulation(activeJobId, { targetId: selectedTarget, mode: "dry-run" });
      setPageError(null);
      await Promise.all([resultQuery.mutate(), logsQuery.mutate()]);
    } catch (error: any) {
      setPageError({
        message: error?.message || error?.error || "Unable to load real data",
        errorType: error?.error_type || null,
        hint: error?.hint || null,
        technicalDetails: error?.technical_details || null,
        target: error?.target || selectedTargetRecord || null,
      });
    }
    setRunning(false);
  }

  async function handleRetestTarget() {
    if (!failureTarget?.id) return;
    try {
      const result = await testSavedMigrationTarget(params.projectId, failureTarget.id);
      if (result.success) {
        toast.success("Destination test passed");
      } else {
        toast.error(result.hint ? `${result.message || result.error}\n${result.hint}` : result.message || result.error || "Destination test failed");
      }
    } catch (error: any) {
      toast.error(error?.hint ? `${error.message}\n${error.hint}` : error?.message || "Destination test failed");
    }
  }

  if (!workspace.hasAnyJob && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader title={workspaceMeta.simulation.title} description={workspaceMeta.simulation.description} />
        <div className="mt-8">
          <EmptyState title="No source job available" description="A source upload and a destination target are required before dry-run simulation makes sense." />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspaceMeta.simulation.title}
          description="Execute the generated SQL in a safe sandbox against the selected live destination and compare inserted results against expected source counts."
          badge={<StatusBadge status={running ? "processing" : simulation.status || "idle"}>{running ? "running" : simulation.status || "idle"}</StatusBadge>}
          actions={
            <>
              <button
                className={workspaceActions.secondary}
                onClick={() => {
                  void Promise.all([workspace.reload(), targetsQuery.mutate(), resultQuery.mutate(), logsQuery.mutate()]);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={workspaceActions.primary} onClick={runSimulation} disabled={running || !selectedTarget || !activeJobId || !hasStoredArtifact}>
                <PlayCircle className="h-4 w-4" />
                {running ? "Running…" : "Run Simulation"}
              </button>
            </>
          }
        />

        <WorkspaceNote
          usingMockData={false}
          loading={workspace.loading || targetsQuery.isLoading || resultQuery.isLoading || logsQuery.isLoading}
          error={workspace.error || pageError?.message || (targetsQuery.error as any)?.message || (resultQuery.error as any)?.message || (logsQuery.error as any)?.message || (exportStatusQuery.error as any)?.message || null}
        />

        {((summary?.error_type === "target_connection_failed") || pageError?.errorType === "target_connection_failed") && failureTarget ? (
          <SectionCard title="Simulation could not reach the destination database" description="The saved destination and the simulation backend do not currently have a reachable connection path.">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Connection name</div>
                    <div className="mt-2 text-white">{failureTarget.name || "Unnamed destination"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Error type</div>
                    <div className="mt-2 text-white">{summary?.error_type || pageError?.errorType || "target_connection_failed"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Host</div>
                    <div className="mt-2 text-white">{failureTarget.host || "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Port</div>
                    <div className="mt-2 text-white">{failureTarget.port || "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Database</div>
                    <div className="mt-2 text-white">{failureTarget.database_name || "—"}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {summary?.message || pageError?.message || "The simulation backend cannot reach this destination database."}
                </div>
                {(summary?.hint || pageError?.hint || (failureTarget.host && ["localhost", "127.0.0.1", "::1"].includes(String(failureTarget.host).toLowerCase()))) ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {summary?.hint || pageError?.hint || "SQAuto runs from the backend server/container. localhost may not point to your local machine."}
                  </div>
                ) : null}
                {(summary?.errors?.length || pageError?.technicalDetails) ? (
                  <details className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    <summary className="cursor-pointer text-white">View technical details</summary>
                    <div className="mt-3 whitespace-pre-wrap break-words text-slate-400">{pageError?.technicalDetails || summary?.errors?.join("\n")}</div>
                  </details>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${params.projectId}/destination`)}>
                  Edit destination
                </button>
                <button className={workspaceActions.secondary} onClick={handleRetestTarget} disabled={!failureTarget?.id}>
                  Test connection again
                </button>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SectionCard title="Simulation Controls" description="Select a destination and run a non-destructive sandbox execution.">
            <div className="space-y-4">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Source job</span>
                <select className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-slate-100 outline-none" value={activeJobId} disabled>
                  <option value={activeJobId}>{workspace.sourceStatus.filename || "No data available yet"}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Destination</span>
                <select
                  value={selectedTarget}
                  onChange={(event) => setSelectedTarget(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-slate-100 outline-none"
                >
                  {targetsQuery.data?.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} · {target.host}:{target.port}
                    </option>
                  ))}
                </select>
              </label>
              {!targetsQuery.data?.length ? <EmptyState title="No data available yet" description="Save a live destination for this project before running simulation." /> : null}
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                Simulation uses stored export artifacts in strict priority: manual SQL, translated SQL for the selected target dialect, then clean SQL fallback.
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                Keep previous results on screen while refreshing. The page will only poll while a simulation is actively running.
              </div>
              {!hasStoredArtifact ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                  No stored SQL artifact is available for this job. Open Export, validate/store Clean SQL or Translated SQL first.
                  <div className="mt-3">
                    <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${params.projectId}/export`)}>
                      Open Export
                    </button>
                  </div>
                </div>
              ) : null}
              {selectedTargetRecord?.is_application_db ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  You are selecting the SQAuto application database as a simulation destination. This is allowed only for testing if simulation uses a temporary schema and cleanup is guaranteed. Do not use this for live migration.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="Status" value={summary?.status || simulation.status || "idle"} tone={summary?.status === "failed" ? "rose" : summary?.status === "partial" ? "amber" : "teal"} />
              <StatCard title="Tables Success / Failed" value={`${summary?.tables_success ?? 0} / ${summary?.tables_failed ?? 0}`} tone="teal" />
              <StatCard title="Rows Expected / Inserted" value={`${summary?.rows_expected ?? 0} / ${summary?.rows_inserted ?? 0}`} tone="blue" />
              <StatCard title="Execution Time" value={summary?.execution_time || "0s"} tone="violet" />
            </div>

            <SectionCard title="Diff Visualization" description="Expected source rows versus rows inserted into the temporary simulation schema.">
              {diffData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diffData}>
                      <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                      <Bar dataKey="value" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No data available yet" description="Run a simulation to generate expected versus inserted row comparisons." />
              )}
            </SectionCard>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <SectionCard title="Table Results" description="Per-table execution result and row comparison.">
                <DataTable
                  columns={[
                    { key: "table", label: "Table" },
                    { key: "expected_rows", label: "Expected" },
                    { key: "inserted_rows", label: "Inserted" },
                    {
                      key: "status",
                      label: "Status",
                      render: (row) => <StatusBadge status={row.status === "success" ? "completed" : row.status === "partial" ? "warning" : "failed"}>{row.status}</StatusBadge>,
                    },
                  ]}
                  rows={tableResults}
                />
              </SectionCard>

              <div className="space-y-6">
                <SectionCard title="Errors & Warnings" description="Structured execution failures and non-blocking warnings.">
                  <div className="space-y-3">
                    {(summary?.errors || []).map((error) => (
                      <div key={error} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {error}
                      </div>
                    ))}
                    {(summary?.warnings || []).map((warning) => (
                      <div key={warning} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {warning}
                      </div>
                    ))}
                    {!summary?.errors?.length && !summary?.warnings?.length ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">No data available yet</div>
                    ) : null}
                  </div>
                </SectionCard>

                <SectionCard title="Simulation Logs" description="Latest simulation log entries, limited for performance safety.">
                  <div className="space-y-2">
                    {logs.length > 0 ? (
                      logs.map((log: SimulationLogEntry) => (
                        <div key={log.id} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <StatusBadge status={log.level === "error" ? "failed" : log.level === "warning" ? "warning" : "completed"}>{log.level}</StatusBadge>
                            <span className="text-xs text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-200">{log.message}</div>
                          {log.table_name ? <div className="mt-1 text-xs text-slate-500">Table: {log.table_name}</div> : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">No data available yet</div>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

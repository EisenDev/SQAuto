"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlayCircle, RefreshCw } from "lucide-react";
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
import { listMigrationRuns, listMigrationTargets, startDryRun } from "@/lib/api";

export default function SimulationPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const [targets, setTargets] = React.useState<any[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [pageError, setPageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTargets() {
      try {
        const response = await listMigrationTargets(params.projectId);
        if (cancelled) return;
        setTargets(response);
        if (!selectedTarget && response[0]) setSelectedTarget(response[0].id);
        setPageError(null);
      } catch (error: any) {
        if (!cancelled) {
          setTargets([]);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }

    void loadTargets();
    return () => {
      cancelled = true;
    };
  }, [params.projectId, selectedTarget]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      if (!workspace.sourceStatus.active_job_id) {
        setRuns([]);
        return;
      }
      try {
        const response = await listMigrationRuns(workspace.sourceStatus.active_job_id);
        if (!cancelled) {
          setRuns(response);
          if (!result && response[0]) setResult(response[0]);
        }
      } catch {
        if (!cancelled) setRuns([]);
      }
    }

    void loadRuns();
    return () => {
      cancelled = true;
    };
  }, [result, workspace.sourceStatus.active_job_id]);

  const runSimulation = async () => {
    if (!workspace.sourceStatus.active_job_id || !selectedTarget) {
      return;
    }

    setRunning(true);
    try {
      const response = await startDryRun(workspace.sourceStatus.active_job_id, selectedTarget);
      setResult(response);
      setPageError(null);
    } catch (error: any) {
      setPageError(error?.message || "Unable to load real data");
    }
    setRunning(false);
  };

  const latestSummary = result?.summary || runs[0]?.summary || null;
  const diffData = (latestSummary?.row_count_comparison || []).slice(0, 6).map((item: any) => ({
    name: item.table,
    diff: Math.abs(Number(item.difference || 0)),
  }));

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
          description={workspaceMeta.simulation.description}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={workspaceActions.primary} onClick={runSimulation} disabled={running}>
                <PlayCircle className="h-4 w-4" />
                {running ? "Running…" : "Run Simulation"}
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <SectionCard title="Simulation Inputs" description="Select the current source and target destination">
            <div className="space-y-4">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Source job</span>
                <select className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-slate-100 outline-none">
                  <option value={workspace.sourceStatus.active_job_id || ""}>{workspace.sourceStatus.filename || "No data available yet"}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Destination</span>
                <select
                  value={selectedTarget}
                  onChange={(event) => setSelectedTarget(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-slate-100 outline-none"
                >
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </label>
              {targets.length === 0 ? <EmptyState title="No data available yet" description="Save a live destination for this project before running simulation." /> : null}
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                Simulations remain non-destructive. The current backend path only queues dry-run validation and uses preview summaries when live execution data is absent.
              </div>
            </div>
          </SectionCard>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard title="Tables Matched" value={latestSummary?.tables_checked ?? 0} tone="teal" />
              <StatCard title="Rows Diff" value={diffData.reduce((sum: number, item: any) => sum + item.diff, 0)} tone="amber" />
              <StatCard title="Warnings" value={latestSummary?.warnings_count ?? 0} tone="violet" />
            </div>

            <SectionCard title="Diff Chart" description="Estimated row variance by table">
              {diffData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diffData}>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                    <Bar dataKey="diff" fill="#2dd4bf" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              ) : (
                <EmptyState title="No data available yet" description="Run a real dry-run to generate row difference summaries." />
              )}
            </SectionCard>

            <SectionCard title="Simulation Result" description="Current dry-run summary and warnings">
              <DataTable
                columns={[
                  { key: "name", label: "Metric" },
                  { key: "value", label: "Value" },
                ]}
                rows={[
                  { name: "Matched tables", value: latestSummary?.tables_checked ?? 0 },
                  { name: "Missing in target", value: latestSummary?.tables_missing_in_target?.length ?? 0 },
                  { name: "Status", value: <StatusBadge status={running ? "processing" : (result?.status || runs[0]?.status || "idle")}>{running ? "Running" : (result?.status || runs[0]?.status || "idle")}</StatusBadge> },
                ]}
              />
              <div className="mt-4 space-y-2">
                {latestSummary?.tables_missing_in_target?.length ? latestSummary.tables_missing_in_target.map((warning: string) => (
                  <div key={warning} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                    {warning}
                  </div>
                )) : <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">No data available yet</div>}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

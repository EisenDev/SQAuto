"use client";

import React from "react";
import { CheckCircle2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  ProjectLockGuard,
  SectionCard,
  StatCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import { getJobMappingState } from "@/lib/api";

export default function MappingPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const [mappingState, setMappingState] = React.useState<any | null>(null);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [selectedTable, setSelectedTable] = React.useState("");
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!workspace.sourceStatus.active_job_id) {
        setMappingState(null);
        return;
      }
      try {
        const result = await getJobMappingState(workspace.sourceStatus.active_job_id);
        if (!cancelled) {
          setMappingState(result);
          setPageError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMappingState(null);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspace.sourceStatus.active_job_id]);

  const tables = mappingState?.tables || [];

  React.useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0].table);
    }
  }, [selectedTable, tables]);

  const table = tables.find((item: any) => item.table === selectedTable) || tables[0];
  const rows: Array<{ id: string; source: string; target: string; sourceType: string; status: string; compatibility: string }> = (table?.columns || []).map((column: any) => ({
    id: column.name,
    source: column.name,
    target: mapping[column.name] ?? table?.saved_mappings?.[column.name] ?? "",
    sourceType: column.type,
    status: mapping[column.name] === "" || (!mapping[column.name] && !table?.saved_mappings?.[column.name]) ? "idle" : "completed",
    compatibility: table?.type_compatibility?.[column.name] || "unknown",
  }));

  const mapped = rows.filter((row: { target: string }) => row.target).length;
  const unmapped = rows.filter((row: { target: string }) => !row.target).length;
  const conflicts = rows.filter((row: { compatibility: string }) => row.compatibility === "mismatch").length;

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <ProjectLockGuard projectId={params.projectId} allowedType="individual">
        <PageFrame>
          <PageHeader title={workspaceMeta.mapping.title} description={workspaceMeta.mapping.description} />
          <div className="mt-8">
            <EmptyState title="No schema available for mapping" description="An extracted source profile is required before column mapping can start." />
          </div>
        </PageFrame>
      </ProjectLockGuard>
    );
  }

  return (
    <ProjectLockGuard projectId={params.projectId} allowedType="individual">
      <PageFrame>
        <div className={workspacePageShell}>
          <PageHeader
            title={workspaceMeta.mapping.title}
            description={workspaceMeta.mapping.description}
            badge={<StatusBadge status={workspace.sourceStatus.status || "idle"} />}
            actions={
              <>
                <button className={workspaceActions.secondary} onClick={workspace.reload}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <button
                  className={`${workspaceActions.primary} opacity-60`}
                  disabled
                  onClick={() => {
                    toast.warning("Mapping persistence is not implemented yet");
                  }}
                >
                  <Save className="h-4 w-4" />
                  Save Mapping
                </button>
              </>
            }
          />

          <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard title="Mapped" value={mapped} tone="teal" />
            <StatCard title="Unmapped" value={unmapped} tone="blue" />
            <StatCard title="Type Conflicts" value={conflicts} tone="amber" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <SectionCard
              title="Mapping Table"
              description="Source column to target column bindings"
              action={
                <select
                  value={selectedTable}
                  onChange={(event) => setSelectedTable(event.target.value)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-500"
                >
                  {tables.map((item: any) => (
                    <option key={item.table} value={item.table}>
                      {item.table}
                    </option>
                  ))}
                </select>
              }
            >
              <DataTable
                columns={[
                  { key: "source", label: "Source Column" },
                  { key: "sourceType", label: "Type" },
                  {
                    key: "target",
                    label: "Target Column",
                    render: (row) => (
                      <input
                        value={mapping[row.source] ?? row.source}
                        onChange={(event) => setMapping((current) => ({ ...current, [row.source]: event.target.value }))}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-teal-500"
                      />
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => <StatusBadge status={row.status}>{row.status === "completed" ? "OK" : row.status === "warning" ? "Mismatch" : "Unmapped"}</StatusBadge>,
                  },
                ]}
                rows={rows}
              />
            </SectionCard>

            <SectionCard title="Suggestions" description="Real mapping state and target context">
              <div className="space-y-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 text-sm text-stone-600">
                  <div className="flex items-center gap-2 font-bold text-stone-900">
                    <CheckCircle2 className="h-4 w-4 text-teal-700" />
                    Target schema context: Export SQL structure or no live target selected.
                  </div>
                  <p className="mt-3 leading-relaxed font-medium">Saved mappings from the active job are shown in the table. No AI suggestions are generated unless a real mapping API returns them.</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </PageFrame>
    </ProjectLockGuard>
  );
}

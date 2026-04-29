"use client";

import React from "react";
import { CheckCircle2, RefreshCw, Save } from "lucide-react";
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
} from "@/components/workspace/project-workspace";

export default function MappingPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const tables = workspace.tables;
  const [selectedTable, setSelectedTable] = React.useState("");
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0].name);
    }
  }, [selectedTable, tables]);

  const table = tables.find((item) => item.name === selectedTable) || tables[0];
  const rows = (table?.columns || []).map((column) => ({
    id: column.name,
    source: column.name,
    target: mapping[column.name] ?? column.name,
    sourceType: column.type,
    status: mapping[column.name] === "" ? "unmapped" : mapping[column.name] && mapping[column.name] !== column.name ? "warning" : "completed",
  }));

  const mapped = rows.filter((row) => row.target).length;
  const unmapped = rows.filter((row) => !row.target).length;
  const conflicts = rows.filter((row) => row.sourceType.includes("numeric") || row.sourceType.includes("timestamp")).length;

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader title={workspaceMeta.mapping.title} description={workspaceMeta.mapping.description} />
        <div className="mt-8">
          <EmptyState title="No schema available for mapping" description="An extracted source profile is required before column mapping can start." />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={workspaceMeta.mapping.title}
          description={workspaceMeta.mapping.description}
          badge={<StatusBadge status={workspace.usingMockData ? "mock" : workspace.sourceStatus.status || "idle"} />}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                className={workspaceActions.primary}
                onClick={() => {
                  localStorage.setItem(`sqauto-mapping-${params.projectId}`, JSON.stringify(mapping));
                  toast.success("Mapping saved locally");
                }}
              >
                <Save className="h-4 w-4" />
                Save Mapping
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

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
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none"
              >
                {tables.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none"
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

          <SectionCard title="Suggestions" description="Mock AI-assisted recommendations">
            <div className="space-y-3">
              {workspace.mappingSuggestions.map((suggestion) => (
                <div key={suggestion.source} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{suggestion.source}</div>
                      <div className="mt-1 text-sm text-slate-400">{suggestion.target}</div>
                    </div>
                    <StatusBadge status="mock">{suggestion.confidence}</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{suggestion.reason}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-teal-300" />
                  Save mapping state before moving to export or simulation.
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}

"use client";

import React from "react";
import { Database, Filter, RefreshCw, Search, UploadCloud } from "lucide-react";
import { safeFetch } from "@/lib/api_client";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
} from "@/components/workspace/project-workspace";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ExplorerPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [tableSearch, setTableSearch] = React.useState("");
  const [rowSearch, setRowSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [preview, setPreview] = React.useState<{ columns: string[]; rows: Record<string, unknown>[]; total: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  React.useEffect(() => {
    if (!selectedTable && workspace.tables.length > 0) {
      setSelectedTable(workspace.tables[0].name);
    }
  }, [selectedTable, workspace.tables]);

  const filteredTables = React.useMemo(
    () => workspace.tables.filter((table) => table.name.toLowerCase().includes(tableSearch.toLowerCase())),
    [workspace.tables, tableSearch],
  );

  const selected = workspace.tables.find((table) => table.name === selectedTable) || filteredTables[0];

  React.useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!selected || !workspace.activeJob?.id) {
        setPreview(
          selected
            ? {
                columns: selected.columns.map((column) => column.name),
                rows: selected.sampleRows,
                total: selected.rowCount,
              }
            : null,
        );
        return;
      }

      setLoadingPreview(true);
      const offset = (page - 1) * 25;
      const search = rowSearch ? `&q=${encodeURIComponent(rowSearch)}` : "";
      const response = await safeFetch(`${API_URL}/explorer/${workspace.activeJob.id}/table/${selected.name}/data?limit=25&offset=${offset}${search}`);
      if (cancelled) return;

      if (response.success && response.data) {
        setPreview(response.data);
      } else {
        setPreview({
          columns: selected.columns.map((column) => column.name),
          rows: selected.sampleRows,
          total: selected.rowCount,
        });
      }
      setLoadingPreview(false);
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [page, rowSearch, selected, workspace.activeJob]);

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader title={workspaceMeta.explorer.title} description={workspaceMeta.explorer.description} />
        <div className="mt-8">
          <EmptyState
            title="No tables available yet"
            description="Complete a source upload and extraction cycle to browse staged tables in the truth explorer."
            action={
              <button className={workspaceActions.primary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                <UploadCloud className="h-4 w-4" />
                Upload SQL dump
              </button>
            }
          />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={workspaceMeta.explorer.title}
          description={workspaceMeta.explorer.description}
          badge={<StatusBadge status={workspace.usingMockData ? "mock" : workspace.sourceStatus.status || "idle"} />}
          actions={
            <button className={workspaceActions.secondary} onClick={workspace.reload}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
          <SectionCard title="Tables" description="Search and select extracted tables">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search tables"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none transition focus:border-teal-400/40"
                />
              </div>
              <div className="space-y-2">
                {filteredTables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => {
                      setSelectedTable(table.name);
                      setPage(1);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selected?.name === table.name
                        ? "border-teal-400/30 bg-teal-400/10 text-white"
                        : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="font-medium">{table.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{table.rowCount.toLocaleString()} rows</div>
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={selected?.name || "Table Preview"}
            description="Supabase-style sample grid over staged source data"
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={rowSearch}
                    onChange={(event) => {
                      setRowSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search rows"
                    className="w-52 rounded-xl border border-white/10 bg-slate-950/70 py-2 pl-10 pr-3 text-sm text-slate-200 outline-none transition focus:border-teal-400/40"
                  />
                </div>
                <button className={workspaceActions.secondary}>
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
              </div>
            }
          >
            {selected && preview ? (
              <div className="space-y-4">
                <DataTable
                  columns={(preview.columns || selected.columns.map((column) => column.name)).map((column) => ({
                    key: column,
                    label: column,
                    render: (row) => <span className="font-mono text-[13px]">{String(row[column] ?? "NULL")}</span>,
                  }))}
                  rows={preview.rows || []}
                />
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{loadingPreview ? "Loading preview…" : `${preview.total.toLocaleString()} total rows`}</span>
                  <div className="flex items-center gap-2">
                    <button className={workspaceActions.secondary} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                      Prev
                    </button>
                    <span>Page {page}</span>
                    <button className={workspaceActions.secondary} onClick={() => setPage((current) => current + 1)}>
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No tables available yet" description="Select a staged table from the left panel to inspect its preview rows." />
            )}
          </SectionCard>

          <SectionCard title="Table Metadata" description="Column types, keys, and relation hints">
            {selected ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Row count</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selected.rowCount.toLocaleString()}</div>
                </div>
                {selected.columns.map((column) => (
                  <div key={column.name} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-white">{column.name}</div>
                      <StatusBadge status={column.primary ? "completed" : column.foreign ? "warning" : "idle"}>
                        {column.primary ? "PK" : column.foreign ? "FK" : "Column"}
                      </StatusBadge>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">{column.type}</div>
                    {column.foreign ? <div className="mt-2 text-xs text-slate-500">References {column.foreign}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Database} title="No table selected" description="Choose a table to inspect column metadata and relation hints." />
            )}
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}

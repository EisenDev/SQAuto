"use client";

import React from "react";
import { Database, Filter, RefreshCw, Search, UploadCloud } from "lucide-react";
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
  workspacePageShell,
  workspaceViewportHeight,
} from "@/components/workspace/project-workspace";
import { getJobTableColumns, getJobTableRows, getJobTables, WorkspaceColumn, WorkspaceTableSummary } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function ExplorerPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [tableSearch, setTableSearch] = React.useState("");
  const [rowSearch, setRowSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedTable, setSelectedTable] = React.useState<string>("");
  const [tables, setTables] = React.useState<WorkspaceTableSummary[]>([]);
  const [columns, setColumns] = React.useState<WorkspaceColumn[]>([]);
  const [preview, setPreview] = React.useState<{ columns: WorkspaceColumn[]; rows: Record<string, unknown>[]; total: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTables() {
      if (!workspace.sourceStatus.active_job_id) {
        setTables([]);
        setPageError(null);
        return;
      }
      try {
        const result = await getJobTables(workspace.sourceStatus.active_job_id);
        if (!cancelled) {
          setTables(result);
          setPageError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setTables([]);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }

    void loadTables();
    return () => {
      cancelled = true;
    };
  }, [workspace.sourceStatus.active_job_id]);

  React.useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0].name);
    }
  }, [selectedTable, tables]);

  const filteredTables = React.useMemo(
    () => tables.filter((table) => table.name.toLowerCase().includes(tableSearch.toLowerCase())),
    [tables, tableSearch],
  );

  const selected = tables.find((table) => table.name === selectedTable) || filteredTables[0];

  React.useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!selected || !workspace.activeJob?.id) {
        setPreview(null);
        setColumns([]);
        return;
      }

      setLoadingPreview(true);
      try {
        const offset = (page - 1) * 50;
        const [rowsResult, columnsResult] = await Promise.all([
          getJobTableRows(workspace.activeJob.id, selected.name, 50, offset, rowSearch),
          getJobTableColumns(workspace.activeJob.id, selected.name),
        ]);
        if (cancelled) return;
        setColumns(columnsResult);
        setPreview({
          columns: rowsResult.columns,
          rows: rowsResult.rows,
          total: rowsResult.total_estimate,
        });
        setPageError(null);
      } catch (error: any) {
        if (!cancelled) {
          setPreview(null);
          setColumns([]);
          setPageError(error?.message || "Unable to load real data");
        }
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
      <div className={workspacePageShell}>
        <PageHeader
          title={workspaceMeta.explorer.title}
          description={workspaceMeta.explorer.description}
          badge={<StatusBadge status={workspace.sourceStatus.status || "idle"} />}
          actions={
            <button className={workspaceActions.secondary} onClick={workspace.reload}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading || loadingPreview} error={workspace.error || pageError} />

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <SectionCard title="Tables" description="Search and select extracted tables">
            <div className={`flex flex-col space-y-4 ${workspaceViewportHeight} overflow-hidden`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search tables"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none transition focus:border-teal-400/40"
                />
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
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
                    <div className="mt-1 text-xs text-slate-500">{table.row_count.toLocaleString()} rows</div>
                  </button>
                ))}
                {filteredTables.length === 0 ? <EmptyState title="No data available yet" description="No extracted tables are available for this project." /> : null}
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
              <div className={`flex h-full flex-col space-y-4 ${workspaceViewportHeight} overflow-hidden`}>
                <DataTable
                  className="flex-1"
                  columns={preview.columns.map((column) => ({
                    key: column.name,
                    label: column.name,
                    render: (row) => <span className="font-mono text-[13px]">{String(row[column.name] ?? "NULL")}</span>,
                  }))}
                  rows={preview.rows || []}
                />
                <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4 text-sm text-slate-400">
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
              <EmptyState title="No data available yet" description="Select a staged table from the left panel to inspect its preview rows." />
            )}
          </SectionCard>

          <SectionCard title="Table Metadata" description="Column types, keys, and relation hints">
            {selected ? (
              <div className={`space-y-3 ${workspaceViewportHeight} overflow-y-auto pb-16 pr-1`}>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Row count</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selected.row_count.toLocaleString()}</div>
                </div>
                {columns.map((column) => (
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

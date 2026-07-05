"use client";

import React from "react";
import { Database, Filter, RefreshCw, Search, UploadCloud } from "lucide-react";
import {
  EmptyState,
  PageFrame,
  PageHeader,
  ProjectLockGuard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import { getJobTableColumns, getJobTableRows, getJobTables, WorkspaceColumn, WorkspaceTableSummary } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function ExplorerPage() {
  const ROWS_PER_PAGE = 20;
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
  const selectedTableName = selected?.name || null;
  const activeJobId = workspace.activeJob?.id || null;

  React.useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!selectedTableName || !activeJobId) {
        setPreview(null);
        setColumns([]);
        return;
      }

      setLoadingPreview(true);
      try {
        const offset = (page - 1) * ROWS_PER_PAGE;
        const [rowsResult, columnsResult] = await Promise.all([
          getJobTableRows(activeJobId, selectedTableName, ROWS_PER_PAGE, offset, rowSearch),
          getJobTableColumns(activeJobId, selectedTableName),
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

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [activeJobId, page, rowSearch, selectedTableName]);

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="individual">
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
      </ProjectLockGuard>
    );
  }

  return (
    <ProjectLockGuard projectId={projectId} allowedType="individual">
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

          {/* Unified Visual Plane Container */}
          <div className="flex flex-col xl:flex-row bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-premium h-[calc(100vh-16rem)] min-h-[36rem]">
            
            {/* Left Sidebar (Table List) */}
            <div className="w-full xl:w-[280px] xl:shrink-0 border-r-[0.5px] border-stone-200 bg-white flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b-[0.5px] border-stone-200 bg-white flex flex-col space-y-3 shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Tables</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <input
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                    placeholder="Search tables..."
                    className="w-full rounded-xl border-0 bg-stone-100/80 py-2.5 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 outline-none transition focus:bg-stone-100"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredTables.map((table) => {
                  const isSelected = selected?.name === table.name;
                  return (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table.name);
                        setPage(1);
                      }}
                      className={`w-full px-4 py-3 text-left transition flex items-center justify-between border-b-[0.5px] border-stone-100 last:border-b-0 ${
                        isSelected
                          ? "bg-[#E1F5EE] text-[#085041]"
                          : "bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <span className={`text-[13px] truncate pr-2 ${isSelected ? "font-medium" : "font-normal"}`}>
                        {table.name}
                      </span>
                      <span className={`text-[11px] shrink-0 ${isSelected ? "text-[#0F6E56]" : "text-stone-400"}`}>
                        {table.row_count.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
                {filteredTables.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400">
                    No matching tables found.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Center Data Grid */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-white relative">
              <div className="p-4 border-b-[0.5px] border-stone-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <h2 className="text-sm font-bold text-stone-850">{selected?.name || "Table Preview"}</h2>
                  {selected && (
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-semibold">
                      {preview ? `${preview.total.toLocaleString()} rows` : "Preview"}
                    </span>
                  )}
                </div>
                {selected && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-52">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                      <input
                        value={rowSearch}
                        onChange={(event) => {
                          setRowSearch(event.target.value);
                          setPage(1);
                        }}
                        placeholder="Search rows..."
                        className="w-full rounded-xl border-0 bg-stone-100/80 py-1.5 pl-9 pr-3 text-xs text-stone-850 placeholder-stone-400 outline-none transition focus:bg-stone-100"
                      />
                    </div>
                    <button className={workspaceActions.secondary + " !py-1.5 !px-3 !text-xs"}>
                      <Filter className="h-3.5 w-3.5" />
                      Filter
                    </button>
                  </div>
                )}
              </div>

              {selected && preview ? (
                <div className="flex-grow flex flex-col min-h-0 overflow-hidden relative">
                  {loadingPreview && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                      <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
                    </div>
                  )}

                  <div className="flex-grow overflow-auto">
                    {preview.rows && preview.rows.length > 0 ? (
                      <table className="min-w-full divide-y divide-stone-200/60 table-auto border-collapse">
                        <thead className="sticky top-0 z-10 bg-stone-50">
                          <tr className="border-b-[0.5px] border-stone-200">
                            {preview.columns.map((column) => (
                              <th
                                key={column.name}
                                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500 bg-stone-50"
                              >
                                {column.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                          {preview.rows.map((row, index) => (
                            <tr key={index} className="transition-colors hover:bg-stone-50/50">
                              {preview.columns.map((column) => (
                                <td key={column.name} className="px-4 py-2.5 text-[13px] text-stone-600 border-b-[0.5px] border-stone-100 font-mono truncate max-w-[240px]" title={String(row[column.name] ?? "NULL")}>
                                  {String(row[column.name] ?? "NULL")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                        <Database className="w-5 h-5 text-stone-400 mb-2" />
                        <span className="text-xs text-stone-500">No records found.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t-[0.5px] border-stone-200 bg-white px-4 py-3 text-xs text-stone-500 shrink-0">
                    <span>{`${preview.total.toLocaleString()} total rows`}</span>
                    <div className="flex items-center gap-1">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        Prev
                      </button>
                      <span className="px-3 text-stone-700 font-medium">Page {page}</span>
                      <button
                        className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        disabled={preview.total <= page * ROWS_PER_PAGE}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-white">
                  <Database className="w-5 h-5 text-stone-400 mb-2" />
                  <span className="text-xs text-stone-500">Select a staged table from the left panel to inspect its preview rows.</span>
                </div>
              )}
            </div>

            {/* Right Metadata Panel */}
            <div className="w-full xl:w-[300px] xl:shrink-0 border-l-[0.5px] border-stone-200 bg-white flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b-[0.5px] border-stone-200 bg-white shrink-0">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Table Metadata</div>
                <div className="text-[11px] text-stone-400 mt-1">Column types, keys, and relations</div>
              </div>

              {selected ? (
                <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-16">
                  {/* Metric Card for Row Count */}
                  <div className="rounded-xl bg-stone-100/60 p-4 border border-stone-200/40">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Row count</div>
                    <div className="mt-1 text-2xl font-bold text-stone-850">{selected.row_count.toLocaleString()}</div>
                  </div>

                  <div className="space-y-3">
                    {columns.map((column) => (
                      <div key={column.name} className="rounded-xl border border-stone-200/60 bg-white p-3 flex flex-col space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-medium text-stone-850 truncate" title={column.name}>{column.name}</div>
                          {column.primary ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#E1F5EE] text-[#085041] uppercase tracking-wide">
                              PK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-stone-100 text-stone-600 uppercase tracking-wide">
                              {column.foreign ? "FK" : "Col"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono">{column.type}</div>
                        {column.foreign ? (
                          <div className="text-[10px] text-stone-500 mt-1 italic border-t border-stone-100/60 pt-1">
                            References {column.foreign}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                  <Database className="w-5 h-5 text-stone-400 mb-2" />
                  <span className="text-xs text-stone-500">Choose a table to inspect column metadata and relation hints.</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </PageFrame>
    </ProjectLockGuard>
  );
}

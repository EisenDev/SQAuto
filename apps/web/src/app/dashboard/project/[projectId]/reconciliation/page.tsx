"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  X, 
  RefreshCw, 
  Database, 
  Server, 
  Search, 
  HelpCircle,
  ArrowRight
} from "lucide-react";
import {
  PageFrame,
  PageHeader,
  ProjectLockGuard,
  StatCard,
  useProjectWorkspaceData,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
  EmptyState
} from "@/components/workspace/project-workspace";
import { 
  getJobTables, 
  getJobTableRows, 
  getJobTableColumns, 
  listMigrationTargets, 
  getTargetTableRows, 
  WorkspaceTableSummary, 
  WorkspaceColumn,
  MigrationTarget
} from "@/lib/api";

interface ScanField {
  column: string;
  valA: any;
  valB: any;
  match: boolean;
}

interface ScanResult {
  id: string;
  dbAExists: boolean;
  dbBExists: boolean;
  fields: ScanField[];
  mismatchesCount: number;
}

export default function ReconciliationPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;

  // Workspace hooks
  const workspace = useProjectWorkspaceData(projectId);
  const activeJobId = workspace.activeJob?.id || workspace.sourceStatus.active_job_id;

  // State
  const [tables, setTables] = useState<WorkspaceTableSummary[]>([]);
  const [selectedTableA, setSelectedTableA] = useState<string>("");
  const [selectedTableB, setSelectedTableB] = useState<string>("");
  const [overriddenB, setOverriddenB] = useState<boolean>(false);
  
  const [targets, setTargets] = useState<MigrationTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<MigrationTarget | null>(null);
  const [secondJobId, setSecondJobId] = useState<string | null>(null);

  // ID tags states
  const [idsA, setIdsA] = useState<string[]>([]);
  const [idsB, setIdsB] = useState<string[]>([]);
  const [inputA, setInputA] = useState<string>("");
  const [inputB, setInputB] = useState<string>("");

  // Scan state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [selectedCompareId, setSelectedCompareId] = useState<string>("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [showOnlyMismatches, setShowOnlyMismatches] = useState<boolean>(true);

  // Load tables & connections
  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      if (!activeJobId) return;

      try {
        const [tablesList, targetsList] = await Promise.all([
          getJobTables(activeJobId),
          listMigrationTargets(projectId)
        ]);

        if (cancelled) return;

        setTables(tablesList);
        if (tablesList.length > 0) {
          setSelectedTableA(tablesList[0].name);
          if (!overriddenB) {
            setSelectedTableB(tablesList[0].name);
          }
        }

        setTargets(targetsList);
        if (targetsList.length > 0) {
          setSelectedTarget(targetsList[0]);
        }

        // Find second job if available (for staged dump B option)
        const activeJobIdStr = String(activeJobId);
        const secondJob = workspace.jobs.find(j => String(j.id) !== activeJobIdStr && j.status === 'completed');
        if (secondJob) {
          setSecondJobId(secondJob.id);
        }
      } catch (err: any) {
        if (!cancelled) {
          setPageError(err?.message || "Failed to load project details.");
        }
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [activeJobId, projectId, workspace.jobs]);

  // Sync selectedTableA to selectedTableB if B was not overridden
  const handleTableAChange = (tableName: string) => {
    setSelectedTableA(tableName);
    if (!overriddenB) {
      setSelectedTableB(tableName);
    }
  };

  const handleTableBChange = (tableName: string) => {
    setSelectedTableB(tableName);
    setOverriddenB(true);
  };

  // Tag Add / Remove handlers
  const addTagA = () => {
    const trimmed = inputA.trim();
    if (trimmed && !idsA.includes(trimmed)) {
      setIdsA([...idsA, trimmed]);
    }
    setInputA("");
  };

  const addTagB = () => {
    const trimmed = inputB.trim();
    if (trimmed && !idsB.includes(trimmed)) {
      setIdsB([...idsB, trimmed]);
    }
    setInputB("");
  };

  const removeTagA = (tag: string) => {
    setIdsA(idsA.filter(t => t !== tag));
  };

  const removeTagB = (tag: string) => {
    setIdsB(idsB.filter(t => t !== tag));
  };

  // Run the reconciliation scan
  const startScan = async () => {
    const unionIds = Array.from(new Set([...idsA, ...idsB]));
    if (unionIds.length === 0) {
      setPageError("Please add at least one ID to DB A or DB B to compare.");
      return;
    }
    if (!selectedTableA || !selectedTableB) {
      setPageError("Please select tables for comparison.");
      return;
    }

    setIsScanning(true);
    setPageError(null);
    const resultsMap: Record<string, ScanResult> = {};

    try {
      // Fetch columns definitions for schema outline
      const [colsA, colsB] = await Promise.all([
        getJobTableColumns(activeJobId!, selectedTableA),
        selectedTarget 
          ? Promise.resolve([]) // Target DB columns fetched on query row response
          : secondJobId 
            ? getJobTableColumns(secondJobId, selectedTableB)
            : getJobTableColumns(activeJobId!, selectedTableB)
      ]);

      const primaryKeyColA = colsA.find(c => c.primary)?.name || colsA[0]?.name || "id";

      // Process each ID in parallel
      await Promise.all(
        unionIds.map(async (id) => {
          let rowA: Record<string, any> | null = null;
          let rowB: Record<string, any> | null = null;
          let columnsList = colsA.map(c => c.name);

          // 1. Fetch DB A row
          try {
            const resA = await getJobTableRows(activeJobId!, selectedTableA, 10, 0, id);
            // Match target ID precisely in PK or any column
            rowA = resA.rows.find(r => String(r[primaryKeyColA] || "") === id) || resA.rows[0] || null;
          } catch (e) {
            console.error(`Failed to fetch DB A row for ID ${id}`, e);
          }

          const idForB = rowA ? String(rowA[primaryKeyColA] || id) : id;

          // 2. Fetch DB B row
          try {
            if (selectedTarget) {
              const resB = await getTargetTableRows(selectedTarget.id, selectedTableB, 10, 0, idForB);
              const pkColB = resB.columns.find((c: any) => c.primary)?.name || resB.columns[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === idForB) || resB.rows[0] || null;
              
              // Merge column names
              const targetCols = resB.columns.map((c: any) => c.name);
              columnsList = Array.from(new Set([...columnsList, ...targetCols]));
            } else if (secondJobId) {
              const resB = await getJobTableRows(secondJobId, selectedTableB, 10, 0, idForB);
              const pkColB = colsB.find(c => c.primary)?.name || colsB[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === idForB) || resB.rows[0] || null;
            } else {
              // Fallback to activeJobId (DB A)
              const resB = await getJobTableRows(activeJobId!, selectedTableB, 10, 0, idForB);
              const pkColB = colsB.find(c => c.primary)?.name || colsB[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === idForB) || resB.rows[0] || null;
            }
          } catch (e) {
            console.error(`Failed to fetch DB B row for ID ${id}`, e);
          }

          // 3. Compare field by field
          const fields: ScanField[] = [];
          let mismatches = 0;

          const dbAExists = !!rowA;
          const dbBExists = !!rowB;

          if (!dbAExists || !dbBExists) {
            // Whole row missing counts as mismatches
            columnsList.forEach(col => {
              const valA = dbAExists ? rowA![col] : "— not found —";
              const valB = dbBExists ? rowB![col] : "— not found —";
              fields.push({
                column: col,
                valA,
                valB,
                match: false
              });
              mismatches++;
            });
          } else {
            columnsList.forEach(col => {
              const valA = rowA![col];
              const valB = rowB![col];

              // Normalizing comparison for objects/nulls
              const strA = valA === null || valA === undefined ? "" : typeof valA === "object" ? JSON.stringify(valA) : String(valA);
              const strB = valB === null || valB === undefined ? "" : typeof valB === "object" ? JSON.stringify(valB) : String(valB);

              const isMatch = strA === strB;
              if (!isMatch) mismatches++;

              fields.push({
                column: col,
                valA: valA === null ? "NULL" : String(valA),
                valB: valB === null ? "NULL" : String(valB),
                match: isMatch
              });
            });
          }

          resultsMap[id] = {
            id,
            dbAExists,
            dbBExists,
            fields,
            mismatchesCount: mismatches
          };
        })
      );

      setScanResults(resultsMap);
      if (unionIds.length > 0) {
        setSelectedCompareId(unionIds[0]);
      }
      setHasScanned(true);
    } catch (err: any) {
      setPageError(err?.message || "Scan failed. Please check table selections and ID formats.");
    } finally {
      setIsScanning(false);
    }
  };

  // Run automatic scan of first 100 rows to find mismatched records
  const autoScanMismatches = async () => {
    if (!selectedTableA || !selectedTableB) {
      setPageError("Please select tables for comparison.");
      return;
    }

    setIsScanning(true);
    setPageError(null);
    const resultsMap: Record<string, ScanResult> = {};

    try {
      // Fetch columns definitions for schema outline
      const [colsA, colsB] = await Promise.all([
        getJobTableColumns(activeJobId!, selectedTableA),
        selectedTarget 
          ? Promise.resolve([]) // Target DB columns fetched on query row response
          : secondJobId 
            ? getJobTableColumns(secondJobId, selectedTableB)
            : getJobTableColumns(activeJobId!, selectedTableB)
      ]);

      const primaryKeyColA = colsA.find(c => c.primary)?.name || colsA[0]?.name || "id";

      // Fetch a sample of rows from DB A (limit to 100)
      const resA = await getJobTableRows(activeJobId!, selectedTableA, 100, 0);
      const rowsA = resA.rows;

      if (rowsA.length === 0) {
        setPageError("No rows found in DB A table to compare.");
        setIsScanning(false);
        return;
      }

      // Collect all PK values of these rows
      const pkValues = rowsA.map(r => String(r[primaryKeyColA] || ""));

      // Populate tags for both sides
      setIdsA(pkValues);
      setIdsB(pkValues);

      // Compare each row in parallel
      await Promise.all(
        pkValues.map(async (id) => {
          const rowA = rowsA.find(r => String(r[primaryKeyColA] || "") === id) || null;
          let rowB: Record<string, any> | null = null;
          let columnsList = colsA.map(c => c.name);

          // Fetch DB B row
          try {
            if (selectedTarget) {
              const resB = await getTargetTableRows(selectedTarget.id, selectedTableB, 10, 0, id);
              const pkColB = resB.columns.find((c: any) => c.primary)?.name || resB.columns[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === id) || resB.rows[0] || null;
              
              // Merge column names
              const targetCols = resB.columns.map((c: any) => c.name);
              columnsList = Array.from(new Set([...columnsList, ...targetCols]));
            } else if (secondJobId) {
              const resB = await getJobTableRows(secondJobId, selectedTableB, 10, 0, id);
              const pkColB = colsB.find(c => c.primary)?.name || colsB[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === id) || resB.rows[0] || null;
            } else {
              // Fallback to activeJobId
              const resB = await getJobTableRows(activeJobId!, selectedTableB, 10, 0, id);
              const pkColB = colsB.find(c => c.primary)?.name || colsB[0]?.name || "id";
              rowB = resB.rows.find(r => String(r[pkColB] || "") === id) || resB.rows[0] || null;
            }
          } catch (e) {
            console.error(`Failed to fetch DB B row for ID ${id}`, e);
          }

          // Compare field by field
          const fields: ScanField[] = [];
          let mismatches = 0;

          const dbAExists = !!rowA;
          const dbBExists = !!rowB;

          if (!dbAExists || !dbBExists) {
            columnsList.forEach(col => {
              const valA = dbAExists ? rowA![col] : "— not found —";
              const valB = dbBExists ? rowB![col] : "— not found —";
              fields.push({
                column: col,
                valA,
                valB,
                match: false
              });
              mismatches++;
            });
          } else {
            columnsList.forEach(col => {
              const valA = rowA![col];
              const valB = rowB![col];

              // Normalizing comparison
              const strA = valA === null || valA === undefined ? "" : typeof valA === "object" ? JSON.stringify(valA) : String(valA);
              const strB = valB === null || valB === undefined ? "" : typeof valB === "object" ? JSON.stringify(valB) : String(valB);

              const isMatch = strA === strB;
              if (!isMatch) mismatches++;

              fields.push({
                column: col,
                valA: valA === null ? "NULL" : String(valA),
                valB: valB === null ? "NULL" : String(valB),
                match: isMatch
              });
            });
          }

          resultsMap[id] = {
            id,
            dbAExists,
            dbBExists,
            fields,
            mismatchesCount: mismatches
          };
        })
      );

      setScanResults(resultsMap);
      
      // Select the first mismatched ID if we have some, otherwise the first overall ID
      const mismatchedIds = Object.keys(resultsMap).filter(id => resultsMap[id].mismatchesCount > 0);
      if (mismatchedIds.length > 0) {
        setSelectedCompareId(mismatchedIds[0]);
      } else if (pkValues.length > 0) {
        setSelectedCompareId(pkValues[0]);
      }
      setHasScanned(true);
    } catch (err: any) {
      setPageError(err?.message || "Auto-scan failed. Please check table selections.");
    } finally {
      setIsScanning(false);
    }
  };

  // Calculations for stats
  const totals = useMemo(() => {
    let columnsCompared = 0;
    let mismatchesFound = 0;
    let matchingFields = 0;
    const idsList = Object.keys(scanResults);

    idsList.forEach(id => {
      const res = scanResults[id];
      columnsCompared = Math.max(columnsCompared, res.fields.length);
      res.fields.forEach(f => {
        if (f.match) {
          matchingFields++;
        } else {
          mismatchesFound++;
        }
      });
    });

    return {
      columnsCompared,
      mismatchesFound,
      matchingFields,
      idsCompared: idsList.length
    };
  }, [scanResults]);

  // Total mismatched IDs count
  const totalMismatchedIdsCount = useMemo(() => {
    return Object.values(scanResults).filter(r => r.mismatchesCount > 0).length;
  }, [scanResults]);

  const activeResult = scanResults[selectedCompareId] || null;

  const filteredResults = useMemo(() => {
    const list = Object.values(scanResults);
    const hasMismatches = list.some(r => r.mismatchesCount > 0);
    if (showOnlyMismatches && hasMismatches) {
      return list.filter(r => r.mismatchesCount > 0);
    }
    return list;
  }, [scanResults, showOnlyMismatches]);

  // Update selectedCompareId if it's not in filteredResults anymore
  useEffect(() => {
    if (filteredResults.length > 0) {
      const exists = filteredResults.some(r => r.id === selectedCompareId);
      if (!exists) {
        setSelectedCompareId(filteredResults[0].id);
      }
    }
  }, [filteredResults, selectedCompareId]);

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="individual">
        <PageFrame>
          <PageHeader 
            title="Row Reconciliation" 
            description="Select a table, enter IDs from each database, then scan for mismatches." 
          />
          <div className="mt-8">
            <EmptyState
              title="No staging schema extracted yet"
              description="Upload a SQL dump and trigger staging extraction before performing row-level reconciliation."
              action={
                <button 
                  className={workspaceActions.primary} 
                  onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}
                >
                  Go to SQL Upload
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
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-brand-border pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Row Reconciliation</h1>
                {hasScanned && (
                  totalMismatchedIdsCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-600/10">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {totalMismatchedIdsCount} mismatches
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/10">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      All matched
                    </span>
                  )
                )}
              </div>
              <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                Select a table, enter IDs from each database, then scan for mismatches
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={autoScanMismatches}
                disabled={isScanning || tables.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-850 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Auto-scan Table Rows
                  </>
                )}
              </button>

              <button
                onClick={startScan}
                disabled={isScanning || tables.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Compare Manual IDs
                  </>
                )}
              </button>
            </div>
          </div>

          {pageError && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{pageError}</span>
            </div>
          )}

          {/* Config Panels Row */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-stretch">
            {/* DB A (Teal) */}
            <div className="lg:col-span-5 rounded-3xl border border-brand-border bg-white shadow-premium overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-teal-50/80 border-b border-teal-100/50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-teal-600" />
                    <span className="font-bold text-teal-950">DB A (Staging)</span>
                  </div>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    Source Staging
                  </span>
                </div>
                
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Table Name</label>
                    <select
                      value={selectedTableA}
                      onChange={(e) => handleTableAChange(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-stone-50 px-4 py-3 text-sm text-text-primary transition focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      {tables.map((table) => (
                        <option key={table.name} value={table.name}>
                          {table.name} ({table.row_count} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Compare IDs</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter ID (e.g. 1)"
                        value={inputA}
                        onChange={(e) => setInputA(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTagA())}
                        className="flex-1 rounded-xl border border-brand-border bg-stone-50 px-4 py-3 text-sm text-text-primary transition focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                      <button
                        onClick={addTagA}
                        className="inline-flex items-center justify-center rounded-xl bg-teal-600 p-3 text-white hover:bg-teal-700"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {idsA.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 pl-3 pr-1.5 py-1 text-xs font-semibold text-text-secondary border border-stone-200">
                          {tag}
                          <button onClick={() => removeTagA(tag)} className="rounded p-0.5 hover:bg-stone-200">
                            <X className="h-3 w-3 text-text-muted" />
                          </button>
                        </span>
                      ))}
                      {idsA.length === 0 && (
                        <span className="text-xs text-text-muted italic">No IDs added yet. Press Enter or click + to add.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div className="lg:col-span-1 flex flex-row lg:flex-col items-center justify-center gap-2 py-4 lg:py-0">
              <div className="h-[1px] lg:h-12 w-full lg:w-[1px] bg-brand-border"></div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 border border-brand-border text-xs font-bold text-text-muted shadow-sm">
                VS
              </div>
              <div className="h-[1px] lg:h-12 w-full lg:w-[1px] bg-brand-border"></div>
            </div>

            {/* DB B (Blue) */}
            <div className="lg:col-span-5 rounded-3xl border border-brand-border bg-white shadow-premium overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-blue-50/80 border-b border-blue-100/50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-blue-600" />
                    <span className="font-bold text-blue-950">DB B (Reconciliation Destination)</span>
                  </div>
                  {selectedTarget ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                      Live Target DB: {selectedTarget.name}
                    </span>
                  ) : secondJobId ? (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                      Staged Dump B
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      No comparison source
                    </span>
                  )}
                </div>
                
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Table Name</label>
                    <select
                      value={selectedTableB}
                      onChange={(e) => handleTableBChange(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-stone-50 px-4 py-3 text-sm text-text-primary transition focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    >
                      {tables.map((table) => (
                        <option key={table.name} value={table.name}>
                          {table.name} ({table.row_count} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Compare IDs</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter ID (e.g. 1)"
                        value={inputB}
                        onChange={(e) => setInputB(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTagB())}
                        className="flex-1 rounded-xl border border-brand-border bg-stone-50 px-4 py-3 text-sm text-text-primary transition focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                      <button
                        onClick={addTagB}
                        className="inline-flex items-center justify-center rounded-xl bg-blue-600 p-3 text-white hover:bg-blue-700"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {idsB.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 pl-3 pr-1.5 py-1 text-xs font-semibold text-text-secondary border border-stone-200">
                          {tag}
                          <button onClick={() => removeTagB(tag)} className="rounded p-0.5 hover:bg-stone-200">
                            <X className="h-3 w-3 text-text-muted" />
                          </button>
                        </span>
                      ))}
                      {idsB.length === 0 && (
                        <span className="text-xs text-text-muted italic">No IDs added yet. Press Enter or click + to add.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!selectedTarget && !secondJobId && (
            <div className="rounded-2xl border border-amber-250 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">No comparison source configured for DB B</p>
                <p className="mt-1 text-xs leading-relaxed">
                  To reconcile database records, you must configure a <strong>Live Database Destination</strong> or upload a <strong>second staging database dump</strong>. 
                  Currently, scanning will fall back to querying Staging DB A for both sides.
                </p>
              </div>
            </div>
          )}

          {/* Scan Results */}
          {hasScanned && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Columns Compared" value={totals.columnsCompared} tone="teal" />
                <StatCard 
                  title="Mismatches Found" 
                  value={totals.mismatchesFound} 
                  tone={totals.mismatchesFound > 0 ? "rose" : "teal"} 
                />
                <StatCard title="Matching Fields" value={totals.matchingFields} tone="blue" />
                <StatCard title="IDs Compared" value={totals.idsCompared} tone="violet" />
              </div>

              {/* Comparison Details layout */}
              <div className="rounded-3xl border border-brand-border bg-white shadow-premium p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Scan Mismatches Breakdown</h2>
                  <p className="text-sm text-text-secondary">Inspect field comparisons for each examined identifier.</p>
                </div>

                {/* ID Tab Selectors */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4">
                  <div className="flex flex-wrap gap-2">
                    {filteredResults.map((res) => {
                      const isActive = res.id === selectedCompareId;
                      const hasErr = res.mismatchesCount > 0;
                      return (
                        <button
                          key={res.id}
                          onClick={() => setSelectedCompareId(res.id)}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                            isActive
                              ? "bg-stone-900 text-white"
                              : "bg-stone-50 border border-brand-border text-text-secondary hover:bg-stone-100"
                          }`}
                        >
                          ID: {res.id}
                          {hasErr ? (
                            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 ring-1 ring-rose-500/20">
                              {res.mismatchesCount} diffs
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 ring-1 ring-emerald-500/20">
                              Matched
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {filteredResults.length === 0 && (
                      <span className="text-xs text-text-muted italic">No records to display for current filter.</span>
                    )}
                  </div>

                  {Object.keys(scanResults).length > 0 && (
                    <div className="flex items-center gap-2 text-xs flex-shrink-0">
                      <label className="font-semibold text-text-secondary cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showOnlyMismatches}
                          onChange={(e) => setShowOnlyMismatches(e.target.checked)}
                          className="rounded border-brand-border text-teal-600 focus:ring-teal-500"
                        />
                        Show mismatches only ({totalMismatchedIdsCount})
                      </label>
                    </div>
                  )}
                </div>

                {activeResult && (
                  <div className="space-y-4">
                    {/* Exists alerts */}
                    {(!activeResult.dbAExists || !activeResult.dbBExists) && (
                      <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-700 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Record Orphaned</p>
                          <p className="mt-0.5 leading-relaxed">
                            {!activeResult.dbAExists && "ID not found inside Staging DB A table."}
                            {!activeResult.dbBExists && "ID not found inside Reconciliation DB B table."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Table of columns */}
                    <div className="overflow-hidden rounded-2xl border border-brand-border shadow-sm">
                      <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-stone-50">
                          <tr>
                            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">
                              Column Name
                            </th>
                            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">
                              DB A Value
                            </th>
                            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">
                              DB B Value
                            </th>
                            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border bg-white">
                          {activeResult.fields.map((f, idx) => {
                            const isMatch = f.match;
                            return (
                              <tr 
                                key={f.column} 
                                className={`transition-colors ${
                                  !isMatch 
                                    ? "bg-[#FCEBEB]/55 hover:bg-[#FCEBEB]/80" 
                                    : "hover:bg-stone-50/40"
                                }`}
                              >
                                <td className="px-5 py-3 text-sm font-semibold text-text-primary">
                                  {f.column}
                                </td>
                                <td 
                                  className={`px-5 py-3 text-sm font-mono ${
                                    !isMatch 
                                      ? "text-[#A32D2D] font-bold" 
                                      : "text-text-secondary/70"
                                  }`}
                                >
                                  {f.valA}
                                </td>
                                <td 
                                  className={`px-5 py-3 text-sm font-mono ${
                                    !isMatch 
                                      ? "text-[#A32D2D] font-bold" 
                                      : "text-text-secondary/70"
                                  }`}
                                >
                                  {f.valB}
                                </td>
                                <td className="px-5 py-3 text-sm">
                                  {isMatch ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                                      <CheckCircle2 className="h-4 w-4" />
                                      Match
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[#A32D2D] font-bold text-xs">
                                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                                      Mismatch
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PageFrame>
    </ProjectLockGuard>
  );
}

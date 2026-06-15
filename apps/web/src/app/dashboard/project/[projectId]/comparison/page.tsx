"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Database, FileArchive, GitCompare, Loader2, Upload } from "lucide-react";
import { ComparisonRun, getLatestComparisonRun, uploadComparisonDumps } from "@/lib/api";
import { ProjectLockGuard } from "@/components/workspace/project-workspace";

const statLabel: Record<string, string> = {
  source_a_tables: "Source A Tables",
  source_b_tables: "Source B Tables",
  matched_tables: "Matched Tables",
  missing_in_b: "Missing In B",
  missing_in_a: "Missing In A",
  column_mismatches: "Column Mismatches",
  type_mismatches: "Type Mismatches",
  primary_key_mismatches: "PK Mismatches",
  row_count_mismatches: "Row Count Mismatches",
  missing_rows: "Missing Rows",
  cell_mismatches: "Cell Mismatches",
};

// Returns color themes for stats to make them glanceable and premium
function getStatCardStyles(key: string, value: number) {
  if (value === 0) {
    return "bg-stone-50 border-stone-200/60 text-stone-700";
  }
  if (key === "matched_tables") {
    return "bg-teal-50/40 border-teal-200/50 text-teal-850";
  }
  if (key.includes("missing") || key.includes("mismatch")) {
    return "bg-amber-50/50 border-amber-200/50 text-amber-850";
  }
  return "bg-stone-50 border-stone-200/60 text-stone-850";
}

function SourceDropzone({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div 
      className={`relative rounded-2xl border-2 border-dashed p-6 md:p-8 transition-all duration-300 ${
        file 
          ? "border-teal-550 bg-teal-50/30 shadow-sm shadow-teal-500/5" 
          : "border-stone-250 bg-white hover:border-teal-500 hover:shadow-md hover:shadow-stone-200/40"
      }`}
    >
      <input
        type="file"
        accept=".sql,.gz,.bak"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5">
        <div className={`rounded-2xl border p-4 transition-all duration-300 ${
          file 
            ? "border-teal-200 bg-teal-50 text-teal-700" 
            : "border-stone-200 bg-stone-50 text-stone-500"
        }`}>
          <FileArchive className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</div>
          <div className={`mt-2 truncate text-base font-bold transition-colors ${
            file ? "text-teal-900" : "text-stone-800"
          }`}>
            {file ? file.name : "Select SQL dump or .bak file"}
          </div>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed font-medium">
            {file 
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB ready for comparison` 
              : "Supports PostgreSQL, MySQL, SQLite (.sql, .sql.gz), and MS SQL Server (.bak) backups"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [sourceA, setSourceA] = useState<File | null>(null);
  const [sourceB, setSourceB] = useState<File | null>(null);
  const [latestRun, setLatestRun] = useState<ComparisonRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLatestRun(await getLatestComparisonRun(projectId));
    } catch (err: any) {
      setError(err.message || "Unable to load comparison status.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const startComparison = async () => {
    if (!sourceA || !sourceB) return;
    setUploading(true);
    setError(null);
    try {
      const run = await uploadComparisonDumps(projectId, sourceA, sourceB);
      setLatestRun(run);
      setSourceA(null);
      setSourceB(null);
    } catch (err: any) {
      setError(err.message || "Unable to scan the uploaded dumps.");
    } finally {
      setUploading(false);
    }
  };

  const summary = latestRun?.result?.summary || {};
  const sources = latestRun?.result?.sources || {};
  const validation = latestRun?.result?.validation || {};

  return (
    <ProjectLockGuard projectId={projectId} allowedType="comparison">
      <div className="mx-auto w-full max-w-[1720px] space-y-8 p-6 md:p-8 animate-in fade-in duration-500 bg-brand-bg text-stone-900">
      
      {/* Page Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-stone-250 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-850 ring-1 ring-teal-600/15 border border-teal-200/55">
            <GitCompare className="h-3.5 w-3.5" />
            Schema Integrity Tool
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">SQL Dump Comparison</h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-stone-750 font-medium">
            Upload two database dumps (even from different dialects, such as PostgreSQL and MS SQL Server backup files). SQAuto scans schema structures statically and generates diagnostic mismatch reports.
          </p>
        </div>
        {latestRun ? (
          <button
            onClick={() => router.push(`/dashboard/project/${projectId}/comparison/mismatches`)}
            className="premium-btn-primary flex items-center gap-2 shrink-0 shadow-md hover:shadow-teal-700/10"
          >
            View mismatches report
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-900 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-650" />
          <div className="font-semibold">{error}</div>
        </div>
      ) : null}

      {/* Main Upload Area */}
      <section className="rounded-3xl border border-stone-200 bg-white shadow-premium p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-stone-850">Select Comparison Sources</h2>
          <p className="text-xs text-stone-600 mt-1 font-medium">Upload the two SQL dumps or MSSQL backup dumps (.bak) you want to cross-examine.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SourceDropzone label="Source A (Base Schema)" file={sourceA} onChange={setSourceA} />
          <SourceDropzone label="Source B (Target Schema)" file={sourceB} onChange={setSourceB} />
        </div>
        <div className="mt-6 flex flex-col gap-4 border-t border-stone-150 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-650 leading-relaxed max-w-2xl font-medium">
            Files are processed completely offline inside staging. Dialects are automatically auto-detected by our data intelligence heuristics engine.
          </p>
          <button
            disabled={!sourceA || !sourceB || uploading}
            onClick={startComparison}
            className="premium-btn-primary !py-2.5 !px-6 text-sm flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Analyzing dumps..." : "Start comparison scan"}
          </button>
        </div>
      </section>

      {/* Latest Comparison Output */}
      {loading ? (
        <div className="flex items-center gap-3 text-sm text-stone-600 py-12 justify-center font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Checking historical comparison results...
        </div>
      ) : latestRun ? (
        <section className="space-y-6 rounded-3xl border border-stone-200 bg-white shadow-premium p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-150 pb-5">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Latest Scan Summary</h2>
              <p className="mt-1.5 text-xs font-bold text-stone-600 flex items-center gap-2">
                <span className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">{latestRun.source_a_original_filename}</span> 
                <span className="text-stone-400">vs</span> 
                <span className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">{latestRun.source_b_original_filename}</span>
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
              summary.needs_review 
                ? "bg-amber-50 text-amber-800 border-amber-300/40" 
                : "bg-teal-50 text-teal-850 border-teal-300/40"
            }`}>
              {summary.needs_review ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-teal-600" />}
              {summary.needs_review ? "Mismatches Found" : "Schemas Match"}
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary)
              .filter(([key]) => key !== "needs_review")
              .map(([key, value]) => {
                const valNum = Number(value) || 0;
                const cardClass = getStatCardStyles(key, valNum);
                return (
                  <div key={key} className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 ${cardClass}`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{statLabel[key] || key.replace(/_/g, " ")}</div>
                    <div className="mt-2 text-2xl font-black">{valNum.toLocaleString()}</div>
                  </div>
                );
              })}
          </div>

          {/* Dialect Status Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {(["a", "b"] as const).map((side) => {
              const currentSource = sources[side] || {};
              const sourceDialect = currentSource.dialect || "unknown";
              const confidence = currentSource.dialect_confidence ?? 0.0;
              return (
                <div key={side} className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-teal-550 border border-teal-600/10 p-2.5 text-teal-700">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Database Source {side.toUpperCase()}</div>
                      <div className="mt-1.5 text-lg font-bold text-stone-850 capitalize">{sourceDialect === "sqlserver" ? "MS SQL Server" : sourceDialect}</div>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex-1 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-teal-650 h-full rounded-full" style={{ width: `${confidence * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-stone-700 shrink-0">Confidence {(confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-4 text-xs font-bold text-stone-600">
                        {currentSource.table_count || 0} tables identified
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Notice */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/30 p-5 text-sm text-teal-900 leading-relaxed font-medium">
            <span className="font-bold text-teal-950 block mb-1">Migration Advice:</span>
            {validation.reason || "Review all reported mismatches before choosing migration mappings or export actions."}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-stone-250 bg-stone-50/40 p-12 text-center shadow-inner">
          <GitCompare className="mx-auto h-12 w-12 text-teal-750/70" />
          <h2 className="mt-4 text-xl font-bold text-stone-850">No scan executed yet</h2>
          <p className="mt-2 text-sm text-stone-700 max-w-md mx-auto leading-relaxed font-medium">
            Specify Source A and Source B database dumps above, then run the integrity engine to discover structural and datatype mismatches.
          </p>
        </div>
      )}
    </div>
    </ProjectLockGuard>
  );
}

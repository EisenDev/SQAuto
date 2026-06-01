"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Database, FileArchive, GitCompare, Loader2, Upload } from "lucide-react";
import { ComparisonRun, getLatestComparisonRun, uploadComparisonDumps } from "@/lib/api";

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
    <div className={`relative rounded-2xl border border-dashed p-6 transition ${file ? "border-teal-500/50 bg-teal-500/5" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
      <input
        type="file"
        accept=".sql,.gz"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <FileArchive className={`h-5 w-5 ${file ? "text-teal-300" : "text-slate-500"}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</div>
          <div className="mt-2 truncate text-sm font-semibold text-white">{file ? file.name : "Upload .sql or .sql.gz"}</div>
          <div className="mt-1 text-xs text-slate-500">{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB ready to scan` : "Supports PostgreSQL, MySQL, SQLite, and SQL Server style dumps"}</div>
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
    <div className="mx-auto w-full max-w-[1400px] space-y-8 p-8 md:p-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            <GitCompare className="h-4 w-4" />
            SQL Dump Comparison
          </div>
          <h1 className="mt-3 text-3xl font-bold text-white">Compare two SQL dumps</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Upload two dumps from the same or different dialects. SQAuto scans schema structure only and reports deterministic mismatches for review.
          </p>
        </div>
        {latestRun ? (
          <button
            onClick={() => router.push(`/dashboard/project/${projectId}/comparison/mismatches`)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-400"
          >
            View mismatches
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <SourceDropzone label="Source A" file={sourceA} onChange={setSourceA} />
          <SourceDropzone label="Source B" file={sourceB} onChange={setSourceB} />
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">Same-dialect and cross-dialect pairs are supported: PostgreSQL/PostgreSQL, PostgreSQL/MySQL, PostgreSQL/SQLite, MySQL/SQLite, and similar SQL dumps.</div>
          <button
            disabled={!sourceA || !sourceB || uploading}
            onClick={startComparison}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Scanning..." : "Run comparison"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading latest comparison...
        </div>
      ) : latestRun ? (
        <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Latest comparison overview</h2>
              <p className="mt-1 text-sm text-slate-500">{latestRun.source_a_original_filename} vs {latestRun.source_b_original_filename}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${summary.needs_review ? "border-amber-500/20 bg-amber-500/10 text-amber-300" : "border-teal-500/20 bg-teal-500/10 text-teal-300"}`}>
              {summary.needs_review ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {summary.needs_review ? "Needs Review" : "No Mismatches"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(summary)
              .filter(([key]) => key !== "needs_review")
              .map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{statLabel[key] || key.replace(/_/g, " ")}</div>
                  <div className="mt-2 text-2xl font-black text-white">{String(value)}</div>
                </div>
              ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(["a", "b"] as const).map((side) => (
              <div key={side} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-teal-300" />
                  <div>
                    <div className="text-sm font-bold text-white">Source {side.toUpperCase()}</div>
                    <div className="text-xs text-slate-500">{sources[side]?.dialect || "unknown"} · confidence {sources[side]?.dialect_confidence ?? 0}</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">{sources[side]?.table_count || 0} tables scanned</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            {validation.reason || "Review all reported mismatches before choosing migration mappings or export actions."}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
          <GitCompare className="mx-auto h-10 w-10 text-slate-600" />
          <h2 className="mt-4 text-lg font-bold text-white">No comparison run yet</h2>
          <p className="mt-2 text-sm text-slate-500">Upload two SQL dumps to create the first comparison overview.</p>
        </div>
      )}
    </div>
  );
}

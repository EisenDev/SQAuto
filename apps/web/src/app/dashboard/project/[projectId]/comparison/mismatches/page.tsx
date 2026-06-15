"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Columns, Database, GitCompare, KeyRound, Loader2, Rows } from "lucide-react";
import { ComparisonMismatchesResponse, getComparisonMismatches } from "@/lib/api";
import { ProjectLockGuard } from "@/components/workspace/project-workspace";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-premium p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-teal-700">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const statLabel: Record<string, string> = {
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
  return "bg-amber-50/50 border-amber-200/50 text-amber-855";
}

export default function ComparisonMismatchesPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [data, setData] = useState<ComparisonMismatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getComparisonMismatches(projectId));
    } catch (err: any) {
      setError(err.message || "Unable to load comparison mismatches.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="comparison">
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-stone-600 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-teal-700" />
          Analyzing database schemas...
        </div>
      </ProjectLockGuard>
    );
  }

  if (error || !data) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="comparison">
        <div className="mx-auto max-w-xl p-10 text-center bg-brand-bg text-stone-900 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-stone-900">Comparison Data Unavailable</h1>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">{error || "No comparison data found. Make sure you run a comparison first."}</p>
          <button
            onClick={() => router.push(`/dashboard/project/${projectId}/comparison`)}
            className="premium-btn-primary mt-4 text-xs"
          >
            Go to comparison setup
          </button>
        </div>
      </ProjectLockGuard>
    );
  }

  const missingInA = data.tables.missing_in_a || [];
  const missingInB = data.tables.missing_in_b || [];

  return (
    <ProjectLockGuard projectId={projectId} allowedType="comparison">
      <div className="mx-auto w-full max-w-[1720px] space-y-8 p-6 md:p-8 animate-in fade-in duration-500 bg-brand-bg text-stone-900">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push(`/dashboard/project/${projectId}/comparison`)}
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 transition hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to comparison setup
        </button>
      </div>

      {/* Header */}
      <div className="border-b border-stone-250 pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
          <GitCompare className="h-4 w-4" />
          Diagnostics Report
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">Schema Mismatches</h1>
        <p className="mt-2 text-sm text-stone-650 max-w-3xl leading-relaxed font-medium">
          Review structural, datatype, and constraints discrepancies found during schema validation. All items here must be reviewed before finalizing mapping templates.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(data.summary)
          .filter(([key]) => key !== "needs_review")
          .map(([key, value]) => {
            const valNum = Number(value) || 0;
            const cardClass = getStatCardStyles(key, valNum);
            return (
              <div key={key} className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 ${cardClass}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{statLabel[key] || key.replace(/_/g, " ")}</div>
                <div className="mt-2 text-xl font-black">{valNum.toLocaleString()}</div>
              </div>
            );
          })}
      </div>

      {/* Table Mismatches */}
      <Section title="Table Mismatches" icon={Database}>
        {missingInA.length === 0 && missingInB.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No table-level mismatches found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Missing in Source A (Found only in Source B)</div>
              <div className="mt-4 space-y-2.5">
                {missingInA.length > 0 ? (
                  missingInA.map((table) => (
                    <div key={table} className="rounded-xl bg-white border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-850 shadow-sm flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                      {table}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-stone-400 font-medium italic">None</div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Missing in Source B (Found only in Source A)</div>
              <div className="mt-4 space-y-2.5">
                {missingInB.length > 0 ? (
                  missingInB.map((table) => (
                    <div key={table} className="rounded-xl bg-white border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-850 shadow-sm flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                      {table}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-stone-400 font-medium italic">None</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Column Mismatches */}
      <Section title="Column Mismatches" icon={Columns}>
        {data.columns.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No missing-column mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="grid grid-cols-3 gap-4 border-b border-stone-200 bg-stone-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">
              <span>Table</span>
              <span>Column</span>
              <span>Difference</span>
            </div>
            <div className="divide-y divide-stone-150">
              {data.columns.map((item, index) => (
                <div key={`${item.table}-${item.column}-${index}`} className="grid grid-cols-3 gap-4 px-4 py-3.5 text-sm items-center hover:bg-stone-50/30">
                  <span className="font-bold text-stone-900">{item.table}</span>
                  <span className="font-mono text-stone-700 bg-stone-100/80 border border-stone-200 px-2 py-0.5 rounded w-fit">{item.column}</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 text-xs uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                    {item.issue.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Type Mismatches */}
      <Section title="Type Mismatches" icon={GitCompare}>
        {data.types.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No type mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="grid grid-cols-4 gap-4 border-b border-stone-200 bg-stone-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">
              <span>Table</span>
              <span>Column</span>
              <span>Source A Type</span>
              <span>Source B Type</span>
            </div>
            <div className="divide-y divide-stone-150">
              {data.types.map((item, index) => (
                <div key={`${item.table}-${item.column}-${index}`} className="grid grid-cols-4 gap-4 px-4 py-3.5 text-sm items-center hover:bg-stone-50/30">
                  <span className="font-bold text-stone-900">{item.table}</span>
                  <span className="font-mono text-stone-700 bg-stone-100/80 border border-stone-200 px-2 py-0.5 rounded w-fit">{item.column}</span>
                  <span className="font-mono text-teal-800 font-bold bg-teal-50 border border-teal-150 px-2 py-0.5 rounded w-fit">{item.source_a_type}</span>
                  <span className="font-mono text-amber-800 font-bold bg-amber-50 border border-amber-150 px-2 py-0.5 rounded w-fit">{item.source_b_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Primary Key Mismatches */}
      <Section title="Primary Key Mismatches" icon={KeyRound}>
        {data.primary_keys.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No primary-key mismatches found.</p>
        ) : (
          <div className="space-y-4">
            {data.primary_keys.map((item) => (
              <div key={item.table} className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5 shadow-sm">
                <div className="font-bold text-stone-950 text-base">{item.table}</div>
                <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white border border-stone-200 p-4">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Source A Primary Keys</div>
                    <div className="flex flex-wrap gap-2">
                      {item.source_a_primary_keys.length > 0 ? (
                        item.source_a_primary_keys.map((pk: string) => (
                          <span key={pk} className="font-mono text-xs font-semibold bg-stone-100 border border-stone-200 px-2 py-1 rounded text-stone-850">{pk}</span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-500 italic">None</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white border border-stone-200 p-4">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Source B Primary Keys</div>
                    <div className="flex flex-wrap gap-2">
                      {item.source_b_primary_keys.length > 0 ? (
                        item.source_b_primary_keys.map((pk: string) => (
                          <span key={pk} className="font-mono text-xs font-semibold bg-stone-100 border border-stone-200 px-2 py-1 rounded text-stone-850">{pk}</span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-500 italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Row Count Mismatches */}
      <Section title="Row Count Mismatches" icon={Rows}>
        {data.row_counts.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No row-count mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="grid grid-cols-3 gap-4 border-b border-stone-200 bg-stone-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">
              <span>Table</span>
              <span>Source A Row Count</span>
              <span>Source B Row Count</span>
            </div>
            <div className="divide-y divide-stone-150">
              {data.row_counts.map((item) => (
                <div key={item.table} className="grid grid-cols-3 gap-4 px-4 py-3.5 text-sm items-center hover:bg-stone-50/30">
                  <span className="font-bold text-stone-900">{item.table}</span>
                  <span className="font-mono text-teal-800 font-bold bg-teal-50 border border-teal-150 px-2 py-0.5 rounded w-fit">{(item.source_a_rows ?? 0).toLocaleString()} rows</span>
                  <span className="font-mono text-amber-800 font-bold bg-amber-50 border border-amber-150 px-2 py-0.5 rounded w-fit">{(item.source_b_rows ?? 0).toLocaleString()} rows</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Missing Rows */}
      <Section title="Missing Rows Data" icon={AlertCircle}>
        {data.missing_rows.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No missing rows found for matched tables.</p>
        ) : (
          <div className="space-y-4">
            {data.missing_rows.map((item, index) => (
              <div key={`${item.table}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm border-b border-stone-200/60 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-stone-950 text-base">{item.table}</span>
                    <span className="premium-badge-warning uppercase tracking-wider text-[10px]">{item.issue.replace(/_/g, " ")}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-stone-600 bg-white border border-stone-200 px-2.5 py-1 rounded shadow-sm">
                    Row Key: {item.row_key.join(" / ")}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-xl bg-stone-950 p-4 text-xs font-mono text-stone-200 shadow-inner">
                  {JSON.stringify(item.source_a_row || item.source_b_row, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Cell Value Mismatches */}
      <Section title="Cell Value Mismatches" icon={Columns}>
        {data.cells.length === 0 ? (
          <p className="text-sm text-stone-500 font-medium">No cell-level value mismatches found for matched rows.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="grid gap-3 border-b border-stone-200 bg-stone-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500 md:grid-cols-[1.5fr_1.5fr_1.5fr_2fr_2fr]">
              <span>Table</span>
              <span>Row Key ID</span>
              <span>Column</span>
              <span>Source A Value</span>
              <span>Source B Value</span>
            </div>
            <div className="divide-y divide-stone-150">
              {data.cells.map((item, index) => (
                <div key={`${item.table}-${item.column}-${index}`} className="grid gap-3 px-4 py-3.5 text-sm items-center hover:bg-stone-50/30 md:grid-cols-[1.5fr_1.5fr_1.5fr_2fr_2fr]">
                  <span className="font-bold text-stone-900">{item.table}</span>
                  <span className="font-mono text-xs text-stone-650 truncate" title={item.row_key.join(" / ")}>
                    {item.row_key.join(" / ")}
                  </span>
                  <span className="font-mono text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded w-fit">{item.column}</span>
                  <span className="break-all font-mono font-bold text-teal-800 bg-teal-50 border border-teal-150 px-2 py-0.5 rounded w-fit">
                    {String(item.source_a_value)}
                  </span>
                  <span className="break-all font-mono font-bold text-amber-800 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded w-fit">
                    {String(item.source_b_value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
    </ProjectLockGuard>
  );
}

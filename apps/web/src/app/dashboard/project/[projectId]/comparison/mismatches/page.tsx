"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Columns, Database, GitCompare, KeyRound, Loader2 } from "lucide-react";
import { ComparisonMismatchesResponse, getComparisonMismatches } from "@/lib/api";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-2">
          <Icon className="h-5 w-5 text-teal-300" />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
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
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
        Loading comparison mismatches...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-4 text-xl font-bold text-white">Comparison unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{error || "No comparison data found."}</p>
      </div>
    );
  }

  const missingInA = data.tables.missing_in_a || [];
  const missingInB = data.tables.missing_in_b || [];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-8 p-8 md:p-12">
      <button
        onClick={() => router.push(`/dashboard/project/${projectId}/comparison`)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to comparison overview
      </button>

      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-400">
          <GitCompare className="h-4 w-4" />
          Mismatch Review
        </div>
        <h1 className="mt-3 text-3xl font-bold text-white">Schema mismatches</h1>
        <p className="mt-2 text-sm text-slate-400">Every mismatch is marked for review. Do not finalize migration mappings until these differences are resolved or accepted by an operator.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Object.entries(data.summary)
          .filter(([key]) => key !== "needs_review")
          .map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{key.replace(/_/g, " ")}</div>
              <div className="mt-2 text-2xl font-black text-white">{String(value)}</div>
            </div>
          ))}
      </div>

      <Section title="Table mismatches" icon={Database}>
        {missingInA.length === 0 && missingInB.length === 0 ? (
          <p className="text-sm text-slate-500">No table-level mismatches found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Missing in Source A</div>
              <div className="mt-3 space-y-2">
                {missingInA.map((table) => <div key={table} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300">{table}</div>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Missing in Source B</div>
              <div className="mt-3 space-y-2">
                {missingInB.map((table) => <div key={table} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300">{table}</div>)}
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Column mismatches" icon={Columns}>
        {data.columns.length === 0 ? (
          <p className="text-sm text-slate-500">No missing-column mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            {data.columns.map((item, index) => (
              <div key={`${item.table}-${item.column}-${index}`} className="grid grid-cols-3 gap-4 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium text-white">{item.table}</span>
                <span className="text-slate-300">{item.column}</span>
                <span className="text-amber-300">{item.issue.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Type mismatches" icon={GitCompare}>
        {data.types.length === 0 ? (
          <p className="text-sm text-slate-500">No type mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            {data.types.map((item, index) => (
              <div key={`${item.table}-${item.column}-${index}`} className="grid grid-cols-4 gap-4 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium text-white">{item.table}</span>
                <span className="text-slate-300">{item.column}</span>
                <span className="text-sky-300">{item.source_a_type}</span>
                <span className="text-amber-300">{item.source_b_type}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Primary key mismatches" icon={KeyRound}>
        {data.primary_keys.length === 0 ? (
          <p className="text-sm text-slate-500">No primary-key mismatches found.</p>
        ) : (
          <div className="space-y-3">
            {data.primary_keys.map((item) => (
              <div key={item.table} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="font-medium text-white">{item.table}</div>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <div className="text-slate-400">Source A: {item.source_a_primary_keys.join(", ") || "none"}</div>
                  <div className="text-slate-400">Source B: {item.source_b_primary_keys.join(", ") || "none"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Row count mismatches" icon={Database}>
        {data.row_counts.length === 0 ? (
          <p className="text-sm text-slate-500">No row-count mismatches found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            {data.row_counts.map((item) => (
              <div key={item.table} className="grid grid-cols-3 gap-4 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0">
                <span className="font-medium text-white">{item.table}</span>
                <span className="text-sky-300">Source A: {item.source_a_rows}</span>
                <span className="text-amber-300">Source B: {item.source_b_rows}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Missing rows" icon={AlertCircle}>
        {data.missing_rows.length === 0 ? (
          <p className="text-sm text-slate-500">No missing rows found for matched tables.</p>
        ) : (
          <div className="space-y-3">
            {data.missing_rows.map((item, index) => (
              <div key={`${item.table}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-white">{item.table}</span>
                  <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">{item.issue.replace(/_/g, " ")}</span>
                  <span className="text-slate-500">Key: {item.row_key.join(" / ")}</span>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-300">{JSON.stringify(item.source_a_row || item.source_b_row, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Cell value mismatches" icon={Columns}>
        {data.cells.length === 0 ? (
          <p className="text-sm text-slate-500">No cell-level value mismatches found for matched rows.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            {data.cells.map((item, index) => (
              <div key={`${item.table}-${item.column}-${index}`} className="grid gap-3 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_1fr_1fr_1fr]">
                <span className="font-medium text-white">{item.table}</span>
                <span className="text-slate-500">Key: {item.row_key.join(" / ")}</span>
                <span className="text-slate-300">{item.column}</span>
                <span className="break-all text-sky-300">{String(item.source_a_value)}</span>
                <span className="break-all text-amber-300">{String(item.source_b_value)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

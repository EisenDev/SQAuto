"use client";
import React, { useState } from 'react';
import { useJob } from '@/components/JobProvider';
import {
  AlertTriangle, Shield, RefreshCw, Key, Link2, Ban, 
  ChevronDown, ChevronUp, Search
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface IntegrityReport {
  tables_scanned: number;
  total_issues: number;
  duplicate_keys: Array<{
    table: string;
    pk_columns: string[];
    count: number;
    sample: Array<Record<string, any>>;
  }>;
  missing_primary_keys: string[];
  orphan_foreign_keys: Array<{
    table: string;
    column: string;
    references: string;
    count: number;
    sample_values: string[];
  }>;
  null_risks: Array<{
    table: string;
    column: string;
    null_percentage: number;
    null_count: number;
    sample_size: number;
  }>;
}

function IssueSection({ 
  title, icon, count, color, children, defaultOpen = false 
}: { 
  title: string; icon: React.ReactNode; count: number; color: string; children: React.ReactNode; defaultOpen?: boolean 
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className={`border rounded-xl overflow-hidden border-${color}-200`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full p-4 flex items-center justify-between bg-${color}-50 hover:bg-${color}-100/50 transition-colors`}
      >
        <div className="flex items-center space-x-3">
          {icon}
          <span className={`text-sm font-black text-${color}-800 uppercase tracking-wider`}>{title}</span>
          <span className={`text-[10px] bg-${color}-200 text-${color}-900 px-2 py-0.5 rounded-full font-black`}>{count}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

import Tooltip from './Tooltip';
import { GUIDANCE } from '@/lib/guidance';

export default function IntegrityIssuesPanel() {
  const { activeJob } = useJob();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobId = activeJob?.id || activeJob?.job_id || "";

  // Reset session data on new job upload
  React.useEffect(() => {
    setReport(null);
    setError(null);
  }, [jobId]);

  const runCheck = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/analysis/integrity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Check failed");
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-orange-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-orange-700 to-amber-800 p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-orange-300" />
          <h3 className="font-black text-sm text-white tracking-widest uppercase italic flex items-center">
            {GUIDANCE.INTEGRITY.TITLE}
            <Tooltip content={GUIDANCE.INTEGRITY.HELP} />
          </h3>
        </div>
        <button
          onClick={runCheck}
          disabled={loading || !jobId || activeJob?.status !== 'completed'}
          className="px-4 py-2 bg-white/10 backdrop-blur text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 disabled:opacity-40 transition-all flex items-center space-x-2 border border-white/20"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          <span>{loading ? 'SCANNING...' : 'RUN QUALITY CHECK'}</span>
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-mono">{error}</p>
          </div>
        )}

        {!report && !loading && !error && (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">No scan data yet</p>
            <div className="max-w-xs mx-auto text-left bg-gray-50 p-4 rounded-xl text-[11px] text-gray-600 font-mono leading-relaxed">
              <p className="font-bold text-gray-800 mb-2">Steps:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Upload SQL dump</li>
                <li>Wait for extraction</li>
                <li>Click 'RUN QUALITY CHECK'</li>
              </ol>
            </div>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-xl font-black text-teal-900">{report.tables_scanned}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Tables Scanned</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className={`text-xl font-black ${report.total_issues > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{report.total_issues}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Total Issues</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className={`text-xl font-black ${report.duplicate_keys.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{report.duplicate_keys.length}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Dup Keys</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className={`text-xl font-black ${report.orphan_foreign_keys.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{report.orphan_foreign_keys.length}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Orphan FKs</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className={`text-xl font-black ${report.missing_primary_keys.length > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{report.missing_primary_keys.length}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">No PK</p>
              </div>
            </div>

            {/* Issue Status Banner */}
            {report.total_issues === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-sm font-black text-emerald-700">✓ ALL CLEAR — No integrity issues detected</p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-black text-amber-800">⚠ DATA ISSUES DETECTED</p>
                <div className="mt-2 space-y-1">
                  {report.duplicate_keys.length > 0 && (
                    <p className="text-[11px] text-amber-700 font-mono">• {report.duplicate_keys.reduce((a, d) => a + d.count, 0)} duplicate primary keys across {report.duplicate_keys.length} tables</p>
                  )}
                  {report.orphan_foreign_keys.length > 0 && (
                    <p className="text-[11px] text-amber-700 font-mono">• {report.orphan_foreign_keys.reduce((a, o) => a + o.count, 0)} orphan records across {report.orphan_foreign_keys.length} relationships</p>
                  )}
                  {report.missing_primary_keys.length > 0 && (
                    <p className="text-[11px] text-amber-700 font-mono">• {report.missing_primary_keys.length} tables without primary keys</p>
                  )}
                  {report.null_risks.length > 0 && (
                    <p className="text-[11px] text-amber-700 font-mono">• {report.null_risks.length} columns with high NULL density</p>
                  )}
                </div>
              </div>
            )}

            {/* Expandable Issue Sections */}
            <IssueSection
              title="Duplicate Primary Keys"
              icon={<Key className="w-4 h-4 text-red-600" />}
              count={report.duplicate_keys.length}
              color="red"
              defaultOpen={true}
            >
              <div className="space-y-3">
                {report.duplicate_keys.map((dk, i) => (
                  <div key={i} className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-800 font-mono">{dk.table}</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-black">{dk.count} duplicates</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mb-1">PK: {dk.pk_columns.join(', ')}</p>
                    {dk.sample.length > 0 && (
                      <div className="text-[10px] text-gray-500 font-mono">
                        Sample: {dk.sample.slice(0, 3).map(s => JSON.stringify(s)).join(' | ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </IssueSection>

            <IssueSection
              title="Missing Primary Keys"
              icon={<Ban className="w-4 h-4 text-orange-600" />}
              count={report.missing_primary_keys.length}
              color="orange"
            >
              <div className="flex flex-wrap gap-2">
                {report.missing_primary_keys.map(t => (
                  <span key={t} className="text-[10px] bg-orange-50 text-orange-800 px-2.5 py-1 rounded-lg font-mono font-bold border border-orange-200">{t}</span>
                ))}
              </div>
            </IssueSection>

            <IssueSection
              title="Orphan Foreign Keys"
              icon={<Link2 className="w-4 h-4 text-amber-600" />}
              count={report.orphan_foreign_keys.length}
              color="amber"
            >
              <div className="space-y-3">
                {report.orphan_foreign_keys.map((ofk, i) => (
                  <div key={i} className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-gray-800 font-mono">{ofk.table}.{ofk.column}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">{ofk.count} orphans</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono">→ References: {ofk.references}</p>
                    {ofk.sample_values.length > 0 && (
                      <p className="text-[10px] text-gray-400 font-mono mt-1">Sample orphan IDs: {ofk.sample_values.slice(0, 5).join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </IssueSection>

            <IssueSection
              title="High NULL Density Columns"
              icon={<AlertTriangle className="w-4 h-4 text-yellow-600" />}
              count={report.null_risks.length}
              color="yellow"
            >
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-gray-500 uppercase tracking-widest">Table</th>
                      <th className="px-3 py-2 text-left font-black text-gray-500 uppercase tracking-widest">Column</th>
                      <th className="px-3 py-2 text-right font-black text-gray-500 uppercase tracking-widest">NULL %</th>
                      <th className="px-3 py-2 text-right font-black text-gray-500 uppercase tracking-widest">NULL Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.null_risks.map((nr, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono font-bold text-gray-700">{nr.table}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{nr.column}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-amber-600">{nr.null_percentage}%</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{nr.null_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </IssueSection>
          </div>
        )}
      </div>
    </div>
  );
}

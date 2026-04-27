"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useJob } from '@/components/JobProvider';
import Skeleton from './Skeleton';
import { 
  Database, Server, Play, RefreshCw, AlertTriangle, CheckCircle2, 
  XCircle, Trash2, ChevronRight, Shield, Zap, Clock, Info
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ============================================================
// Types
// ============================================================
interface Target {
  id: string;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  db_type: string;
  ssl_mode: string | null;
  created_at: string;
}

interface MigrationRun {
  id: string;
  source_job_id: string;
  target_id: string;
  mode: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  summary: any;
  created_at: string;
}

interface MigrationLog {
  id: string;
  level: string;
  table_name: string | null;
  message: string;
  created_at: string;
  transaction_status?: string;
  rows_affected?: number;
  execution_time_ms?: number;
}

// ============================================================
// Sub-Components
// ============================================================

function ConnectionPanel({ onTargetSaved }: { onTargetSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', host: '', port: '5432', database_name: '', username: '', password: '', ssl_mode: 'prefer'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/migration/targets/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.host, port: parseInt(form.port), database_name: form.database_name,
          username: form.username, password: form.password, ssl_mode: form.ssl_mode
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.host || !form.database_name || !form.username || !form.password) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/migration/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, port: parseInt(form.port) })
      });
      setForm({ name: '', host: '', port: '5432', database_name: '', username: '', password: '', ssl_mode: 'prefer' });
      setTestResult(null);
      onTargetSaved();
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'name', label: 'CONNECTION NAME', placeholder: 'Production-DB', type: 'text' },
    { key: 'host', label: 'HOST', placeholder: '192.168.1.100', type: 'text' },
    { key: 'port', label: 'PORT', placeholder: '5432', type: 'text' },
    { key: 'database_name', label: 'DATABASE', placeholder: 'my_production_db', type: 'text' },
    { key: 'username', label: 'USERNAME', placeholder: 'postgres', type: 'text' },
    { key: 'password', label: 'PASSWORD', placeholder: '••••••••', type: 'password' },
  ];

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 p-5 flex items-center space-x-3">
        <Server className="w-5 h-5 text-teal-400" />
        <h3 className="font-black text-sm text-white tracking-widest uppercase italic">Target Database Connection</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => updateField(f.key, e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-inner"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">PostgreSQL · Phase 1 Dry-Run Only</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTest}
              disabled={testing || !form.host || !form.database_name}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-40 transition-all flex items-center space-x-2 border border-gray-200"
            >
              {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              <span>{testing ? 'TESTING...' : 'TEST CONNECTION'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.host}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-teal-700 disabled:opacity-40 transition-all flex items-center space-x-2 shadow-lg"
            >
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              <span>{saving ? 'SAVING...' : 'SAVE TARGET'}</span>
            </button>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mt-5 p-4 rounded-xl border flex items-start space-x-3 animate-in fade-in duration-300 ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-black ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                {testResult.success ? 'CONNECTION SUCCESSFUL' : 'CONNECTION FAILED'}
              </p>
              <p className="text-xs text-gray-600 mt-1 font-mono">
                {testResult.success ? testResult.db_version : testResult.error}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function TargetList({ targets, onDelete, onSelect, selectedId }: { targets: Target[], onDelete: (id: string) => void, onSelect: (id: string) => void, selectedId: string }) {
  if (targets.length === 0) return null;

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Saved Target Connections</h4>
        <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-black">{targets.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {targets.map(t => (
          <div 
            key={t.id} 
            onClick={() => onSelect(t.id)}
            className={`p-4 flex items-center justify-between cursor-pointer transition-all group ${selectedId === t.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Database className={`w-4 h-4 shrink-0 ${selectedId === t.id ? 'text-teal-600' : 'text-gray-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-800 truncate">{t.name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{t.host}:{t.port}/{t.database_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className={`w-4 h-4 ${selectedId === t.id ? 'text-teal-600' : 'text-gray-300'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function DryRunPanel({ selectedTargetId, onRunCreated }: { selectedTargetId: string, onRunCreated: () => void }) {
  const { activeJob } = useJob();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobId = activeJob?.id || activeJob?.job_id || "";

  const handleDryRun = async () => {
    if (!jobId || !selectedTargetId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/migration/runs/dry-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId, target_id: selectedTargetId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Dry-run failed");
      onRunCreated();
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-900 p-5 flex items-center space-x-3">
        <Play className="w-5 h-5 text-indigo-400" />
        <h3 className="font-black text-sm text-white tracking-widest uppercase italic">Dry-Run Migration Validation</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">SOURCE JOB</label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-600 font-mono shadow-inner">
              {jobId ? `${jobId.slice(0, 8)}...` : 'No active job selected'}
              {activeJob?.status && <span className="ml-2 text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-black uppercase">{activeJob.status}</span>}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">TARGET</label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-600 font-mono shadow-inner">
              {selectedTargetId ? `${selectedTargetId.slice(0, 8)}...` : 'Select a target above'}
            </div>
          </div>
        </div>
        <button
          onClick={handleDryRun}
          disabled={running || !jobId || !selectedTargetId || activeJob?.status !== 'completed'}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98]"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          <span>{running ? 'EXECUTING DRY-RUN...' : 'RUN DRY-RUN VALIDATION'}</span>
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-mono">{error}</p>
          </div>
        )}
        {!jobId && (
          <p className="text-[10px] text-gray-400 mt-3 text-center font-bold uppercase">Upload and profile a SQL dump first to enable dry-run</p>
        )}
      </div>
    </div>
  );
}


function ReconciliationPanel({ run }: { run: MigrationRun | null }) {
  if (!run || !run.summary) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-12 text-center">
        <Database className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No Reconciliation Data</p>
        <p className="text-[10px] text-gray-400 mt-2">Run a dry-run validation to generate a reconciliation summary</p>
      </div>
    );
  }

  const s = run.summary;
  const statusColor = s.status === 'completed_clean' ? 'emerald' : s.status === 'completed_with_warnings' ? 'amber' : 'red';

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reconciliation Summary</h4>
        <span className={`text-[10px] bg-${statusColor}-100 text-${statusColor}-800 px-3 py-1 rounded-full font-black uppercase`}>
          {s.status?.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-5 flex flex-col justify-center items-center">
            <span className={`text-[10px] font-black uppercase tracking-widest ${run.mode === 'execute' ? 'text-indigo-400' : 'text-gray-400'} mb-1`}>Tables Processed</span>
            <span className={`text-3xl font-black ${run.mode === 'execute' ? 'text-indigo-600' : 'text-gray-800'}`}>{s.tables_processed ?? s.tables_checked ?? 0}</span>
          </div>
          <div className="p-5 flex flex-col justify-center items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{s.total_rows_affected !== undefined ? 'Rows Affected' : 'Missing in Target'}</span>
            <span className="text-3xl font-black text-gray-800">
              {s.total_rows_affected !== undefined ? s.total_rows_affected : (s.tables_missing_in_target?.length || 0)}
            </span>
          </div>
          <div className="p-5 flex flex-col justify-center items-center bg-amber-50/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Warnings</span>
            <span className="text-3xl font-black text-amber-600">{s.warnings_count ?? 0}</span>
          </div>
          <div className="p-5 flex flex-col justify-center items-center bg-red-50/30">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Errors</span>
            <span className="text-3xl font-black text-red-600">{s.errors_count ?? s.execution_errors ?? 0}</span>
          </div>
        </div>

        {/* Missing Tables */}
        {s.status === 'failed' || s.status === 'rolled_back' || s.status === 'blocked' ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <h5 className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center space-x-2 mb-1">
              <XCircle className="w-4 h-4" />
              <span>{s.status.toUpperCase()} ERROR</span>
            </h5>
            <p className="text-xs text-red-600 font-mono">{s.error || s.msg || 'Unknown execution failure.'}</p>
            {s.blocking_reasons && (
              <ul className="list-disc pl-5 mt-2 text-xs text-red-800 font-mono">
                {s.blocking_reasons.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
              </ul>
            )}
          </div>
        ) : (s.tables_missing_in_target?.length > 0 && (
          <div className="mb-6">
            <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Missing in Target Database</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              {s.tables_missing_in_target.map((t: string) => (
                <span key={t} className="text-[10px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-mono font-bold border border-amber-100">{t}</span>
              ))}
            </div>
          </div>
        ))}

        {/* Row Count Comparison */}
        {s.row_count_comparison?.length > 0 && (
          <div>
            <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Row Count Comparison</h5>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Table</th>
                    <th className="px-4 py-3 text-right font-black text-gray-500 uppercase tracking-widest">Source</th>
                    <th className="px-4 py-3 text-right font-black text-gray-500 uppercase tracking-widest">Target</th>
                    <th className="px-4 py-3 text-right font-black text-gray-500 uppercase tracking-widest">Diff</th>
                    <th className="px-4 py-3 text-center font-black text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {s.row_count_comparison.map((r: any) => (
                    <tr key={r.table} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-gray-700">{r.table}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600">{r.source_rows?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600">{r.target_rows?.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.difference !== 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {r.difference > 0 ? '+' : ''}{r.difference}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${r.status === 'match' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function LogsPanel({ logs }: { logs: MigrationLog[] }) {
  const levelStyles: Record<string, string> = {
    info: 'bg-teal-50 text-teal-700 border-teal-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  const levelIcons: Record<string, React.ReactNode> = {
    info: <Info className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
  };

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Migration Logs</span>
        </h4>
        <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-black">{logs.length} ENTRIES</span>
      </div>
      {logs.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest">No log entries yet</p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3 flex items-start space-x-3 hover:bg-gray-50/50 transition-colors text-[11px]">
              <div className={`shrink-0 mt-0.5 p-1 rounded border ${levelStyles[log.level] || levelStyles.info}`}>
                {levelIcons[log.level] || levelIcons.info}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className="font-black text-gray-800 uppercase text-[9px] tracking-wider">{log.level}</span>
                  {log.table_name && (
                    <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{log.table_name}</span>
                  )}
                  {log.transaction_status && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ml-1 ${
                      log.transaction_status === 'rolled_back' ? 'bg-red-100 text-red-700' :
                      log.transaction_status === 'committed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>{log.transaction_status}</span>
                  )}
                  {log.rows_affected !== null && log.rows_affected !== undefined && (
                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">
                      {log.rows_affected} rows
                    </span>
                  )}
                  {log.execution_time_ms && (
                    <span className="text-[8px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded font-mono ml-1">
                      {log.execution_time_ms}ms
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 ml-auto font-mono shrink-0">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-600 font-mono leading-relaxed">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ============================================================
// Main Component
// ============================================================

export default function MigrationControlCenter() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [runs, setRuns] = useState<MigrationRun[]>([]);
  const [activeRun, setActiveRun] = useState<MigrationRun | null>(null);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/migration/targets`);
      const data = await res.json();
      if (Array.isArray(data)) setTargets(data);
    } catch (e) { console.error("Failed to fetch targets:", e); }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/migration/runs`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRuns(data);
        // Auto-select the most recent run
        if (data.length > 0) {
          const latest = data[0];
          setActiveRun(latest);
          fetchLogs(latest.id);
        }
      }
    } catch (e) { console.error("Failed to fetch runs:", e); }
  }, []);

  const fetchLogs = async (runId: string) => {
    try {
      const res = await fetch(`${API_URL}/migration/runs/${runId}/logs`);
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (e) { console.error("Failed to fetch logs:", e); }
  };

  const deleteTarget = async (id: string) => {
    try {
      await fetch(`${API_URL}/migration/targets/${id}`, { method: 'DELETE' });
      fetchTargets();
      if (selectedTargetId === id) setSelectedTargetId('');
    } catch (e) { console.error("Delete failed:", e); }
  };

  // Poll for active run status (if running)
  useEffect(() => {
    if (!activeRun || activeRun.status === 'completed' || activeRun.status === 'failed') return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/migration/runs/${activeRun.id}`);
        const data = await res.json();
        setActiveRun(data);
        fetchLogs(data.id);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (e) { clearInterval(interval); }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeRun?.id, activeRun?.status]);

  // Initial load
  useEffect(() => {
    Promise.all([fetchTargets(), fetchRuns()]).finally(() => setLoading(false));
  }, [fetchTargets, fetchRuns]);

  if (loading) {
    return (
      <div className="space-y-6 mt-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  // Lazy import new components
  const IntegrityIssuesPanel = require('@/components/IntegrityIssuesPanel').default;
  const SchemaMappingPanel = require('@/components/SchemaMappingPanel').default;
  const MigrationPlanPanel = require('@/components/MigrationPlanPanel').default;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Phase 1: Connection Panel */}
      <ConnectionPanel onTargetSaved={fetchTargets} />

      {/* Saved Targets */}
      <TargetList 
        targets={targets} 
        onDelete={deleteTarget} 
        onSelect={setSelectedTargetId} 
        selectedId={selectedTargetId} 
      />

      {/* Phase 1: Dry-Run Panel */}
      <DryRunPanel 
        selectedTargetId={selectedTargetId} 
        onRunCreated={() => { fetchRuns(); }} 
      />

      {/* Phase 2: Data Integrity Detection */}
      <IntegrityIssuesPanel />

      {/* Phase 2: Schema Mapping Layer */}
      <SchemaMappingPanel />

      {/* Phase 3: Migration Execution Plan & UI */}
      <MigrationPlanPanel 
        selectedTargetId={selectedTargetId} 
        onRunCreated={() => { fetchRuns(); }} 
      />

      {/* Phase 1+3: Run Summary */}
      <ReconciliationPanel run={activeRun} />

      {/* Phase 1: Migration Logs */}
      <LogsPanel logs={logs} />
    </div>
  );
}


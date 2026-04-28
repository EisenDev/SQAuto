"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useJob } from '@/components/JobProvider';
import Skeleton from './Skeleton';
import Tooltip from './Tooltip';
import DatabasePresetSelector, { DatabasePreset } from './DatabasePresetSelector';
import DestinationConnectionModal from './DestinationConnectionModal';
import { GUIDANCE } from '@/lib/guidance';
import { 
  Database, Server, Play, RefreshCw, AlertTriangle, CheckCircle2, 
  XCircle, Trash2, ChevronRight, Shield, Zap, Clock, Info, Edit, Globe, FileDown, Download, FileText, ShieldAlert
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { safeFetch } from '@/lib/api_client';

// Dynamic imports for heavy panels
const IntegrityIssuesPanel = dynamic(() => import('./IntegrityIssuesPanel'), { ssr: false });
const SchemaMappingPanel = dynamic(() => import('./SchemaMappingPanel'), { ssr: false });
const MigrationPlanPanel = dynamic(() => import('./MigrationPlanPanel'), { ssr: false });
const FixSuggestionsPanel = dynamic(() => import('./FixSuggestionsPanel'), { ssr: false });
const MappingSuggestionsPanel = dynamic(() => import('./MappingSuggestionsPanel'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ============================================================
// Types
// ============================================================
type MigrationMode = 'export' | 'live';
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
    name: '', host: '', port: '5432', database_name: '', username: '', password: '', ssl_mode: 'prefer', db_type: 'postgresql'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<DatabasePreset | null>(null);

  const handlePresetSelect = (preset: DatabasePreset) => {
    setSelectedPreset(preset);
    if (preset === 'postgresql') {
      setForm(prev => ({ ...prev, name: 'PostgreSQL Target', host: '127.0.0.1', port: '5432', database_name: 'postgres', username: 'postgres', password: '', db_type: 'postgresql' }));
    } else if (preset === 'mysql') {
      setForm(prev => ({ ...prev, name: 'MySQL Target', host: '127.0.0.1', port: '3306', database_name: 'mysql', username: 'root', password: '', db_type: 'mysql' }));
    } else if (preset === 'sqlite') {
      setForm(prev => ({ ...prev, name: 'SQLite Target', host: 'local', port: '', database_name: '/path/to/database.sqlite', username: '', password: '', db_type: 'sqlite' }));
    }
    setTestResult(null);
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await safeFetch(`${API_URL}/migration/targets/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: form.host, port: parseInt(form.port), database_name: form.database_name,
        username: form.username, password: form.password, ssl_mode: form.ssl_mode
      })
    });
    setTestResult(result.success ? result.data : { success: false, error: result.error });
    setTesting(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.host || !form.database_name || !form.username || !form.password) return;
    setSaving(true);
    const result = await safeFetch(`${API_URL}/migration/targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, port: parseInt(form.port) })
    });
    
    if (result.success) {
      setForm({ name: '', host: '', port: '5432', database_name: '', username: '', password: '', ssl_mode: 'prefer', db_type: 'postgresql' });
      setTestResult(null);
      onTargetSaved();
    } else {
      setTestResult({ success: false, error: result.error });
    }
    setSaving(false);
  };

  const fields = [
    { key: 'name', label: 'CONNECTION NAME', placeholder: 'Production-DB', type: 'text' },
    { key: 'host', label: 'HOST', placeholder: '192.168.1.100', type: 'text' },
    { key: 'port', label: 'PORT', placeholder: '5432', type: 'text', disabled: form.db_type === 'sqlite' },
    { key: 'database_name', label: 'DATABASE', placeholder: 'my_production_db', type: 'text' },
    { key: 'username', label: 'USERNAME', placeholder: 'postgres', type: 'text', disabled: form.db_type === 'sqlite' },
    { key: 'password', label: 'PASSWORD', placeholder: '••••••••', type: 'password', disabled: form.db_type === 'sqlite' },
  ];

  return (
    <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 p-5 flex items-center space-x-3">
        <Server className="w-5 h-5 text-teal-400" />
        <h3 className="font-black text-sm text-white tracking-widest uppercase italic flex items-center">
          {GUIDANCE.CONNECTION.TITLE}
          <Tooltip content={GUIDANCE.CONNECTION.HELP} />
        </h3>
      </div>
      <div className="p-6">
        <DatabasePresetSelector selectedPreset={selectedPreset} onSelect={handlePresetSelect} />

        {/* Reachability Warning */}
        {form.host && (form.host.startsWith('127.') || form.host === 'localhost' || form.host.startsWith('192.168.')) && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-start shadow-sm animate-in slide-in-from-top-2 duration-300">
            <Globe className="w-4 h-4 mr-3 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">REACHABILITY WARNING</p>
              <p className="opacity-90 leading-relaxed">
                You are using a local/LAN IP ({form.host}). Since SQAuto is deployed on a remote server, it <strong>cannot reach</strong> your local machine. 
                Use a public IP, Cloud DB host, or VPN tunnel.
              </p>
            </div>
          </div>
        )}

        {selectedPreset && selectedPreset !== 'postgresql' && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3 py-2 rounded-xl flex items-center shadow-inner font-mono">
            <Info className="w-4 h-4 mr-2 text-orange-500 shrink-0" />
            Only PostgreSQL connection testing is supported in this version. MySQL and SQLite presets are prepared for upcoming support.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={(form as any)[f.key]}
                disabled={f.disabled}
                onChange={e => updateField(f.key, e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-inner disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">PostgreSQL · Phase 1 Simulation Only</span>
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

function ReconciliationPanel({ run }: { run: MigrationRun | null }) {
  if (!run || !run.summary) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-12 text-center">
        <Database className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">No reconciliation data</p>
        <div className="max-w-xs mx-auto text-left bg-gray-50 p-4 rounded-xl text-[11px] text-gray-600 font-mono leading-relaxed mb-6">
          <p className="font-bold text-gray-800 mb-2">Instructions:</p>
          <p>Run a simulation first to generate validation results and a reconciliation summary.</p>
        </div>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rows Affected</span>
            <span className="text-3xl font-black text-gray-800">
              {s.total_rows_affected ?? 0}
            </span>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Warnings</p>
            <span className="text-3xl font-black text-amber-700">{s.warnings_count ?? 0}</span>
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
  const { activeJob } = useJob();
  const [mode, setMode] = useState<'export' | 'live'>('export');
  const [exporting, setExporting] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const [runs, setRuns] = useState<any[]>([]);
  const [activeRun, setActiveRun] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isFetchingTargets, setIsFetchingTargets] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [isFetchingTargets, setIsFetchingTargets] = useState(false);
  const [testedTargets, setTestedTargets] = useState<Record<string, boolean>>({});

  const jobId = activeJob?.id || activeJob?.job_id || "";
  const selectedTarget = targets.find(t => t.id === selectedTargetId) || null;

  const fetchTargets = useCallback(async () => {
    setIsFetchingTargets(true);
    const result = await safeFetch(`${API_URL}/migration/targets`);
    if (result.success && Array.isArray(result.data)) {
      setTargets(result.data);
      if (result.data.length > 0 && !selectedTargetId) {
        setSelectedTargetId(result.data[0].id);
      }
    }
    setIsFetchingTargets(false);
  }, [selectedTargetId]);

  const fetchRuns = useCallback(async () => {
    if (!jobId) {
      setRuns([]);
      setActiveRun(null);
      setLogs([]);
      return;
    }
    const result = await safeFetch(`${API_URL}/migration/runs?source_job_id=${jobId}`);
    if (result.success && Array.isArray(result.data)) {
      setRuns(result.data);
      // Auto-select the most recent run
      if (result.data.length > 0) {
        const latest = result.data[0];
        setActiveRun(latest);
        fetchLogs(latest.id);
      } else {
        setActiveRun(null);
        setLogs([]);
      }
    }
  }, [jobId]);

  const fetchLogs = async (runId: string) => {
    const result = await safeFetch(`${API_URL}/migration/runs/${runId}/logs`);
    if (result.success && Array.isArray(result.data)) {
      setLogs(result.data);
    }
  };

  const deleteTarget = async (id: string) => {
    const result = await safeFetch(`${API_URL}/migration/targets/${id}`, { method: 'DELETE' });
    if (result.success) {
      if (selectedTargetId === id) setSelectedTargetId('');
      fetchTargets();
    }
  };

  const handleEditTargetSave = async (id: string, updates: any) => {
    const result = await safeFetch(`${API_URL}/migration/targets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to update target');
    }
    fetchTargets();
  };

  const handleEditTargetTest = async (id: string, updates: any) => {
    const result = await safeFetch(`${API_URL}/migration/targets/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!result.success || !result.data?.success) {
      throw new Error(result.error || result.data?.error || 'Connection failed');
    }
    setTestedTargets(prev => ({ ...prev, [id]: true }));
  };

  const handleExport = async (type: 'clean' | 'translated' | 'migration') => {
    if (!jobId) return;
    setExporting(type);
    try {
      const endpoint = type === 'clean' ? 'export/clean' : type === 'translated' ? 'export/translated' : 'export/migration';
      window.location.href = `${API_URL}/migration/${endpoint}/${jobId}`;
    } finally {
      setTimeout(() => setExporting(null), 2000);
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTargets(), fetchRuns()]).finally(() => setLoading(false));
  }, [fetchTargets, fetchRuns]);

  // Session Reset - Re-fetch whenever Job ID changes
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns, jobId]);

  // Poll for active run status (if running)
  useEffect(() => {
    if (!activeRun || activeRun.status === 'completed' || activeRun.status === 'failed') return;
    
    const interval = setInterval(async () => {
      const result = await safeFetch(`${API_URL}/migration/runs/${activeRun.id}`);
      if (result.success) {
        setActiveRun(result.data);
        fetchLogs(result.data.id);
        if (result.data.status === 'completed' || result.data.status === 'failed') {
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeRun?.id, activeRun?.status]);

  if (loading) {
    return (
      <div className="space-y-6 mt-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Mode Switcher */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border-2 border-indigo-100 shadow-xl flex max-w-md mx-auto">
        <button 
          onClick={() => setMode('export')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
            mode === 'export' ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Export SQL File</span>
        </button>
        <button 
          onClick={() => setMode('live')}
          className={`flex-1 py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
            mode === 'live' ? 'bg-indigo-600 text-white shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Push to Live Database</span>
        </button>
      </div>

      {mode === 'export' ? (
        <div className="bg-white border-2 border-dashed border-indigo-100 rounded-3xl p-10 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-3">
            <Database className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mb-2 uppercase tracking-tight">Generate SQL Dumps</h3>
          <p className="text-gray-500 text-sm mb-10 max-w-lg mx-auto leading-relaxed">
            Download your staging data as portable SQL files. These files are optimized for the <code>public</code> schema and ready for import into any PostgreSQL environment.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => handleExport('clean')}
              disabled={exporting !== null}
              className="bg-gray-50 hover:bg-white border-2 border-gray-100 hover:border-indigo-500 p-6 rounded-2xl transition-all group text-left shadow-sm hover:shadow-xl"
            >
              <div className="bg-white p-2 w-10 h-10 rounded-lg shadow-sm mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trash2 className="w-5 h-5 text-gray-400" />
              </div>
              <h4 className="font-black text-gray-800 text-sm mb-1 uppercase tracking-widest">Clean Dump</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Original schema structure</p>
            </button>
            <button 
              onClick={() => handleExport('translated')}
              disabled={exporting !== null}
              className="bg-gray-50 hover:bg-white border-2 border-gray-100 hover:border-indigo-500 p-6 rounded-2xl transition-all group text-left shadow-sm hover:shadow-xl"
            >
              <div className="bg-white p-2 w-10 h-10 rounded-lg shadow-sm mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RefreshCw className="w-5 h-5 text-blue-500" />
              </div>
              <h4 className="font-black text-gray-800 text-sm mb-1 uppercase tracking-widest">Translated SQL</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Dialect compatible (Soon)</p>
            </button>
            <button 
              onClick={() => handleExport('migration')}
              disabled={exporting !== null}
              className="bg-indigo-50 hover:bg-white border-2 border-indigo-100 hover:border-indigo-600 p-6 rounded-2xl transition-all group text-left shadow-sm hover:shadow-xl"
            >
              <div className="bg-white p-2 w-10 h-10 rounded-lg shadow-sm mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="font-black text-indigo-900 text-sm mb-1 uppercase tracking-widest">Migration Ready</h4>
              <p className="text-[10px] text-indigo-400 font-bold uppercase">Sanitized Public Schema</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          {/* Guidance Alert */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start space-x-4">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Live Destination Connection</h4>
              <p className="text-xs text-blue-700 leading-relaxed uppercase font-medium">
                This is optional. Use this only if you want SQAuto to directly push data into a live database. 
                If you only want a migrated .sql file, use <strong>Export SQL File</strong> mode above.
              </p>
            </div>
          </div>

          <ConnectionPanel onTargetSaved={fetchTargets} />
          <TargetList 
            targets={targets} 
            onDelete={deleteTarget} 
            onSelect={setSelectedTargetId} 
            onEdit={setEditingTarget}
            selectedId={selectedTargetId} 
          />
          <DryRunPanel 
            selectedTarget={selectedTarget}
            isTested={testedTargets[selectedTargetId] || false}
            onTestSuccess={() => setTestedTargets(prev => ({...prev, [selectedTargetId]: true}))}
            onRunCreated={() => { fetchRuns(); }} 
          />
          <MigrationPlanPanel 
            selectedTarget={selectedTarget} 
            isTested={testedTargets[selectedTargetId] || false}
            onRunCreated={() => { fetchRuns(); }} 
          />
        </div>
      )}

      {/* Shared Panels (Bottom) */}
      <div className="pt-10 border-t-2 border-gray-100 space-y-6">
        <div className="flex items-center space-x-4 mb-2">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Execution History & Analysis</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>
        
        <IntegrityIssuesPanel />
        <FixSuggestionsPanel />
        {selectedTargetId && <MappingSuggestionsPanel targetId={selectedTargetId} />}
        <SchemaMappingPanel />
        <ReconciliationPanel run={activeRun} />
        <LogsPanel logs={logs} />
      </div>

      <DestinationConnectionModal
        connection={editingTarget as any}
        onClose={() => setEditingTarget(null)}
        onSave={handleEditTargetSave}
        onTest={handleEditTargetTest}
        onDelete={async (id) => { await deleteTarget(id); }}
      />
    </div>
  );
}


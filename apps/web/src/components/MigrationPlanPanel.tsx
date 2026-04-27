import React, { useState } from 'react';
import { useJob } from '@/components/JobProvider';
import { Play, AlertTriangle, ShieldCheck, Loader2, PlayCircle, ShieldAlert, FileJson, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type MigrationTablePlan = {
  name: string;
  action: string;
  row_count: number;
  mapping_applied: boolean;
};

type MigrationPlan = {
  id?: string;
  tables: MigrationTablePlan[];
  total_rows: number;
  risk_level: string;
  blocking_issues: string[];
  warnings: string[];
};

export default function MigrationPlanPanel({ selectedTargetId, onRunCreated }: { selectedTargetId: string, onRunCreated: () => void }) {
  const { activeJob } = useJob();
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<MigrationPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const jobId = activeJob?.id || activeJob?.job_id || "";

  const generatePlan = async () => {
    if (!jobId || !selectedTargetId) return;
    setLoadingPlan(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/migration/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId, target_id: selectedTargetId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate plan");
      setPlan(data);
    } catch (e: any) {
      setError(e.message || "Unknown error generating plan");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleExecute = async (mode: 'preview' | 'execute') => {
    if (!jobId || !selectedTargetId) return;
    setExecuting(true);
    setShowConfirm(false);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/migration/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId, target_id: selectedTargetId, mode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Failed to start ${mode}`);
      onRunCreated();
    } catch (e: any) {
      setError(e.message || "Unknown error starting execution");
    } finally {
      setExecuting(false);
    }
  };

  if (!selectedTargetId) return null;

  return (
    <>
      <div className="bg-white border-2 border-indigo-100 rounded-2xl shadow-xl overflow-hidden mt-6">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-3 text-white">
            <ShieldCheck className="w-5 h-5 text-indigo-200" />
            <h3 className="text-sm font-black uppercase tracking-widest">Phase 3: Migration Execution Engine</h3>
          </div>
        </div>

        <div className="p-6">
          {!plan ? (
            <div className="text-center py-10">
              <FileJson className="w-12 h-12 text-indigo-100 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-6">Generate a migration plan to assess risks and preview changes before execution.</p>
              <button 
                onClick={generatePlan}
                disabled={loadingPlan}
                className="mx-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                {loadingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Loader2 className="w-4 h-4" />}
                <span>{loadingPlan ? 'Analyzing Data...' : 'Generate Migration Plan'}</span>
              </button>
              {error && <p className="text-red-500 text-xs font-bold mt-4">{error}</p>}
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {plan.blocking_issues.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-600 shadow-[0_0_15px_#dc2626]"></div>
                  <h4 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center space-x-2 mb-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>EXECUTION BLOCKED</span>
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-red-900 font-mono space-y-1">
                    {plan.blocking_issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-3 border-t border-red-100 flex justify-end">
                    <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-[10px] font-black uppercase rounded transition transform hover:scale-105 active:scale-95" disabled>
                      Force Execute (Disabled for Safety)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Tables Affected</p>
                  <p className="text-2xl font-black text-gray-800">{plan.tables.length}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rows to Migrate</p>
                  <p className="text-2xl font-black text-gray-800">{plan.total_rows.toLocaleString()}</p>
                </div>
                <div className={`p-4 border rounded-xl flex items-center justify-between ${
                  plan.risk_level === 'CRITICAL' || plan.risk_level === 'HIGH' ? 'bg-red-50 border-red-200' :
                  plan.risk_level === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                       plan.risk_level === 'CRITICAL' || plan.risk_level === 'HIGH' ? 'text-red-400' :
                       plan.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>Risk Profile</p>
                    <p className={`text-2xl font-black ${
                       plan.risk_level === 'CRITICAL' || plan.risk_level === 'HIGH' ? 'text-red-800' :
                       plan.risk_level === 'MEDIUM' ? 'text-amber-800' : 'text-emerald-800'
                    }`}>{plan.risk_level}</p>
                  </div>
                  {plan.risk_level === 'CRITICAL' || plan.risk_level === 'HIGH' ? <ShieldAlert className="w-8 h-8 text-red-300" /> : <ShieldCheck className="w-8 h-8 text-emerald-300" />}
                </div>
              </div>

              {plan.warnings.length > 0 && !plan.blocking_issues.length && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Warnings Detected</span>
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-amber-900 font-mono space-y-1">
                    {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex border-t border-gray-100 pt-6 space-x-4">
                <button 
                  onClick={() => handleExecute('preview')}
                  disabled={executing || plan.blocking_issues.length > 0}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                  {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  <span>{executing ? 'Simulating...' : 'Run Preview (Rollback Default)'}</span>
                </button>
                <button 
                  onClick={() => setShowConfirm(true)}
                  disabled={executing || plan.blocking_issues.length > 0}
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Migration</span>
                </button>
              </div>
              {error && <p className="text-red-500 text-xs font-bold mt-4 text-center">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Execution Confirmation Modal */}
      {showConfirm && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-center text-gray-800 mb-2">CONFIRM TARGET EXECUTION</h2>
              <p className="text-center text-sm text-gray-600 font-medium mb-6">
                You are about to modify the target database. This operation will be wrapped in a transaction and automatically rolled back on error.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rows Affected</span>
                  <span className="text-sm font-bold text-gray-800">{plan.total_rows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Risk Level</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    plan.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>{plan.risk_level}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleExecute('execute')}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow hover:shadow-lg flex items-center justify-center"
                >
                  Confirm & Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

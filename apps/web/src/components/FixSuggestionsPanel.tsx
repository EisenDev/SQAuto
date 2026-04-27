import React, { useState, useEffect } from 'react';
import { useJob } from '@/components/JobProvider';
import { AlertTriangle, Wrench, ShieldAlert, ChevronRight, Eye, RefreshCw, XCircle, Info } from 'lucide-react';
import FixPreviewPanel from './FixPreviewPanel';
import Tooltip from './Tooltip';
import { GUIDANCE } from '@/lib/guidance';

interface Suggestion {
  id: string;
  issue_type: string;
  table: string;
  column: string | null;
  severity: string;
  recommended_action: string;
  description: string;
  options: { label: string; action: string; requires_input?: boolean }[];
}

export default function FixSuggestionsPanel() {
  const { activeJob } = useJob();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFix, setSelectedFix] = useState<{ suggestion: Suggestion, action: string, input?: string } | null>(null);
  
  const jobId = activeJob?.id || activeJob?.job_id;

  const fetchSuggestions = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/fixes/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId })
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [jobId]);

  if (!jobId || (!loading && suggestions.length === 0)) return null;

  return (
    <div className="bg-white border border-rose-100 rounded-2xl shadow-xl overflow-hidden mt-6">
      <div className="bg-gradient-to-r from-rose-800 to-rose-900 p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wrench className="w-5 h-5 text-rose-400" />
          <h3 className="font-black text-sm text-white tracking-widest uppercase italic flex items-center">
            {GUIDANCE.FIXES.PREVIEW_TITLE}
            <Tooltip content={GUIDANCE.FIXES.PREVIEW_HELP} />
          </h3>
        </div>
        <button onClick={fetchSuggestions} className="text-rose-200 hover:text-white transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="p-6 bg-rose-50/30">
        <p className="text-xs text-justify text-gray-500 font-mono mb-6">
          Fix Suggestions recommend safe ways to clean staging data. Nothing is changed until you preview and approve.
        </p>

        <div className="space-y-4">
          {suggestions.map(s => (
            <div key={s.id} className="bg-white p-4 border border-rose-100 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                {s.severity === 'critical' ? (
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {s.table}
                    </span>
                    {s.column && (
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                        .{s.column}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-gray-800 mt-2">{s.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <select 
                  className="bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onChange={(e) => setSelectedFix({ suggestion: s, action: e.target.value })}
                  defaultValue=""
                >
                  <option value="" disabled>Select Action...</option>
                  {s.options.map(opt => (
                    <option key={opt.action} value={opt.action}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const selectEl = document.querySelector(`select`) as HTMLSelectElement;
                  }}
                  disabled={!selectedFix || selectedFix.suggestion.id !== s.id}
                  className="bg-rose-600 text-white rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase hover:bg-rose-700 transition disabled:opacity-50 flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview Fix</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedFix && (
        <FixPreviewPanel
          jobId={jobId}
          suggestionId={selectedFix.suggestion.id}
          action={selectedFix.action}
          onClose={() => setSelectedFix(null)}
        />
      )}
    </div>
  );
}

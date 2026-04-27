import React, { useState, useEffect } from 'react';
import { useJob } from '@/components/JobProvider';
import { Network, Search, Check, X, Info } from 'lucide-react';
import Tooltip from './Tooltip';
import { GUIDANCE } from '@/lib/guidance';
import { safeFetch } from '@/lib/api_client';

interface MappingSuggestion {
  source_column: string;
  target_column: string;
  confidence: number;
  type_match: boolean;
  reason: string;
}

interface TableSuggestions {
  table: string;
  suggestions: MappingSuggestion[];
}

export default function MappingSuggestionsPanel({ targetId }: { targetId: string }) {
  const { activeJob } = useJob();
  const [tableSuggestions, setTableSuggestions] = useState<TableSuggestions[]>([]);
  const [loading, setLoading] = useState(false);
  
  const jobId = activeJob?.id || activeJob?.job_id;

  useEffect(() => {
    async function loadSuggestions() {
      if (!jobId || !targetId) return;
      setLoading(true);
      const result = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/migration/mapping/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_job_id: jobId, target_id: targetId })
      });
      if (result.success) {
        setTableSuggestions(result.data.suggestions || []);
      }
      setLoading(false);
    }
    loadSuggestions();
  }, [jobId, targetId]);

  if (!jobId || !targetId || (!loading && tableSuggestions.length === 0)) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl shadow-inner overflow-hidden my-4 p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Network className="w-4 h-4 text-indigo-500" />
        <h4 className="font-black text-[11px] text-indigo-900 tracking-widest uppercase flex items-center">
          {GUIDANCE.MAPPING.TITLE}
          <Tooltip content={GUIDANCE.MAPPING.AUTO_HELP} />
        </h4>
      </div>

      {loading ? (
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono">
          <Search className="w-3 h-3 animate-pulse" />
          <span>Analyzing schema structural similarities...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {tableSuggestions.map(ts => (
            <div key={ts.table} className="bg-white rounded-xl border border-indigo-50 shadow-sm p-3">
              <div className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest px-1">
                TABLE: {ts.table}
              </div>
              <div className="grid gap-2">
                {ts.suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg p-2 filter hover:brightness-95 transition-all">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-600 bg-white px-2 py-0.5 border rounded-md">{s.source_column}</div>
                      <span className="text-gray-300">→</span>
                      <div className="text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-200 rounded-md font-bold">{s.target_column}</div>
                      
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black border ${s.confidence === 1.0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                        {Math.round(s.confidence * 100)}% Match
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button className="p-1 rounded bg-white text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border shadow-sm transition-colors group relative">
                        <Check className="w-3 h-3" />
                        <span className="absolute bottom-full mb-1 right-0 hidden group-hover:block bg-gray-800 text-white text-[9px] px-2 py-1 rounded">Accept</span>
                      </button>
                      <button className="p-1 rounded bg-white text-gray-400 hover:bg-red-50 hover:text-red-500 border shadow-sm transition-colors group relative">
                        <X className="w-3 h-3" />
                        <span className="absolute bottom-full mb-1 right-0 hidden group-hover:block bg-gray-800 text-white text-[9px] px-2 py-1 rounded">Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

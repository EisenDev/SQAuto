import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, X, Activity, Info } from 'lucide-react';
import Tooltip from './Tooltip';
import { GUIDANCE } from '@/lib/guidance';

interface FixPreviewPanelProps {
  jobId: string;
  suggestionId: string;
  action: string;
  onClose: () => void;
}

export default function FixPreviewPanel({ jobId, suggestionId, action, onClose }: FixPreviewPanelProps) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/fixes/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_job_id: jobId,
            suggestion_id: suggestionId,
            selected_action: action,
            options: {}
          })
        });
        const data = await res.json();
        setPreview(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [jobId, suggestionId, action]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-gray-400" />
            <h3 className="font-black text-sm text-white tracking-widest uppercase italic flex items-center">
              {GUIDANCE.FIXES.PREVIEW_TITLE}
              <Tooltip content={GUIDANCE.FIXES.PREVIEW_HELP} />
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-xs font-mono font-bold uppercase animate-pulse">
              Computing preview geometry...
            </div>
          ) : preview ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {preview.safe_to_apply ? (
                    <span className="flex items-center space-x-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-black text-xs uppercase tracking-widest border border-emerald-200">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Safe Limit Bound</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5 bg-red-100 text-red-800 px-3 py-1 rounded font-black text-xs uppercase tracking-widest border border-red-200">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Destructive Action</span>
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-mono">
                    Est. Affected Rows: <strong>{preview.estimated_rows_affected}</strong>
                  </span>
                </div>
              </div>

              {preview.warnings && preview.warnings.length > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  {preview.warnings.map((w: string, i: number) => (
                    <p key={i} className="text-xs text-amber-800 font-bold">{w}</p>
                  ))}
                </div>
              )}

              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Sample Impact (LIMIT 5)</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50">
                <table className="w-full text-left text-sm font-mono">
                  <thead className="bg-gray-100 text-[10px] uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 font-bold w-1/4">Identifier (PK)</th>
                      <th className="px-4 py-2 font-bold w-3/8 text-red-600">Before</th>
                      <th className="px-4 py-2 font-bold w-3/8 text-emerald-600">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 [&_tr:last-child]:border-0 text-xs text-gray-700">
                    {preview.sample_before_after?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-100 transition-colors">
                        <td className="px-4 py-3">{row.pk}</td>
                        <td className="px-4 py-3 text-red-500 bg-red-50/50">{String(row.before)}</td>
                        <td className="px-4 py-3 text-emerald-600 bg-emerald-50/50">{String(row.after)}</td>
                      </tr>
                    ))}
                    {(!preview.sample_before_after || preview.sample_before_after.length === 0) && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No samples available</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  onClick={onClose}
                  className="px-5 py-2 hover:bg-gray-100 rounded-lg text-xs font-black uppercase text-gray-500 tracking-widest transition"
                >
                  Cancel
                </button>
                <div className="relative group">
                  <button 
                    disabled 
                    className="px-6 py-2 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-widest opacity-50 cursor-not-allowed"
                  >
                    Apply to Staging Copy
                  </button>
                  <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-[10px] p-2 rounded shadow-xl text-center">
                    Preview Only — staging apply not enabled yet.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-500">Failed to load preview.</div>
          )}
        </div>
      </div>
    </div>
  );
}

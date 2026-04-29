"use client";
import React from 'react';
import { History, CheckCircle2, ChevronRight, FileCode, Clock, ExternalLink } from 'lucide-react';
import { Job } from '@/lib/api';

interface SqlJobHistoryProps {
  jobs: Job[];
  onActivate: (jobId: string) => void;
  onViewDetails: (jobId: string) => void;
}

export default function SqlJobHistory({ jobs, onActivate, onViewDetails }: SqlJobHistoryProps) {
  if (jobs.length <= 1) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <History className="h-5 w-5 text-slate-600" />
        <h2 className="text-xl font-bold text-white tracking-tight">SQL Source History</h2>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl border border-slate-800/50 bg-slate-900/20">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800/50 bg-slate-950/30">
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Filename</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingestion Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {jobs.map((job) => (
              <tr key={job.id || job.job_id} className={`group hover:bg-slate-800/20 transition-colors ${job.is_active ? 'bg-teal-500/5' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <FileCode className={`h-4 w-4 ${job.is_active ? 'text-teal-400' : 'text-slate-600'}`} />
                    <div>
                      <p className={`text-sm font-bold ${job.is_active ? 'text-white' : 'text-slate-300'}`}>
                        {job.original_filename || job.filename}
                      </p>
                      <p className="text-[10px] font-mono text-slate-600">{job.id || job.job_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-slate-400 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(job.created_at!).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    job.status === 'completed' ? 'bg-teal-500/10 text-teal-500 border-teal-500/20' :
                    job.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    {!job.is_active && job.status === 'completed' && (
                      <button 
                        onClick={() => onActivate(job.id || job.job_id!)}
                        className="text-[10px] font-black text-teal-500 hover:text-teal-400 uppercase tracking-widest px-3 py-1 bg-teal-500/5 rounded-md border border-teal-500/20 transition-all hover:bg-teal-500/10"
                      >
                        Set as Active
                      </button>
                    )}
                    {job.is_active && (
                      <span className="flex items-center space-x-1.5 text-[10px] font-black text-teal-400 uppercase tracking-widest mr-2">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                    <button 
                      onClick={() => onViewDetails(job.id || job.job_id!)}
                      className="p-2 text-slate-500 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

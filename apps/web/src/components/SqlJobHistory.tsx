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
        <History className="h-5 w-5 text-stone-400" />
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">SQL Source History</h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Source Filename</th>
              <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Ingestion Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-stone-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {jobs.map((job) => (
              <tr key={job.id || job.job_id} className={`group hover:bg-stone-50 transition-colors ${job.is_active ? 'bg-teal-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <FileCode className={`h-4 w-4 ${job.is_active ? 'text-teal-600' : 'text-stone-400'}`} />
                    <div>
                      <p className={`text-sm font-bold ${job.is_active ? 'text-stone-900' : 'text-stone-700'}`}>
                        {job.original_filename || job.filename}
                      </p>
                      <p className="text-[10px] font-mono text-stone-400">{job.id || job.job_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-stone-500 font-medium text-xs">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    <span>{new Date(job.created_at!).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    job.status === 'completed' ? 'bg-teal-550/10 bg-teal-50 text-teal-600 border-teal-200' :
                    job.status === 'failed' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    'bg-stone-100 text-stone-500 border-stone-200'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    {!job.is_active && job.status === 'completed' && (
                      <button 
                        onClick={() => onActivate(job.id || job.job_id!)}
                        className="text-[10px] font-black text-teal-600 hover:text-teal-700 uppercase tracking-widest px-3 py-1 bg-teal-50 rounded-md border border-teal-200 transition-all hover:bg-teal-100/50"
                      >
                        Set as Active
                      </button>
                    )}
                    {job.is_active && (
                      <span className="flex items-center space-x-1.5 text-[10px] font-black text-teal-600 uppercase tracking-widest mr-2">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    )}
                    <button 
                      onClick={() => onViewDetails(job.id || job.job_id!)}
                      className="p-2 text-stone-400 hover:text-stone-700 transition-colors"
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

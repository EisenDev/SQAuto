"use client";
import React from 'react';
import { 
  FileText, HardDrive, Clock, Hash, Database, 
  Activity, RefreshCcw, Trash2, Terminal, Download,
  CheckCircle2, AlertCircle, Loader2, Table
} from 'lucide-react';
import { Job } from '@/lib/api';

interface SqlSourceOverviewProps {
  job: Job;
  onReupload: () => void;
  onReset: () => void;
  onViewLogs: () => void;
}

export default function SqlSourceOverview({ job, onReupload, onReset, onViewLogs }: SqlSourceOverviewProps) {
  const profile = job.profile || {};
  const tables = profile.tables || {};
  const tableCount = Object.keys(tables).length;
  const rowCount = Object.values(tables).reduce((acc: number, t: any) => acc + (t.rows || 0), 0);
  const dialect = profile.metadata?.dialect || "Unknown";
  const duration = profile.metadata?.duration_sec ? `${Math.round(profile.metadata.duration_sec)}s` : "N/A";
  const fileSize = job.file_size ? (job.file_size / (1024 * 1024)).toFixed(2) : "0";

  const isProcessing = job.status === 'restoring' || job.status === 'analyzing';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* A. SOURCE SUMMARY CARD */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-slate-800/50 bg-slate-900/40 space-y-8 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-500/20">
                <FileText className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{job.original_filename || job.filename}</h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">{job.id || job.job_id}</p>
              </div>
            </div>
            {job.status === 'completed' && <CheckCircle2 className="h-6 w-6 text-teal-500" />}
            {job.status === 'failed' && <AlertCircle className="h-6 w-6 text-red-500" />}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">File Size</p>
              <p className="text-sm font-bold text-slate-300">{fileSize} MB</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Compression</p>
              <p className="text-sm font-bold text-slate-300">{job.filename.endsWith('.gz') ? 'Gzip' : 'None'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ingested At</p>
              <p className="text-sm font-bold text-slate-300">{new Date(job.created_at!).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Dialect</p>
              <p className="text-sm font-bold text-teal-400 uppercase">{dialect}</p>
            </div>
          </div>

          {/* B. EXTRACTION STATUS */}
          <div className="pt-8 border-t border-slate-800/50">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                <Activity className="h-4 w-4 mr-2 text-teal-500" />
                Extraction Metrics
              </h4>
              {isProcessing && (
                <div className="flex items-center space-x-2 text-teal-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Live Processing</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Tables</p>
                <p className="text-2xl font-black text-white">{tableCount}</p>
              </div>
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Rows</p>
                <p className="text-2xl font-black text-white">{rowCount.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-2xl font-black text-white">{duration}</p>
              </div>
            </div>
          </div>
        </div>

        {/* C. ACTIONS PANEL */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800/50 bg-slate-900/20 flex flex-col space-y-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Operations Control</h4>
          
          <button 
            onClick={onReupload}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center space-x-3 group"
          >
            <RefreshCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            <span>RE-UPLOAD SOURCE</span>
          </button>

          <button 
            onClick={onViewLogs}
            className="w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl border border-slate-800/50 transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <Terminal className="h-4 w-4" />
            <span>VIEW FULL LOGS</span>
          </button>

          <div className="flex-grow" />

          <button 
            onClick={onReset}
            className="w-full py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 font-bold rounded-2xl border border-red-500/20 transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <Trash2 className="h-4 w-4" />
            <span>RESET PROJECT DATA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

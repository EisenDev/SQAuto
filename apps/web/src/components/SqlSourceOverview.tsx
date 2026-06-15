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
  const metadata = profile.metadata || {};
  const tables = profile.tables || {};
  const hasProfile = Object.keys(tables).length > 0 || Number(metadata.table_count || 0) > 0;
  const tableCount = Number(metadata.table_count || Object.keys(tables).length || 0);
  const rowCount = Number(metadata.total_rows || 0);
  const dialect = metadata.flavor || metadata.dialect || "Unknown";
  const durationSeconds = Number(metadata.duration_sec || 0);
  const duration = durationSeconds > 0 ? `${Math.round(durationSeconds)}s` : "Analysis still processing";
  const fileSize = job.file_size ? `${(job.file_size / (1024 * 1024)).toFixed(2)} MB` : "Pending";
  const createdAt = job.created_at && !Number.isNaN(new Date(job.created_at).getTime())
    ? new Date(job.created_at).toLocaleDateString()
    : "Pending";

  const isProcessing = job.status === 'restoring' || job.status === 'analyzing';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* A. SOURCE SUMMARY CARD */}
        <div className="lg:col-span-2 p-8 rounded-3xl border border-stone-200 bg-white shadow-sm space-y-8 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-200">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 tracking-tight">{job.original_filename || job.filename}</h3>
                <p className="text-stone-400 text-xs font-mono uppercase tracking-widest font-medium">{job.id || job.job_id}</p>
              </div>
            </div>
            {job.status === 'completed' && <CheckCircle2 className="h-6 w-6 text-teal-600" />}
            {job.status === 'failed' && <AlertCircle className="h-6 w-6 text-rose-600" />}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">File Size</p>
              <p className="text-sm font-bold text-stone-700">{fileSize}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Compression</p>
              <p className="text-sm font-bold text-stone-700">{job.filename.endsWith('.gz') ? 'Gzip' : 'None'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Ingested At</p>
              <p className="text-sm font-bold text-stone-700">{createdAt}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Dialect</p>
              <p className="text-sm font-bold text-teal-600 uppercase">{dialect}</p>
            </div>
          </div>

          {/* B. EXTRACTION STATUS */}
          <div className="pt-8 border-t border-stone-200">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest flex items-center">
                <Activity className="h-4 w-4 mr-2 text-teal-650" />
                Extraction Metrics
              </h4>
              {isProcessing && (
                <div className="flex items-center space-x-2 text-teal-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Live Processing</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Tables</p>
                <p className="text-2xl font-black text-stone-900">{hasProfile ? tableCount : "—"}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Rows</p>
                <p className="text-2xl font-black text-stone-900">{hasProfile ? rowCount.toLocaleString() : "Analysis still processing"}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-2xl font-black text-stone-900">{duration}</p>
              </div>
            </div>
          </div>
        </div>

        {/* C. ACTIONS PANEL */}
        <div className="p-8 rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col space-y-4">
          <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Operations Control</h4>
          
          <button 
            onClick={onReupload}
            className="w-full py-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-2xl border border-stone-200 transition-all active:scale-95 flex items-center justify-center space-x-3 group"
          >
            <RefreshCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            <span>RE-UPLOAD SOURCE</span>
          </button>

          <button 
            onClick={onViewLogs}
            className="w-full py-4 bg-stone-550/10 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold rounded-2xl border border-stone-200 transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <Terminal className="h-4 w-4 text-stone-550" />
            <span>VIEW FULL LOGS</span>
          </button>

          <div className="flex-grow" />

          <button 
            onClick={onReset}
            className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-650 font-bold rounded-2xl border border-rose-200 transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <Trash2 className="h-4 w-4" />
            <span>RESET PROJECT DATA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

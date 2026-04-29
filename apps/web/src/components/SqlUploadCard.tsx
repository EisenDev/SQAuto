"use client";
import React, { useState, useEffect } from 'react';
import { Terminal, Activity, HardDrive, Database, CheckCircle, AlertCircle, Table, Layers, Upload, X, ChevronRight } from 'lucide-react';
import { uploadDump, restoreJob, Job } from '@/lib/api';
import { safeFetch } from '@/lib/api_client';

interface SqlUploadCardProps {
  projectId: string;
  onSuccess: (job: Job) => void;
}

export default function SqlUploadCard({ projectId, onSuccess }: SqlUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState({ restoration: "", trace: "" });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Poll for logs when restoring
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showConsole && job?.status === 'restoring') {
      interval = setInterval(async () => {
        const [resLog, traceLog] = await Promise.all([
          safeFetch(`${API_URL}/debug/restoration-log`),
          safeFetch(`${API_URL}/debug/pipe-trace`)
        ]);
        setLogs({
          restoration: resLog.success ? resLog.data.log : "Connecting to stream...",
          trace: traceLog.success ? traceLog.data.log : "Tracing pipe..."
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showConsole, job?.status, API_URL]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const startUpload = async () => {
    if (!file || !projectId) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setStatus("Initializing industrial upload...");

    try {
      const result = await uploadDump(file, projectId, (p) => {
        const percent = Math.round((p.loaded / p.total) * 100);
        setProgress(percent);
        if (percent === 100) setStatus("Assembling chunks...");
      });

      setJob(result);
      setStatus("Starting restoration pipeline...");
      
      // Trigger background restore
      await restoreJob(result.id || result.job_id!);
      
      // Notify parent
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please check network connectivity.");
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative background pulse */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-500/20">
              <Upload className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Industrial SQL Ingestion</h2>
              <p className="text-slate-400 text-sm">Upload your database dump to initialize the migration staging area.</p>
            </div>
          </div>

          {!uploading && !job ? (
            <div className="space-y-6">
              <div 
                className={`group relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                  file ? 'border-teal-500/40 bg-teal-500/5' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                }`}
              >
                <input 
                  type="file" 
                  accept=".sql,.gz" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                
                <div className="space-y-4">
                  <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Database className={`h-8 w-8 ${file ? 'text-teal-400' : 'text-slate-500'}`} />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-lg font-bold text-white">{file.name}</p>
                      <p className="text-teal-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for pipeline</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium text-slate-300">Click or drag to upload SQL dump</p>
                      <p className="text-slate-500 text-sm mt-1">Supports .sql or .sql.gz (compressed recommended)</p>
                    </div>
                  )}
                </div>
              </div>

              {file && (
                <button 
                  onClick={startUpload}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 group"
                >
                  <span>INITIALIZE PIPELINE</span>
                  <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Progress Display */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-teal-500 uppercase tracking-widest">{status}</p>
                    <p className="text-lg font-bold text-white">{file?.name}</p>
                  </div>
                  <span className="text-3xl font-black text-white">{progress}%</span>
                </div>
                
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                  <div 
                    className="h-full bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-500 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${progress > 0 ? 'bg-teal-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ingestion Active</span>
                </div>
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${job ? 'bg-teal-500 animate-pulse' : 'bg-slate-700'}`} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Restore Pipeline</span>
                </div>
              </div>

              {/* Live Console Toggle */}
              {job && (
                <div className="pt-4 border-t border-slate-800/50">
                  <button 
                    onClick={() => setShowConsole(!showConsole)}
                    className="text-xs font-bold text-teal-500 hover:text-teal-400 flex items-center space-x-2 transition-colors"
                  >
                    <Activity className="h-4 w-4" />
                    <span>{showConsole ? 'HIDE' : 'VIEW'} LIVE RESTORATION STREAM</span>
                  </button>
                  
                  {showConsole && (
                    <div className="mt-4 bg-slate-950 rounded-2xl border border-slate-800 p-6 font-mono text-[11px] space-y-4 overflow-hidden">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-slate-500">[$] tail -f /var/log/restoration.log</span>
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500/20" />
                          <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                          <div className="w-2 h-2 rounded-full bg-teal-500/50 animate-pulse" />
                        </div>
                      </div>
                      <div className="h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        <p className="text-emerald-500/80">{logs.restoration || "Listening for database events..."}</p>
                        <p className="text-slate-600 italic border-t border-slate-900 pt-2">{logs.trace || "Tracing industrial pipe status..."}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 animate-in shake-in duration-500">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg">
                <X className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center space-x-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-3 w-3" />
          <span>Read-Only Source</span>
        </div>
        <div className="h-1 w-1 bg-slate-800 rounded-full" />
        <div className="flex items-center space-x-2">
          <Layers className="h-3 w-3" />
          <span>Staging Isolation</span>
        </div>
        <div className="h-1 w-1 bg-slate-800 rounded-full" />
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-3 w-3" />
          <span>Audit Trail Active</span>
        </div>
      </div>
    </div>
  );
}

import { ShieldCheck } from 'lucide-react';

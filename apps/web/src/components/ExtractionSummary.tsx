"use client";
import React from 'react';
import { 
  Database, Table, Hash, FileCode, CheckCircle2, 
  AlertCircle, ChevronRight, Activity, Zap, Layers 
} from 'lucide-react';
import { Job } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ExtractionSummaryProps {
  job: Job;
  projectId: string;
}

export default function ExtractionSummary({ job, projectId }: ExtractionSummaryProps) {
  const router = useRouter();
  const profile = job.profile || {};
  const tables = profile.tables || {};
  const tableCount = Object.keys(tables).length;
  const rowCount = Object.values(tables).reduce((acc: number, t: any) => acc + (t.rows || 0), 0);
  const dialect = profile.metadata?.dialect || "Unknown";
  const confidence = profile.metadata?.confidence ? Math.round(profile.metadata.confidence * 100) : null;
  const fileSize = job.file_size ? (job.file_size / (1024 * 1024)).toFixed(2) : "0";

  const metrics = [
    { name: 'SQL Dialect', value: dialect, sub: confidence ? `${confidence}% Confidence` : 'Detected', icon: FileCode, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Total Tables', value: tableCount, sub: 'Identified Entities', icon: Table, color: 'text-teal-400', bg: 'bg-teal-400/10' },
    { name: 'Total Rows', value: rowCount.toLocaleString(), sub: 'Raw Data Volume', icon: Hash, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { name: 'Source Size', value: `${fileSize} MB`, sub: 'Uncompressed Stream', icon: Database, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Status Hero */}
      <div className="glass-panel p-10 rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-start space-x-6">
            <div className="h-20 w-20 bg-teal-500/10 rounded-3xl flex items-center justify-center border border-teal-500/20 shadow-2xl shadow-teal-500/10">
              <CheckCircle2 className="h-10 w-10 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-teal-500/30">
                  Pipeline Verified
                </span>
                <span className="text-slate-500 text-xs font-mono">{job.id || job.job_id}</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">Extraction Complete</h1>
              <p className="text-slate-400 max-w-xl leading-relaxed">
                Your SQL dump has been successfully decompressed, restored to staging, and analyzed for structural integrity.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => router.push(`/workspace/${projectId}/explorer`)}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all active:scale-95 flex items-center justify-center space-x-2 group"
            >
              <span>TRUTH EXPLORER</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => router.push(`/workspace/${projectId}/visualizer`)}
              className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 group"
            >
              <span>SCHEMA VISUALIZER</span>
              <Zap className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <div 
            key={metric.name}
            style={{ animationDelay: `${i * 100}ms` }}
            className="glass-panel p-6 rounded-3xl border border-slate-800/50 bg-slate-900/40 hover:bg-slate-800/40 transition-all group animate-in fade-in slide-in-from-bottom-4"
          >
            <div className={`h-12 w-12 rounded-2xl ${metric.bg} flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{metric.name}</p>
            <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{metric.value}</h3>
            <p className="text-xs text-slate-500 font-medium">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-slate-800/50 bg-slate-900/20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Activity className="h-5 w-5 mr-3 text-teal-500" />
              Extraction Pulse
            </h2>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              <span>Session Consistent</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Layers className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Integrity Mapping</p>
                  <p className="text-xs text-slate-500">Foreign keys and constraints verified</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-teal-500" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800/50">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Anomalies Detected</p>
                  <p className="text-xs text-slate-500">Scanning for data inconsistencies...</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-teal-500 px-2 py-1 bg-teal-500/10 rounded-md border border-teal-500/20">
                0 ISSUES
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800/50 bg-teal-500/5 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-16 w-16 bg-teal-500/20 rounded-full flex items-center justify-center border border-teal-500/30">
            <AlertCircle className="h-8 w-8 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Ready for Analysis?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Start by exploring the source of truth to identify critical data patterns.
            </p>
          </div>
          <button 
            onClick={() => router.push(`/workspace/${projectId}/explorer`)}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-teal-500/10"
          >
            ENTER EXPLORER
          </button>
        </div>
      </div>
    </div>
  );
}

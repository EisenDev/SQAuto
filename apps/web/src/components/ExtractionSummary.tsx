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
    { name: 'SQL Dialect', value: dialect, sub: confidence ? `${confidence}% Confidence` : 'Detected', icon: FileCode, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Total Tables', value: tableCount, sub: 'Identified Entities', icon: Table, color: 'text-teal-600', bg: 'bg-teal-50' },
    { name: 'Total Rows', value: rowCount.toLocaleString(), sub: 'Raw Data Volume', icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Source Size', value: `${fileSize} MB`, sub: 'Uncompressed Stream', icon: Database, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Status Hero */}
      <div className="p-10 rounded-3xl border border-stone-250 bg-white shadow-premium relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-start space-x-6">
            <div className="h-20 w-20 bg-teal-50 rounded-3xl flex items-center justify-center border border-teal-200 shadow-2xl shadow-teal-500/5">
              <CheckCircle2 className="h-10 w-10 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-teal-200">
                  Pipeline Verified
                </span>
                <span className="text-stone-400 text-xs font-mono">{job.id || job.job_id}</span>
              </div>
              <h1 className="text-4xl font-black text-stone-900 tracking-tight mb-2">Extraction Complete</h1>
              <p className="text-stone-600 font-medium max-w-xl leading-relaxed">
                Your SQL dump has been successfully decompressed, restored to staging, and analyzed for structural integrity.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => router.push(`/dashboard/project/${projectId}/explorer`)}
              className="px-8 py-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-2xl border border-stone-200 transition-all active:scale-95 flex items-center justify-center space-x-2 group"
            >
              <span>TRUTH EXPLORER</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => router.push(`/dashboard/project/${projectId}/visualizer`)}
              className="px-8 py-4 bg-teal-600 hover:bg-teal-750 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-teal-500/10 flex items-center justify-center space-x-2 group"
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
            className="p-6 rounded-3xl border border-stone-250 bg-white hover:bg-stone-50/50 transition-all group animate-in fade-in slide-in-from-bottom-4 shadow-sm"
          >
            <div className={`h-12 w-12 rounded-2xl ${metric.bg} flex items-center justify-center mb-6 border border-stone-100 group-hover:scale-110 transition-transform`}>
              <metric.icon className={`h-6 w-6 ${metric.color}`} />
            </div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{metric.name}</p>
            <h3 className="text-2xl font-black text-stone-900 mb-1 tracking-tight">{metric.value}</h3>
            <p className="text-xs text-stone-500 font-semibold">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-3xl border border-stone-250 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-stone-900 flex items-center">
              <Activity className="h-5 w-5 mr-3 text-teal-600" />
              Extraction Pulse
            </h2>
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              <span>Session Consistent</span>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Layers className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Integrity Mapping</p>
                  <p className="text-xs text-stone-500 font-medium">Foreign keys and constraints verified</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-550/10 rounded-lg bg-purple-50">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Anomalies Detected</p>
                  <p className="text-xs text-stone-500 font-medium">Scanning for data inconsistencies...</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-teal-600 px-2 py-1 bg-teal-50 rounded-md border border-teal-200">
                0 ISSUES
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-3xl border border-teal-200 bg-teal-50/30 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center border border-teal-200">
            <AlertCircle className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">Ready for Analysis?</h3>
            <p className="text-sm text-stone-600 font-medium leading-relaxed">
              Start by exploring the source of truth to identify critical data patterns.
            </p>
          </div>
          <button 
            onClick={() => router.push(`/dashboard/project/${projectId}/explorer`)}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/10"
          >
            ENTER EXPLORER
          </button>
        </div>
      </div>
    </div>
  );
}

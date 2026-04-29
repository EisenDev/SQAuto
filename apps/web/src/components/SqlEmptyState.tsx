"use client";
import React from 'react';
import { Upload, Database, Layers, ChevronRight, HardDrive } from 'lucide-react';
import SqlUploadCard from './SqlUploadCard';

interface SqlEmptyStateProps {
  projectId: string;
  onSuccess: (job: any) => void;
}

export default function SqlEmptyState({ projectId, onSuccess }: SqlEmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-20 w-20 bg-teal-500/10 rounded-3xl flex items-center justify-center border border-teal-500/20 mx-auto shadow-2xl shadow-teal-500/5">
          <Database className="h-10 w-10 text-teal-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tight">Initialize Your Project with a SQL Source</h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            This project currently has no data. Upload a SQL dump to begin analysis, mapping, and industrial migration.
          </p>
        </div>
      </div>

      <SqlUploadCard projectId={projectId} onSuccess={onSuccess} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-slate-800/50">
        {[
          { icon: Upload, title: "1. Upload SQL", desc: "Select or drag your .sql or .sql.gz dump." },
          { icon: HardDrive, title: "2. Sandbox Restore", desc: "System restores data to an isolated staging area." },
          { icon: Layers, title: "3. Unlock Tools", desc: "Profiling and mapping tools unlock automatically." }
        ].map((step, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-500 group-hover:text-teal-400 transition-colors">
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">{step.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

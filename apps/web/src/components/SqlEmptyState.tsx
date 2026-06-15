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
    <div className="max-w-4xl mx-auto pt-6 pb-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="h-16 w-16 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-250 mx-auto">
          <Database className="h-8 w-8 text-teal-600" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Initialize Project Source</h2>
          <p className="text-stone-500 text-sm max-w-lg mx-auto font-medium">
            Upload a SQL dump to begin analysis and mapping.
          </p>
        </div>
      </div>

      <SqlUploadCard projectId={projectId} onSuccess={onSuccess} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-stone-200">
        {[
          { icon: Upload, title: "1. Upload SQL", desc: "Select or drag your .sql or .sql.gz dump." },
          { icon: HardDrive, title: "2. Sandbox Restore", desc: "System restores data to an isolated staging area." },
          { icon: Layers, title: "3. Unlock Tools", desc: "Profiling and mapping tools unlock automatically." }
        ].map((step, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 group-hover:text-teal-600 transition-colors">
              <step.icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">{step.title}</h4>
              <p className="text-xs text-stone-500 mt-1 font-medium">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

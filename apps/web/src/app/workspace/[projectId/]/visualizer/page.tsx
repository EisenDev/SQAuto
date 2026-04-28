'use client';

import React from 'react';
import { useJob } from '@/components/JobProvider';
import SchemaVisualizer from '@/components/SchemaVisualizer';
import { Maximize2, Share2 } from 'lucide-react';

export default function VisualizerPage() {
  const { activeJob } = useJob();

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Schema Visualizer</h1>
          <p className="text-slate-400 text-sm mt-1">Interactive relationship map of the extracted SQL schema.</p>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-medium text-slate-300 transition-colors border border-slate-700">
            <Share2 className="h-3.5 w-3.5" />
            <span>Export Graph</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-md text-xs font-medium text-white transition-colors border border-teal-500/50 shadow-sm shadow-teal-900/20">
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Auto Layout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-inner">
        <SchemaVisualizer 
          jobId={activeJob?.id || activeJob?.job_id || ""} 
          graph={activeJob?.profile?.graph || {nodes: [], edges: []}} 
        />
      </div>
    </div>
  );
}

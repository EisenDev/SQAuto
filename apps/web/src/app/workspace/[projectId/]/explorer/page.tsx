'use client';

import React from 'react';
import SourceTruthExplorer from '@/components/SourceTruthExplorer';
import { useJob } from '@/components/JobProvider';
import { Database, Search } from 'lucide-react';

export default function ExplorerPage() {
  const { activeJob } = useJob();
  const tables = activeJob?.profile?.tables || (activeJob?.profile && !activeJob.profile.metadata ? activeJob.profile : {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Source of Truth Explorer</h1>
          <p className="text-slate-400 text-sm mt-1">Deep row-level inspection of the restored staging data.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
            <Database className="h-4 w-4 mr-2 text-teal-400" />
            Live Data Preview
          </h2>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search in all tables..." 
              className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-slate-300 w-64 transition-all"
            />
          </div>
        </div>
        <SourceTruthExplorer 
          jobId={activeJob?.id || activeJob?.job_id || ""} 
          profile={tables} 
        />
      </div>
    </div>
  );
}

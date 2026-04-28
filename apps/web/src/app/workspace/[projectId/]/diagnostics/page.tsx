'use client';

import React from 'react';
import SummaryCard from '@/components/SummaryCard';
import TableView from '@/components/TableView';
import AIExplanationPanel from '@/components/AIExplanationPanel';
import Skeleton from '@/components/Skeleton';
import { useJob } from '@/components/JobProvider';
import { HelpCircle, Info } from 'lucide-react';

export default function DiagnosticsPage() {
  const { activeJob } = useJob();

  const metadata = activeJob?.profile?.metadata || {
    table_count: activeJob?.profile && !activeJob.profile.metadata ? Object.keys(activeJob.profile).length : 0,
    total_rows: 0,
    data_size_mb: 0,
    data_processed_mb: 0,
    duplicate_count: 0
  };

  const tables = activeJob?.profile?.tables || (activeJob?.profile && !activeJob.profile.metadata ? activeJob.profile : {});

  const getReadiness = () => {
    if (!activeJob) return '0%';
    if (activeJob.status === 'completed') return '100%';
    if (activeJob.status === 'analyzing') return '85%';
    if (activeJob.status === 'restoring') return 'Processing...';
    if (activeJob.status === 'failed') return 'Failed';
    return '0%';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Extraction Pipeline & Diagnostics</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time health and structural analysis of the restored SQL sandbox.</p>
        </div>
        <button className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-medium text-slate-300 transition-colors border border-slate-700">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Pipeline Documentation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <SummaryCard title="TABLES" value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.table_count || 0)} />
        <SummaryCard title="ROWS" value={!activeJob ? <Skeleton className="h-8 w-24" /> : (metadata.total_rows || 0).toLocaleString()} />
        <SummaryCard title="EXTRACTED" value={!activeJob ? <Skeleton className="h-8 w-20" /> : `${metadata.data_size_mb || metadata.data_processed_mb || 0} MB`} />
        <SummaryCard title="DUPLICATE DATA" value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.duplicate_count || 0)} />
        <SummaryCard title="READINESS" value={getReadiness()} />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
            <Info className="h-4 w-4 mr-2 text-teal-400" />
            Sandbox Table Registry
          </h2>
        </div>
        <div className="p-0">
          <TableView 
            profile={tables} 
            loading={activeJob?.status === 'analyzing' || activeJob?.status === 'restoring'} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <AIExplanationPanel />
      </div>
    </div>
  );
}

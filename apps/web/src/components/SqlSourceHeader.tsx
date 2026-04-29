"use client";
import React from 'react';
import { ChevronRight, Database, Layers, Clock, Activity } from 'lucide-react';

interface SqlSourceHeaderProps {
  projectName: string;
  orgName: string;
  activeStatus: string; // 'No Data' | 'Uploading' | 'Processing' | 'Completed' | 'Failed'
  lastUpdated?: string;
  activeFilename?: string;
}

export default function SqlSourceHeader({ 
  projectName, 
  orgName, 
  activeStatus, 
  lastUpdated,
  activeFilename 
}: SqlSourceHeaderProps) {
  
  const statusColors: Record<string, string> = {
    'No Data': 'bg-slate-800 text-slate-400 border-slate-700',
    'Uploading': 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse',
    'Processing': 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    'Completed': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    'Failed': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800/50">
      <div className="space-y-1">
        <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <span>{orgName}</span>
          <ChevronRight className="h-3 w-3 mx-1 text-slate-700" />
          <span className="text-slate-400">{projectName}</span>
        </div>
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-black text-white tracking-tight">Source Control</h1>
          <span className={`px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusColors[activeStatus] || statusColors['No Data']}`}>
            {activeStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {activeFilename && (
          <div className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
            <Database className="h-4 w-4 text-teal-500/50" />
            <div className="text-left">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Source</p>
              <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{activeFilename}</p>
            </div>
          </div>
        )}
        
        {lastUpdated && (
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-slate-600" />
            <div className="text-left">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Last Ingested</p>
              <p className="text-xs font-bold text-slate-400">{lastUpdated}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

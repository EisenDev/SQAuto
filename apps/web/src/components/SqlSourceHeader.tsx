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
    'No Data': 'bg-stone-100 text-stone-500 border-stone-200',
    'Uploading': 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    'Processing': 'bg-amber-50 text-amber-600 border-amber-250 animate-pulse',
    'Completed': 'bg-teal-50 text-teal-600 border-teal-200',
    'Failed': 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-stone-200">
      <div className="space-y-1">
        <div className="flex items-center text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
          <span>{orgName}</span>
          <ChevronRight className="h-3 w-3 mx-1 text-stone-300" />
          <span className="text-stone-600 font-semibold">{projectName}</span>
        </div>
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Source Control</h1>
          <span className={`px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusColors[activeStatus] || statusColors['No Data']}`}>
            {activeStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {activeFilename && (
          <div className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-stone-50 rounded-xl border border-stone-200">
            <Database className="h-4 w-4 text-teal-600" />
            <div className="text-left">
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Active Source</p>
              <p className="text-xs font-bold text-stone-800 truncate max-w-[150px]">{activeFilename}</p>
            </div>
          </div>
        )}
        
        {lastUpdated && (
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-stone-400" />
            <div className="text-left">
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Last Ingested</p>
              <p className="text-xs font-bold text-stone-600">{lastUpdated}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

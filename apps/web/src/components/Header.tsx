"use client";
import React from 'react';
import { useJob } from '@/components/JobProvider';
import { Database } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const { activeJob } = useJob();
  
  const statusColor = activeJob?.status === 'completed' 
    ? 'text-teal-400 bg-teal-400/10 border-teal-400/20' 
    : activeJob?.status === 'failed'
    ? 'text-red-400 bg-red-400/10 border-red-400/20'
    : activeJob?.status 
    ? 'text-teal-300 bg-teal-500/10 border-teal-500/20 animate-pulse'
    : 'text-slate-500 bg-slate-800/10 border-slate-800/20';

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/60 transition-all duration-300 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200">
            <Database className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100 italic">
            SQ<span className="text-teal-500 not-italic">Auto</span>
          </span>
        </Link>
        
        <div className="flex items-center space-x-5">
          {activeJob && (
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-slate-900/50 rounded-full border border-slate-800">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping"></div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                PROCCESSING: {activeJob.id?.substring(0, 8)}...
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            <div className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${statusColor} transition-all`}>
              {activeJob ? activeJob.status.toUpperCase() : 'SYSTEM STANDBY'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


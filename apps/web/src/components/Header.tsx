"use client";
import React from 'react';
import { useJob } from '@/components/JobProvider';

export default function Header() {
  const { activeJob } = useJob();
  
  const statusColor = activeJob?.status === 'completed' 
    ? 'bg-green-100 text-green-800' 
    : activeJob?.status === 'failed'
    ? 'bg-red-100 text-red-800'
    : activeJob?.status 
    ? 'bg-teal-100 text-teal-800 animate-pulse'
    : 'bg-gray-100 text-gray-800';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">SQ</span>
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-teal-400">
          SQAuto
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {activeJob && (
          <div className="hidden md:block text-xs text-gray-400 font-mono">
            JOB: {activeJob.id || activeJob.job_id}
          </div>
        )}
        <div className="text-sm font-medium" id="job-status-badge">
          <span className={`${statusColor} px-3 py-1 rounded-full text-xs font-bold transition-all`}>
            {activeJob ? activeJob.status.toUpperCase() : 'STANDBY'}
          </span>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import SqlUploadCard from '@/components/SqlUploadCard';
import { ArrowLeft } from 'lucide-react';

export default function SqlUploadPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
      {/* Header section with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => router.push(`/dashboard/project/${projectId}`)}
            className="h-10 w-10 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
              Data Ingestion
              <span className="mx-2 opacity-50">/</span>
              <span className="text-teal-500/80">New Migration</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Initialize SQL Source</h1>
          </div>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="flex justify-center pt-8">
        <SqlUploadCard 
          projectId={projectId} 
          onSuccess={(job) => {
            // After successful initiation, we wait a moment or just redirect to the results page
            // which will show the "restoring" status
            setTimeout(() => {
              router.push(`/dashboard/project/${projectId}/sql`);
            }, 1500);
          }}
        />
      </div>
    </div>
  );
}

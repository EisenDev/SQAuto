"use client";
import React, { useEffect, useCallback } from 'react';
import UploadCard from '@/components/UploadCard';
import SummaryCard from '@/components/SummaryCard';
import TableView from '@/components/TableView';
import AIExplanationPanel from '@/components/AIExplanationPanel';
import ExportPanel from '@/components/ExportPanel';
import AdvancedTools from '@/components/AdvancedTools';
import { useJob } from '@/components/JobProvider';
import { getJob } from '@/lib/api';
import Skeleton from '@/components/Skeleton';

export default function Dashboard() {
  const { activeJob, setActiveJob, refreshJob } = useJob();

  // Poll for job updates if the job is in an intermediate state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const jobId = activeJob?.id || activeJob?.job_id;

    if (jobId && !(['completed', 'failed'].includes(activeJob.status))) {
      interval = setInterval(async () => {
        try {
          const updatedJob = await getJob(jobId);
          setActiveJob(updatedJob);
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
          clearInterval(interval);
        }
      }, 3000); // Fluid 3-second poll
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob?.id, activeJob?.job_id, activeJob?.status, setActiveJob]);

  // Derived counts
  const metadata = activeJob?.profile?.metadata || {
    table_count: activeJob?.profile && !activeJob.profile.metadata ? Object.keys(activeJob.profile).length : 0,
    total_rows: 0,
    data_size_mb: 0,
    data_processed_mb: 0,
    duplicate_count: 0
  };

  const tables = activeJob?.profile?.tables || (activeJob?.profile && !activeJob.profile.metadata ? activeJob.profile : {});
  
  // Custom readiness calc based on job status and streaming progress
  const getReadiness = () => {
    if (!activeJob) return '0%';
    if (activeJob.status === 'completed') return '100%';
    if (activeJob.status === 'analyzing') return '85%';
    if (activeJob.status === 'restoring') {
      const mbProcessed = metadata.compressed_processed_mb || 0;
      const totalMb = activeJob.file_size ? activeJob.file_size / (1024 * 1024) : 0;
      const calcPercent = totalMb > 0 ? Math.min(80, Math.round((mbProcessed / totalMb) * 80)) : 0;
      return `${calcPercent}%`;
    }
    if (activeJob.status === 'uploaded') return '15%';
    if (activeJob.status === 'failed') return '⚠ Failed';
    return '0%';
  };
  const readiness = getReadiness();

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <UploadCard />

      {/* Industrial Dashboard Grid - 5 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <SummaryCard 
          title="TABLES" 
          value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.table_count || 0)} 
        />
        <SummaryCard 
          title="ROWS" 
          value={!activeJob ? <Skeleton className="h-8 w-24" /> : (metadata.total_rows || 0).toLocaleString()} 
        />
        <SummaryCard 
          title="DATA EXTRACTED" 
          value={!activeJob ? <Skeleton className="h-8 w-20" /> : `${metadata.data_size_mb || metadata.data_processed_mb || 0} MB`} 
        />
        <SummaryCard 
          title="DUPLICATE DATA" 
          value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.duplicate_count || 0)} 
        />
        <SummaryCard 
          title="READINESS" 
          value={readiness} 
        />
      </div>

      {/* Extracted Tables View */}
      <TableView 
        profile={tables} 
        loading={activeJob?.status === 'analyzing' || activeJob?.status === 'restoring'} 
      />

      {/* AI Explanation Panel */}
      <AIExplanationPanel />

      {/* Export Panel */}
      <ExportPanel disabled={activeJob?.status !== 'completed'} />

      {/* Advanced Tools (collapsed) */}
      <AdvancedTools />

      {/* Industrial Versioning (Cache Buster) */}
      <div className="pt-8 pb-4 text-center">
        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em] opacity-50">
          SQAuto Industrial v2.1.1-EMERGENCY-FIX | Build: {new Date().toISOString()} | Status: RELIABLE-PIPELINE-ACTIVE
        </p>
      </div>
    </div>
  );
}

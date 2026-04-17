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
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob?.id, activeJob?.job_id, activeJob?.status, setActiveJob]);

  // Derived counts
  const tableCount = activeJob?.profile ? Object.keys(activeJob.profile).length : 0;
  const readiness = activeJob?.status === 'completed' ? '100%' : activeJob?.status === 'analyzing' ? '80%' : activeJob?.status === 'restoring' ? '40%' : '0%';

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <UploadCard />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Tables" value={tableCount.toString()} />
        <SummaryCard title="Rows" value={activeJob ? "Detecting..." : "0"} />
        <SummaryCard title="Readiness" value={readiness} />
      </div>

      {/* Extracted Tables View */}
      <TableView profile={activeJob?.profile} />

      {/* AI Explanation Panel */}
      <AIExplanationPanel />

      {/* Export Panel */}
      <ExportPanel disabled={activeJob?.status !== 'completed'} />

      {/* Advanced Tools (collapsed) */}
      <AdvancedTools />
    </div>
  );
}

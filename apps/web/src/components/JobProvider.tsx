"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useParams } from "next/navigation";

import { Job } from "@/lib/api";
import { useActiveJobStatus } from "@/hooks/useActiveJobStatus";

interface JobContextType {
  activeJob: Job | null;
  setActiveJob: (job: Job | null) => void;
  refreshJob: (jobId?: string) => Promise<void>;
  syncWarning: string | null;
  syncError: string | null;
  consecutiveFailures: number;
  loading: boolean;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : undefined;
  const {
    activeJob,
    loading,
    warning,
    error,
    consecutiveFailures,
    refresh,
    setSourceStatus,
  } = useActiveJobStatus(projectId);

  const value = useMemo<JobContextType>(() => ({
    activeJob,
    setActiveJob: (job: Job | null) => {
      if (!job || !projectId) {
        setSourceStatus(null);
        return;
      }
      setSourceStatus({
        project_id: projectId,
        active_job_id: job.id || job.job_id || null,
        status: job.status || null,
        filename: job.original_filename || job.filename || null,
        file_size: job.file_size || 0,
        dialect: job.profile?.metadata?.flavor || null,
        metrics: {
          tables: Number(job.profile?.metadata?.table_count || 0),
          rows: Number(job.profile?.metadata?.total_rows || 0),
          data_size_mb: Number(job.profile?.metadata?.data_size_mb || 0),
        },
        updated_at: job.updated_at || null,
      });
    },
    refreshJob: async () => {
      await refresh();
    },
    syncWarning: warning,
    syncError: error,
    consecutiveFailures,
    loading,
  }), [activeJob, consecutiveFailures, error, loading, projectId, refresh, setSourceStatus, warning]);

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}

export function useJob() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error("useJob must be used within a JobProvider");
  }
  return context;
}

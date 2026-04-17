"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getJob, Job } from '@/lib/api';

interface JobContextType {
  activeJob: Job | null;
  setActiveJob: (job: Job | null) => void;
  refreshJob: (jobId: string) => Promise<void>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const refreshJob = useCallback(async (jobId: string) => {
    try {
      const job = await getJob(jobId);
      setActiveJob(job);
    } catch (err) {
      console.error("Failed to refresh job:", err);
    }
  }, []);

  return (
    <JobContext.Provider value={{ activeJob, setActiveJob, refreshJob }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
}

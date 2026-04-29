"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProjectJobs, Job } from '@/lib/api';
import ExtractionSummary from '@/components/ExtractionSummary';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SqlProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchJobs = async () => {
      try {
        const jobs = await getProjectJobs(projectId);
        
        // Ensure jobs is an array and check its length
        if (!Array.isArray(jobs) || jobs.length === 0) {
          console.log("No jobs found for project, redirecting to /new");
          router.replace(`/dashboard/project/${projectId}/sql/new`);
          return;
        }

        // Find the most recent relevant job
        const latestJob = jobs[0];
        setJob(latestJob);
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch project jobs:", err);
        // If it's a 404 or empty response that threw an error, we might still want to redirect
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          router.replace(`/dashboard/project/${projectId}/sql/new`);
        } else {
          setError("Unable to retrieve project extraction status.");
          setLoading(false);
        }
      }
    };

    fetchJobs();
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Analyzing Project State...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto text-center">
        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sync Error</h2>
          <p className="text-slate-400">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full">
      {job && <ExtractionSummary job={job} projectId={projectId} />}
    </div>
  );
}

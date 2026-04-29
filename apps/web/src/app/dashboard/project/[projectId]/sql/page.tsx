"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getProjectJobs, getJob, activateJob, resetProject, 
  Job, JobStatus, restoreJob 
} from '@/lib/api';
import { safeFetch } from '@/lib/api_client';
import { Loader2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';

import SqlSourceHeader from '@/components/SqlSourceHeader';
import SqlEmptyState from '@/components/SqlEmptyState';
import SqlSourceOverview from '@/components/SqlSourceOverview';
import SqlJobHistory from '@/components/SqlJobHistory';
import ExtractionLogPreview from '@/components/ExtractionLogPreview';
import SqlUploadCard from '@/components/SqlUploadCard';

export default function SqlManagementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [project, setProject] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      // 1. Fetch Project & Org Details
      const projectRes = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/projects/${projectId}`);
      if (projectRes.success) {
        setProject(projectRes.data);
        const orgRes = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/organizations/${projectRes.data.organization_id}`);
        if (orgRes.success) setOrganization(orgRes.data);
      }

      // 2. Fetch Jobs
      const allJobs = await getProjectJobs(projectId);
      setJobs(allJobs);
      
      const currentActive = allJobs.find(j => j.is_active) || (allJobs.length > 0 ? allJobs[0] : null);
      setActiveJob(currentActive);

      // 3. Determine if we need to poll
      const needsPolling = allJobs.some(j => j.status === 'restoring' || j.status === 'analyzing');
      setPolling(needsPolling);

    } catch (err: any) {
      console.error("Failed to fetch SQL management data:", err);
      setError("Unable to retrieve project source status.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for job status if processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling) {
      interval = setInterval(fetchData, 3000);
    }
    return () => clearInterval(interval);
  }, [polling, fetchData]);

  const handleActivate = async (jobId: string) => {
    try {
      await activateJob(jobId);
      await fetchData();
    } catch (err) {
      alert("Failed to switch active source.");
    }
  };

  const handleReset = async () => {
    if (!confirm("CAUTION: This will delete all uploaded SQL dumps and staging data for this project. This action cannot be undone. Continue?")) return;
    try {
      await resetProject(projectId);
      await fetchData();
    } catch (err) {
      alert("Failed to reset project data.");
    }
  };

  const handleUploadSuccess = async (job: Job) => {
    setLoading(true);
    await fetchData();
  };

  if (loading && !polling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Syncing Source Control...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto text-center p-8">
        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sync Error</h2>
          <p className="text-slate-400">{error}</p>
        </div>
        <button 
          onClick={() => fetchData()}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all"
        >
          RETRY SYNC
        </button>
      </div>
    );
  }

  const activeStatus = activeJob 
    ? (activeJob.status.charAt(0).toUpperCase() + activeJob.status.slice(1)) 
    : 'No Data';

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in duration-700">
      <SqlSourceHeader 
        projectName={project?.name || "Project"} 
        orgName={organization?.name || "Organization"} 
        activeStatus={activeStatus}
        activeFilename={activeJob?.original_filename || activeJob?.filename}
        lastUpdated={activeJob?.updated_at ? new Date(activeJob.updated_at).toLocaleString() : undefined}
      />

      {!activeJob ? (
        <SqlEmptyState projectId={projectId} onSuccess={handleUploadSuccess} />
      ) : (
        <div className="space-y-16">
          <SqlSourceOverview 
            job={activeJob} 
            onReupload={() => {
              const el = document.getElementById('new-upload-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onReset={handleReset}
            onViewLogs={() => {/* Already handled by logs preview usually */}}
          />

          <ExtractionLogPreview 
            logs={activeJob.log || ""} 
            onViewFullLogs={() => alert(activeJob.log || "No logs available.")} 
          />

          <SqlJobHistory 
            jobs={jobs} 
            onActivate={handleActivate} 
            onViewDetails={(id) => router.push(`/jobs/${id}`)} 
          />

          {/* New Upload Section */}
          <div id="new-upload-section" className="pt-16 border-t border-slate-800/50">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white tracking-tight">Ingest New SQL Version</h3>
              <p className="text-slate-500 text-sm mt-1">This will create a new job in history. You can switch to it once processed.</p>
            </div>
            <SqlUploadCard projectId={projectId} onSuccess={handleUploadSuccess} />
          </div>

          {/* Tool Unlock Indicator */}
          <div className="p-8 bg-teal-500/5 rounded-3xl border border-teal-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-6 text-center md:text-left">
              <div className="h-14 w-14 bg-teal-500/10 rounded-2xl flex items-center justify-center border border-teal-500/20">
                <Zap className="h-7 w-7 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {activeJob.status === 'completed' ? 'Analysis & Migration tools are now unlocked' : 'Extraction in progress...'}
                </h3>
                <p className="text-slate-500 text-sm">
                  {activeJob.status === 'completed' 
                    ? 'Your source of truth is ready. You can now build migration plans or explore the schema.' 
                    : 'Tools will unlock automatically once the industrial pipeline completes.'}
                </p>
              </div>
            </div>
            {activeJob.status === 'completed' && (
              <button 
                onClick={() => router.push(`/workspace/${projectId}/explorer`)}
                className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-2xl transition-all shadow-lg shadow-teal-500/20 whitespace-nowrap"
              >
                GO TO EXPLORER
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

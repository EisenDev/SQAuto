"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getProjectJobs, activateJob, resetProject, getProjectLogs,
  Job
} from '@/lib/api';
import { safeFetch } from '@/lib/api_client';
import { Loader2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { useJob } from '@/components/JobProvider';

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
  const { activeJob, syncWarning, syncError, consecutiveFailures, loading: statusLoading, refreshJob } = useJob();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [project, setProject] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const projectRes = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/projects/${projectId}`);
      if (projectRes.success) {
        setProject(projectRes.data);
        const orgRes = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/organizations/${projectRes.data.organization_id}`);
        if (orgRes.success) setOrganization(orgRes.data);
      }

      const allJobs = await getProjectJobs(projectId);
      setJobs(allJobs);
    } catch (err: any) {
      console.error("Failed to fetch SQL management data:", err);
      setError("Unable to load project source metadata.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!projectId || !activeJob?.id) {
      setLogLines([]);
      return;
    }
    void getProjectLogs(projectId, 10, 1)
      .then((response) => setLogLines(response.lines))
      .catch(() => setLogLines([]));
  }, [activeJob?.id, projectId]);

  const handleActivate = async (jobId: string) => {
    try {
      await activateJob(jobId);
      await Promise.all([fetchData(), refreshJob()]);
    } catch (err) {
      alert("Failed to switch active source.");
    }
  };

  const handleReset = async () => {
    if (!confirm("CAUTION: This will delete all uploaded SQL dumps and staging data for this project. This action cannot be undone. Continue?")) return;
    try {
      await resetProject(projectId);
      await Promise.all([fetchData(), refreshJob()]);
    } catch (err) {
      alert("Failed to reset project data.");
    }
  };

  const handleUploadSuccess = async (_job: Job) => {
    await Promise.all([fetchData(), refreshJob()]);
  };

  const pageError = error || (consecutiveFailures >= 3 ? syncError : null);

  if (loading && !activeJob && statusLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-teal-500 animate-spin" />
        <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Syncing Source Control...</p>
      </div>
    );
  }

  if (pageError && !activeJob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto text-center p-8">
        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sync Error</h2>
          <p className="text-slate-400">{pageError}</p>
        </div>
        <button 
          onClick={() => {
            void fetchData();
            void refreshJob();
          }}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all"
        >
          RETRY SYNC
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-12 animate-in fade-in duration-700 p-8 md:p-12">
      {activeJob && syncWarning && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {syncWarning}
        </div>
      )}

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
            logs={logLines.join('\n')}
            onViewFullLogs={() => alert(logLines.join('\n') || "No logs available.")} 
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
                onClick={() => router.push(`/dashboard/project/${projectId}/explorer`)}
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

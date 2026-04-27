"use client";
import React, { useEffect, useState } from 'react';
import UploadCard from '@/components/UploadCard';
import SummaryCard from '@/components/SummaryCard';
import TableView from '@/components/TableView';
import AIExplanationPanel from '@/components/AIExplanationPanel';
import ExportPanel from '@/components/ExportPanel';
import AdvancedTools from '@/components/AdvancedTools';
import SourceTruthExplorer from '@/components/SourceTruthExplorer';
import SchemaVisualizer from '@/components/SchemaVisualizer';
import MigrationControlCenter from '@/components/MigrationControlCenter';
import { useJob } from '@/components/JobProvider';
import { getJob } from '@/lib/api';
import Skeleton from '@/components/Skeleton';
import PipelineFlow from '@/components/PipelineFlow';
import { safeFetch } from '@/lib/api_client';

export default function Dashboard() {
  const { activeJob, setActiveJob } = useJob();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'truth' | 'schema' | 'migration'>('pipeline');
  const [jobHistory, setJobHistory] = useState<any[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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

  // Fetch job history once on mount
  useEffect(() => {
    safeFetch(`${API_URL}/jobs`).then(result => {
      if (result.success && Array.isArray(result.data)) {
        setJobHistory(result.data);
      }
    });
  }, [API_URL]);

  // Derived counts
  const metadata = activeJob?.profile?.metadata || {
    table_count: activeJob?.profile && !activeJob.profile.metadata ? Object.keys(activeJob.profile).length : 0,
    total_rows: 0,
    data_size_mb: 0,
    data_processed_mb: 0,
    duplicate_count: 0
  };

  const tables = activeJob?.profile?.tables || (activeJob?.profile && !activeJob.profile.metadata ? activeJob.profile : {});
  
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
    if (activeJob.status === 'uploaded') return '0%';
    if (activeJob.status === 'failed') return '⚠ Failed';
    return '0%';
  };
  const readiness = getReadiness();

  return (
    <div className="space-y-6">
      
      {/* Top Header & Job Restore Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-teal-100 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-teal-900 tracking-tight flex items-center">
            <span className="w-3 h-3 bg-teal-500 rounded-full mr-3 animate-pulse" />
            SQAuto Operational Dashboard
          </h1>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-500 uppercase">Load History:</label>
          <select 
            className="flex-grow md:w-64 border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-teal-500 focus:border-teal-500 py-2 px-3 text-gray-700 shadow-inner"
            onChange={async (e) => {
              if (!e.target.value) return;
              try {
                const legacyJob = await getJob(e.target.value);
                setActiveJob(legacyJob);
                setActiveTab('pipeline');
              } catch (err) {
                console.error("Failed to restore history", err);
              }
            }}
            value={activeJob?.id || activeJob?.job_id || ""}
          >
            <option value="">-- Active Sandbox --</option>
            {jobHistory.map((job) => (
              <option key={job.id} value={job.id}>
                {job.filename.split('_').pop()} - {new Date(job.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Section (Always Visible) */}
      <UploadCard />

      <hr className="border-teal-50" />

      {/* Main Multi-Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'pipeline' ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
        >
          1. Extraction Pipeline & Diagnostics
        </button>
        <button
          onClick={() => setActiveTab('truth')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'truth' ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
        >
          2. Source of Truth Data Explorer
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'schema' ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
        >
          3. Schema Visualizer
        </button>
        <button
          onClick={() => setActiveTab('migration')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'migration' ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
        >
          4. Migration Control Center
        </button>
      </div>

      {/* Tab 1: Pipeline Engine */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Industrial Dashboard Grid - 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SummaryCard title="TABLES" value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.table_count || 0)} />
            <SummaryCard title="ROWS" value={!activeJob ? <Skeleton className="h-8 w-24" /> : (metadata.total_rows || 0).toLocaleString()} />
            <SummaryCard title="DATA EXTRACTED" value={!activeJob ? <Skeleton className="h-8 w-20" /> : `${metadata.data_size_mb || metadata.data_processed_mb || 0} MB`} />
            <SummaryCard title="DUPLICATE DATA" value={!activeJob ? <Skeleton className="h-8 w-12" /> : (metadata.duplicate_count || 0)} />
            <SummaryCard title="READINESS" value={readiness} />
          </div>

          {/* Extracted Tables View with Drilldown */}
          <TableView profile={tables} loading={activeJob?.status === 'analyzing' || activeJob?.status === 'restoring'} />

          {/* AI Explanation Panel */}
          <AIExplanationPanel />

          {/* Export Panel */}
          <ExportPanel disabled={activeJob?.status !== 'completed'} />

          {/* Advanced Tools (collapsed) */}
          <AdvancedTools />
        </div>
      )}

      {/* Tab 2: Native Data Reader */}
      {activeTab === 'truth' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SourceTruthExplorer jobId={activeJob?.id || activeJob?.job_id || ""} profile={tables} />
        </div>
      )}

      {/* Tab 3: Schema Graph (React Flow) */}
      {activeTab === 'schema' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SchemaVisualizer 
            jobId={activeJob?.id || activeJob?.job_id || ""} 
            graph={activeJob?.profile?.graph || {nodes: [], edges: []}} 
          />
        </div>
      )}

      {/* Tab 4: Migration Control Center */}
      {activeTab === 'migration' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <MigrationControlCenter />
        </div>
      )}

      {/* Industrial Versioning (Cache Buster) */}
      <div className="pt-8 pb-4 text-center">
        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em] opacity-50">
          SQAuto Industrial v4.1.0-DATA-INTELLIGENCE | Build: {new Date().toISOString()} | Status: SECURE-BROWSER-ACTIVE
        </p>
      </div>
    </div>
  );
}

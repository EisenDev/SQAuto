"use client";
import React, { useState } from 'react';
import { uploadDump, restoreJob, profileJob } from '@/lib/api';
import { useJob } from '@/components/JobProvider';

export default function UploadCard() {
  const { activeJob, setActiveJob } = useJob();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePipeline = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // 1. Upload
      const result = await uploadDump(file);
      const jobId = result.job_id || result.id;
      setActiveJob(result);

      // 2. Trigger Restore (immediate async call, polling will pick up status)
      await restoreJob(jobId);
      
      // 3. Trigger Profile (immediate async call, polling will pick up status)
      await profileJob(jobId);
      
    } catch (err: any) {
      let msg = err.message || 'Pipeline failed at some step';
      if (msg === 'Failed to fetch') {
        msg = "Network Error: Could not reach backend. Please ensure the API is running and check your DB connection log.";
      }
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const currentStatus = activeJob?.status || (uploading ? 'starting...' : null);

  return (
    <div className="border rounded-xl p-6 bg-white shadow-lg transition-all hover:shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Upload SQL Dump</h2>
        {currentStatus && (
          <span className="text-xs font-bold uppercase py-1 px-2 rounded bg-teal-100 text-teal-800 animate-pulse">
            {currentStatus}
          </span>
        )}
      </div>

      <div className={`border-dashed border-2 rounded-lg p-8 text-center transition-colors ${
        activeJob ? 'border-teal-100 bg-teal-50/10' : 'border-teal-200 bg-teal-50/30'
      }`}>
        <input 
          type="file" 
          accept=".sql" 
          onChange={handleFileChange}
          disabled={!!uploading || (!!activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed')}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-teal-50 file:text-teal-700
            hover:file:bg-teal-100 disabled:opacity-50"
        />
        
        {file && !activeJob && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Selected: <span className="font-medium">{file.name}</span></p>
            <button
              onClick={handlePipeline}
              disabled={uploading}
              className="px-6 py-2 bg-teal-600 text-white rounded-full font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Processing Pipeline...' : 'Upload & Start Pipeline'}
            </button>
          </div>
        )}

        {activeJob && (
          <div className="mt-4 text-sm text-teal-700">
            <p>Active Job: <span className="font-mono">{activeJob.id || activeJob.job_id}</span></p>
            {activeJob.status === 'completed' && (
              <button 
                onClick={() => {setFile(null); setActiveJob(null); window.location.reload();}} 
                className="mt-2 text-teal-600 underline"
              >
                Upload another file
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600 font-medium tracking-tight">⚠️ {error}</p>}
      </div>
      
      <p className="text-xs text-gray-400 mt-4 italic">
        * SQL dumps are processed in a staging sandbox. Your source file remains read-only.
      </p>
    </div>
  );
}

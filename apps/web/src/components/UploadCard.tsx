"use client";
import React, { useState } from 'react';
import { uploadDump, restoreJob, profileJob } from '@/lib/api';
import { useJob } from '@/components/JobProvider';
import { Terminal, Activity, HardDrive, Database, CheckCircle, AlertCircle, Table, Layers } from 'lucide-react';
import { safeFetch } from '@/lib/api_client';

export default function UploadCard() {
  const { activeJob, setActiveJob } = useJob();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [debugLogs, setDebugLogs] = useState({ restoration: "", trace: "" });
  const [detectedDialect, setDetectedDialect] = useState<{ dialect: string; confidence: number } | null>(null);

  React.useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    
    let debugInterval: NodeJS.Timeout;
    if (showDebugger && activeJob?.status === 'restoring') {
      debugInterval = setInterval(async () => {
        const resLog = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debug/restoration-log`);
        const traceLog = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debug/pipe-trace`);
        setDebugLogs({
          restoration: resLog.success ? resLog.data.log : "No activity yet...",
          trace: traceLog.success ? traceLog.data.log : "No trace yet..."
        });
      }, 2000);
    }
    return () => clearInterval(debugInterval);
  }, [showDebugger, activeJob?.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePipeline = async () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setTimeRemaining(null);
    setError(null);
    const startTime = Date.now();

    try {
      // 1. Upload with progress
      const result = await uploadDump(file, (p) => {
        const percent = Math.round((p.loaded / p.total) * 100);
        setUploadProgress(percent);
        
        // Time Remaining Logic
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = p.loaded / elapsed; // bytes per sec
        const remainingBytes = p.total - p.loaded;
        const remainingSeconds = Math.ceil(remainingBytes / speed);
        
        if (elapsed > 2 && remainingSeconds > 0) {
          const mins = Math.floor(remainingSeconds / 60);
          const secs = remainingSeconds % 60;
          setTimeRemaining(`${mins}m ${secs}s remaining`);
        }
      });

      const jobId = result.job_id || result.id;
      setActiveJob(result);

      // 2. Detect SQL Dialect (lightweight, non-blocking)
      const dialectRes = await safeFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/analysis/dialect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      });
      if (dialectRes.success && dialectRes.data?.dialect && dialectRes.data.dialect !== 'unknown') {
        setDetectedDialect({ dialect: dialectRes.data.dialect, confidence: dialectRes.data.confidence });
      }

      // 3. Trigger Background Pipeline (Restore + Profile)
      await restoreJob(jobId);
      
    } catch (err: any) {
      let msg = err.message || 'Pipeline failed at some step';
      if (msg === 'Failed to fetch' || msg.includes('Network Error')) {
        msg = "Upload Interrupted: Please check your connection or Cloudflare proxy status.";
      }
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const currentStatus = activeJob?.status || (uploading ? 'starting...' : null);

  return (
    <div className="border rounded-xl p-6 bg-white shadow-lg transition-all hover:shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Upload SQL Dump</h2>
        <div className="flex items-center space-x-2">
          {detectedDialect && (
            <span className="text-[10px] font-black uppercase py-1 px-2.5 rounded-full bg-indigo-100 text-indigo-800 tracking-wider">
              {detectedDialect.dialect === 'postgresql' ? '🐘' : detectedDialect.dialect === 'mysql' ? '🐬' : '📄'} {detectedDialect.dialect} ({Math.round(detectedDialect.confidence * 100)}%)
            </span>
          )}
          {currentStatus && (
            <span className="text-xs font-bold uppercase py-1 px-2 rounded bg-teal-100 text-teal-800 animate-pulse">
              {currentStatus}
            </span>
          )}
        </div>
      </div>

      <div className={`border-dashed border-2 rounded-lg p-8 text-center transition-colors ${
        activeJob ? 'border-teal-100 bg-teal-50/10' : 'border-teal-200 bg-teal-50/30'
      }`}>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-tighter mb-1 flex items-center">
            <span className="bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center mr-1 text-[10px]">!</span>
            Industrial Beta Limitation
          </p>
          <p className="text-[10px] text-amber-900 leading-tight">
            This is currently on beta. Avoid uploading 10GB files as much as possible; the system will reject the decompression if the uncompressed stream exceeds a 10GB .sql file limit for safety.
          </p>
        </div>

        <input 
          type="file" 
          accept=".sql,.gz" 
          onChange={handleFileChange}
          disabled={!!uploading || (!!activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed')}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-teal-50 file:text-teal-700
            hover:file:bg-teal-100 disabled:opacity-50"
        />

        <p className="text-[10px] text-teal-600 mt-2 font-medium">
          ⚡ For faster uploads, use compressed <span className="font-bold">.sql.gz</span> files (recommended)
        </p>
        
        {file && !activeJob && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Selected: <span className="font-medium">{file.name}</span></p>
            <div className="text-xs text-teal-600 mb-4 bg-teal-50 py-2 px-3 rounded-lg inline-block border border-teal-100">
              ⏱️ Est. Processing Time: <span className="font-bold">
                {file.size > 0 
                  ? `${Math.max(2, Math.ceil(file.size / (50 * 1024 * 1024)))} - ${Math.max(5, Math.ceil(file.size / (20 * 1024 * 1024)))} mins`
                  : "Calculating..."
                }
              </span>
            </div>
            
            {uploading ? (
              <div className="max-w-md mx-auto mt-4 p-4 bg-white rounded-xl border border-teal-100 shadow-sm">
                <div className="flex justify-between text-xs font-bold text-teal-700 mb-2 uppercase tracking-wider">
                  <span>Uploading {formatSize(file.size)}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden border border-gray-50">
                  <div 
                    className="bg-teal-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 font-medium italic">
                  {timeRemaining || "Estimating speed..."}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <button
                  onClick={handlePipeline}
                  className="px-8 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-all shadow-md active:scale-95 shadow-teal-500/20"
                >
                  Upload & Start Pipeline
                </button>
              </div>
            )}
          </div>
        )}

        {activeJob && (
          <div className="mt-4 text-sm text-teal-700 space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="font-medium">Job ID:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-teal-100 italic">
                {activeJob.id || activeJob.job_id}
              </span>
            </div>

            {/* Industrial Restoration Progress Bar */}
            {activeJob.status === 'restoring' && (
              <div className="max-w-md mx-auto p-6 bg-teal-50/50 rounded-xl border border-teal-100 animate-in fade-in slide-in-from-bottom-2 duration-500 text-center">
                <div className="flex items-center justify-center mb-3">
                  <span className="relative flex h-4 w-4 mr-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-teal-500"></span>
                  </span>
                  <span className="text-[13px] font-bold text-teal-800 uppercase tracking-widest">
                    Wait for a minute...
                  </span>
                </div>
                
                <p className="text-[11px] text-teal-700/80 font-medium">
                  We are decompressing and mapping the structural integrity of your massive SQL databank natively into the staging environment.
                </p>
                
                <div className="mt-4 border-t border-teal-100 pt-3 flex justify-between items-center text-[10px] text-teal-600/80 font-medium px-4">
                  <div className="flex items-center space-x-1">
                    <Database className="w-3 h-3" />
                    <span>Handling Industrial Load</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Layers className="w-3 h-3 animate-bounce" />
                    <span>Processing Chunks</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button 
                    onClick={() => setShowDebugger(!showDebugger)}
                    className="px-4 py-2 bg-teal-600/10 text-teal-700 rounded-lg text-[10px] font-bold border border-teal-200 hover:bg-teal-600 hover:text-white transition-all flex items-center mx-auto shadow-sm"
                  >
                    <Activity className="w-3 h-3 mr-2 animate-pulse" />
                    {showDebugger ? "Close Live Insight" : "Open Live Console"}
                  </button>
                </div>

                {showDebugger && (
                  <div className="mt-4 text-left bg-[#0d1117] rounded-xl p-4 border border-teal-900/30 shadow-2xl overflow-hidden max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500/30" />
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500/10" />
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center">
                        <Activity className="w-3 h-3 mr-1 text-teal-500" /> Industrial Live Pipeline Insight
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <span className="text-gray-600">[$]</span> tail -f /var/log/restoration.log{"\n"}
                      <span className="text-gray-600">[{currentTime || '...'}]</span> <span className="text-teal-400">Stream Status:</span>{"\n"}
                      <span className="text-white mt-1 block bg-teal-900/20 p-2 rounded border border-teal-900/30">
                        {activeJob.profile?.metadata?.status_message || "Industrial stream active and processing chunks..."}
                      </span>
                      <div className="mt-4 border-t border-gray-800 pt-4">
                        <span className="text-teal-500 font-bold block mb-2">LIVE PSQL LOG (restoration.log):</span>
                        <div className="bg-black/50 p-3 rounded border border-gray-800 h-48 overflow-y-auto font-mono text-[10px] text-gray-300">
                          {debugLogs.restoration}
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-amber-500 font-bold block mb-2">PIPE TRACE (industrial_trace.log):</span>
                        <div className="bg-black/50 p-3 rounded border border-gray-800 h-24 overflow-y-auto font-mono text-[10px] text-gray-400">
                          {debugLogs.trace}
                        </div>
                      </div>
                    </pre>
                  </div>
                )}
              </div>
            )}

            {activeJob.status === 'completed' ? (
              <button 
                onClick={() => {setFile(null); setActiveJob(null); window.location.reload();}} 
                className="mt-2 text-teal-600 font-medium hover:text-teal-700 underline underline-offset-4"
              >
                Upload another file
              </button>
            ) : activeJob.status === 'failed' ? (
              <div className="mt-4 animate-in fade-in duration-700">
                <button 
                  onClick={() => setShowDebugger(!showDebugger)}
                  className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors flex items-center mx-auto"
                >
                  <span className="mr-2">🔍</span> 
                  {showDebugger ? "Hide Diagnostic Console" : "View Restoration Logs"}
                </button>
                
                {showDebugger && (
                  <div className="mt-4 text-left bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-2xl overflow-hidden max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                      <div className="flex space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Postgres Diagnostic Console (Post-Mortem)</span>
                    </div>
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      <span className="text-gray-600">[$]</span> tail -f /var/log/restoration.log{"\n"}
                      <span className="text-gray-600">[{currentTime || '...'}]</span> <span className="text-red-400">Restoration Failed:</span>{"\n"}
                      <span className="text-white mt-1 block bg-red-900/20 p-2 rounded border border-red-900/30">
                        {activeJob.log || "No detailed logs provided by database. Check server connectivity."}
                      </span>
                    </pre>
                  </div>
                )}
                
                <button 
                  onClick={() => {setFile(null); setActiveJob(null); window.location.reload();}} 
                  className="mt-6 text-gray-400 text-xs hover:text-gray-600 underline underline-offset-4 block mx-auto"
                >
                  Discard and try again
                </button>
              </div>
            ) : activeJob.status !== 'restoring' && (
              <div className="mt-2 text-xs text-gray-400">
                Profiling and reconciliation in progress... 
                {file && <span className="italic block mt-1">Remaining: ~{Math.max(1, Math.ceil(file.size / (40 * 1024 * 1024)))}m</span>}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100 inline-block">⚠️ {error}</p>}
      </div>
      
      <p className="text-xs text-gray-400 mt-4 italic">
        * SQL dumps are processed in a staging sandbox. Your source file remains read-only.
      </p>
    </div>
  );
}

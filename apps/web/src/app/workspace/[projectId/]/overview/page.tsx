'use client';

import React from 'react';
import { useJob } from '@/components/JobProvider';
import { 
  Activity, BarChart3, Clock, Database, 
  FileText, ShieldCheck, Zap, Layers, ArrowRight 
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function ProjectOverview() {
  const { activeJob } = useJob();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;

  return (
    <div className="space-y-8">
      {/* Welcome & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Project Overview</h1>
          <p className="text-slate-400 mt-2 max-w-xl">
            Welcome back. This workspace is scoped to your active migration initiative. 
            Initialize your pipeline by uploading a SQL dump in the <span className="text-teal-400 font-medium cursor-pointer" onClick={() => router.push(`/workspace/${projectId}/upload`)}>Upload</span> section.
          </p>
        </div>
        <div className="flex space-x-6 pb-1">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Jobs</p>
            <p className="text-xl font-mono text-white">1</p>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Migrations</p>
            <p className="text-xl font-mono text-white">12</p>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quality</p>
            <p className="text-xl font-mono text-teal-400">94%</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Job Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
                <Activity className="h-4 w-4 mr-2 text-teal-400" />
                Latest Sandbox Activity
              </h2>
              <div className="flex items-center px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded text-[10px] font-bold text-teal-400">
                ACTIVE
              </div>
            </div>
            
            <div className="p-8">
              {!activeJob ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50">
                    <Database className="h-8 w-8 text-slate-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-200 font-bold">No Active Data Sandbox</p>
                    <p className="text-xs text-slate-500 mt-1">Upload a SQL dump to start your first job.</p>
                  </div>
                  <button 
                    onClick={() => router.push(`/workspace/${projectId}/upload`)}
                    className="mt-2 px-6 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-bold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-95"
                  >
                    Upload SQL Now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center space-x-3 text-slate-200">
                      <FileText className="h-5 w-5 text-teal-500" />
                      <span className="font-mono text-sm">{activeJob.filename.split('_').pop()}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-bold uppercase tracking-tighter">Extraction Progress</span>
                        <span className="text-teal-400 font-mono">100%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-[100%] rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Tables</p>
                        <p className="text-lg font-mono text-white">{activeJob.profile?.metadata?.table_count || 0}</p>
                      </div>
                      <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Rows</p>
                        <p className="text-lg font-mono text-white">{(activeJob.profile?.metadata?.total_rows || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-64 flex flex-col justify-between">
                    <div className="space-y-3">
                      <button 
                        onClick={() => router.push(`/workspace/${projectId}/diagnostics`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all border border-slate-700 group"
                      >
                        <div className="flex items-center">
                          <BarChart3 className="h-3.5 w-3.5 mr-2 text-teal-500" />
                          View Diagnostics
                        </div>
                        <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button 
                        onClick={() => router.push(`/workspace/${projectId}/visualizer`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all border border-slate-700 group"
                      >
                        <div className="flex items-center">
                          <Layers className="h-3.5 w-3.5 mr-2 text-teal-500" />
                          Open Visualizer
                        </div>
                        <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    
                    <div className="mt-6 md:mt-0 p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl">
                      <p className="text-[10px] text-teal-500 font-bold uppercase mb-2 flex items-center">
                        <ShieldCheck className="h-3 w-3 mr-1.5" />
                        Migration Hub
                      </p>
                      <p className="text-[11px] text-slate-400 mb-4 font-medium leading-relaxed">Your extracted data is ready for mapping and export.</p>
                      <button 
                         onClick={() => router.push(`/workspace/${projectId}/mapping`)}
                        className="w-full py-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-500/30 rounded-lg text-[11px] font-bold transition-all active:scale-[0.98]"
                      >
                        Build Migration →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-slate-500" />
              Recent History
            </h3>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-xl transition-all cursor-default">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">Simulation Executed</p>
                      <p className="text-[10px] text-slate-500">Dry-run on legacy_crm_target • {i}h ago</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">
                    v0.2.1
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 shadow-xl shadow-teal-900/10 overflow-hidden relative group">
            <div className="absolute -right-8 -bottom-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-xl font-bold text-white leading-tight">Ready to migrate your data?</h3>
              <p className="text-teal-100 text-xs font-medium leading-relaxed">
                Connect your live PostgreSQL or Supabase destination and simulate the push in seconds.
              </p>
              <button 
                onClick={() => router.push(`/workspace/${projectId}/destination`)}
                className="w-full py-3 bg-white text-teal-900 rounded-xl text-sm font-extrabold shadow-md hover:bg-teal-50 transition-all active:scale-95 flex items-center justify-center group"
              >
                Go to Destination
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {[
                { label: 'Documentation', icon: FileText, path: '/docs' },
                { label: 'Security Overview', icon: ShieldCheck, path: '#' },
                { label: 'Project Settings', icon: Settings, path: `/workspace/${projectId}/settings` },
              ].map((link, idx) => (
                <li key={idx}>
                  <a href={link.path} className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors py-1 group">
                    <div className="flex items-center">
                      <link.icon className="h-3.5 w-3.5 mr-2.5 opacity-50 group-hover:opacity-100 group-hover:text-teal-400" />
                      {link.label}
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.6498 10.6151 7.84212L6.86514 11.8421C6.67627 12.0436 6.35985 12.0538 6.1584 11.8649C5.95694 11.676 5.94674 11.3596 6.1356 11.1581L9.51347 7.5L6.1356 3.84191C5.94674 3.64045 5.95694 3.32403 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 10C8.88071 10 10 8.88071 10 7.5C10 6.11929 8.88071 5 7.5 5C6.11929 5 5 6.11929 5 7.5C5 8.88071 6.11929 10 7.5 10ZM7.5 11C9.43299 11 11 9.43299 11 7.5C11 5.56701 9.43299 4 7.5 4C5.56701 4 4 5.56701 4 7.5C4 9.43299 5.56701 11 7.5 11ZM1.51658 6.19658C1.3934 5.86311 1.55495 5.48512 1.88414 5.34027L3.061 4.82245C3.38559 4.67965 3.77114 4.82143 3.93188 5.13942C4.1207 5.51296 4.34125 5.86047 4.58882 6.17726L1.87569 7.37083L1.51658 6.19658ZM13.4834 8.80342C13.6066 9.13689 13.4451 9.51488 13.1159 9.65973L11.939 10.1775C11.6144 10.3204 11.2289 10.1786 11.0681 9.86058C10.8793 9.48704 10.6587 9.13953 10.4112 8.82274L13.1243 7.62917L13.4834 8.80342ZM4.82245 11.939C4.67965 11.6144 4.82143 11.2289 5.13942 11.0681C5.51296 10.8793 5.86047 10.6587 6.17726 10.4112L7.37083 13.1243L6.19658 13.4834C5.86311 13.6066 5.48512 13.4451 5.34027 13.1159L4.82245 11.939ZM10.1775 3.061C10.3204 3.38559 10.1786 3.77114 9.86058 3.93188C9.48704 4.1207 9.13953 4.34125 8.82274 4.58882L7.62917 1.87569L8.80342 1.51658C9.13689 1.3934 9.51488 1.55495 9.65973 1.88414L10.1775 3.061ZM1.88414 9.65973C1.55495 9.51488 1.3934 9.13689 1.51658 8.80342L1.87569 7.62917L4.58882 8.82274C4.34125 9.13953 4.1207 9.48704 3.93188 9.86058C3.77114 10.1786 3.38559 10.3204 3.061 10.1775L1.88414 9.65973ZM13.1159 5.34027C13.4451 5.48512 13.6066 5.86311 13.4834 6.19658L13.1243 7.37083L10.4112 6.17726C10.6587 5.86047 10.8793 5.51296 11.0681 5.13942C11.2289 4.82143 11.6144 4.67965 11.939 4.82245L13.1159 5.34027ZM9.65973 13.1159C9.51488 13.4451 9.13689 13.6066 8.80342 13.4834L7.62917 13.1243L8.82274 10.4112C9.13953 10.6587 9.48704 10.8793 9.86058 11.0681C10.1786 11.2289 10.3204 11.6144 10.1775 11.939L9.65973 13.1159ZM5.34027 1.88414C5.48512 1.55495 5.86311 1.3934 6.19658 1.51658L7.37083 1.87569L6.17726 4.58882C5.86047 4.34125 5.51296 4.1207 5.13942 3.93188C4.82143 3.77114 4.67965 3.38559 4.82245 3.061L5.34027 1.88414Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
);

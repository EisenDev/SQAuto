'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, Upload, Search, Database, 
  Settings, History, Terminal, Play,
  ChevronRight, LayoutGrid, FileCode,
  ShieldCheck, ArrowRight, Activity
} from 'lucide-react';

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  React.useEffect(() => {
    if (!projectId) return;
    import('@/lib/api_client').then(({ safeFetch }) => {
      safeFetch(`${API_URL}/projects/${projectId}`).then(res => {
        if (res.success && res.data?.organization_id) {
          setOrgId(res.data.organization_id);
        }
      });
    });
  }, [projectId, API_URL]);

  const quickActions = [
    { id: 'upload', name: 'Upload SQL Dump', desc: 'Initialize your source database extraction', icon: Upload, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { id: 'explorer', name: 'Schema Explorer', desc: 'Inspect identified entities and relations', icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'transform', name: 'Define Rules', desc: 'Configure transformation & mapping logic', icon: FileCode, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'deploy', name: 'Target Deploy', desc: 'Execute migration to target database', icon: Rocket, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in duration-500">
      
      {/* Dynamic Sub-header for the page */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
            Project Instance
            <span className="mx-2 opacity-50">/</span>
            <span className="text-teal-500/80">{projectId}</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Project Overview</h1>
        </div>

        <div className="flex items-center space-x-3">
          <button className="p-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors">
            <Settings className="h-5 w-5 text-slate-400" />
          </button>
          <button 
            onClick={() => router.push(orgId ? `/dashboard/org/${orgId}` : '/dashboard/organizations')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-sm font-bold text-slate-300 transition-all active:scale-95 flex items-center space-x-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span>Exit Project</span>
          </button>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, i) => (
          <div 
            key={action.id}
            style={{ animationDelay: `${i * 100}ms` }}
            className="group relative p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4"
          >
            <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center mb-6 border border-slate-800/50 group-hover:scale-110 transition-transform`}>
              <action.icon className={`h-6 w-6 ${action.color}`} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{action.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed h-10">{action.desc}</p>
            
            <div className="mt-6 flex items-center text-teal-400 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Configure Now <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        ))}
      </section>

      {/* Secondary Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <History className="h-5 w-5 mr-3 text-teal-500" />
            Recent Migration Logs
          </h2>
          <div className="bg-slate-950/50 border border-slate-900 rounded-3xl overflow-hidden">
            <div className="p-12 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                <Terminal className="h-8 w-8 text-slate-700" />
              </div>
              <div>
                <p className="text-slate-400 font-medium">Workspace is Clear</p>
                <p className="text-sm text-slate-600">No active migrations or logs detected for this project.</p>
              </div>
              <button className="px-6 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-bold text-slate-300 transition-all">
                Initialize Workflow
              </button>
            </div>
          </div>
        </section>

        {/* Stats / System Standby */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="h-5 w-5 mr-3 text-teal-500" />
            Engine Status
          </h2>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                <span>Engine Load</span>
                <span className="text-teal-500">Idle</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-teal-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="h-4 w-4 text-teal-500" />
                  <span className="text-sm text-slate-300">Integrity Lock</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                <div className="flex items-center space-x-3">
                  <LayoutGrid className="h-4 w-4 text-teal-500" />
                  <span className="text-sm text-slate-300">Cluster Sync</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { Rocket } from 'lucide-react';

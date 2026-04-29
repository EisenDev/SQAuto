'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { safeFetch } from '@/lib/api_client';
import { 
  Building2, Plus, ArrowRight, Layers, Search, 
  ChevronLeft, Layout, Rocket, AlertCircle, Loader2
} from 'lucide-react';

export default function OrganizationProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [projects, setProjects] = useState<any[]>([]);
  const [orgName, setOrgName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch projects for this org
        const projectsRes = await safeFetch(`${API_URL}/organizations/${orgId}/projects`);
        if (projectsRes.success && Array.isArray(projectsRes.data)) {
          setProjects(projectsRes.data);
        } else {
          setError(projectsRes.error || "Failed to load projects");
        }

        // Fetch org details for the name
        const orgRes = await safeFetch(`${API_URL}/organizations/${orgId}`);
        if (orgRes.success && orgRes.data) {
          setOrgName(orgRes.data.name);
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, API_URL]);

  return (
    <div className="flex-1 bg-slate-950 text-slate-200 p-8 min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Breadcrumbs / Back */}
        <button 
          onClick={() => router.push('/dashboard/organizations')}
          className="flex items-center text-slate-500 hover:text-white transition-colors group text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          Back to Organizations
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-teal-500/80">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{orgName || "Organization"}</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Project Hub</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative hidden sm:block">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Find a project..." 
                className="pl-9 pr-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-48 outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => router.push(`/dashboard/new/${orgId}`)}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Project Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-900/40 border border-slate-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
              <Layout className="h-8 w-8 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 font-bold text-lg">No projects yet</p>
              <p className="text-slate-500 text-sm mt-1">Kickstart your workflow by creating your first project.</p>
            </div>
            <button 
              onClick={() => router.push(`/dashboard/new/${orgId}`)}
              className="mt-2 text-teal-500 text-sm font-bold hover:text-teal-400 transition-colors flex items-center space-x-2"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <div 
                key={project.id}
                onClick={() => router.push(`/dashboard/project/${project.id}`)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="group relative bg-slate-900/80 border border-slate-800/50 rounded-2xl p-6 hover:border-teal-500/40 hover:bg-slate-800/60 transition-all cursor-pointer shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500 active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-teal-900/20 flex items-center justify-center border border-teal-500/10 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all duration-300">
                    <Layout className="h-6 w-6 text-teal-400" />
                  </div>
                  <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    Active
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors tracking-tight">
                    {project.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono truncate opacity-60">
                    ID: {project.id}
                  </p>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-teal-500/80 transition-colors">
                    <Rocket className="h-3 w-3 mr-2 opacity-50 group-hover:opacity-100" />
                    Open Dashboard
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

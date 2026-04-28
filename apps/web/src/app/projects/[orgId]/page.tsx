'use client';

import React, { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/api_client';
import { useRouter, useParams } from 'next/navigation';
import { 
  Layers, Plus, ArrowRight, ExternalLink,
  Calendar, CheckCircle2, AlertCircle, Search,
  ChevronLeft
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    if (!orgId) return;
    
    // Fetch Org details
    safeFetch(`${API_URL}/organizations/${orgId}`).then(res => {
      if (res.success) setOrg(res.data);
    });

    // Fetch Projects
    safeFetch(`${API_URL}/organizations/${orgId}/projects`).then(res => {
      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data);
      }
      setLoading(false);
    });
  }, [API_URL, orgId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Breadcrumbs / Back Navigation */}
        <nav className="flex items-center space-x-4 text-sm font-medium">
          <button 
            onClick={() => router.push('/organizations')}
            className="flex items-center text-slate-500 hover:text-white transition-colors group"
          >
            <ChevronLeft className="mr-1 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Organizations
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-teal-400 font-bold">{org?.name || "Loading..."}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
              <Layers className="mr-3 h-8 w-8 text-teal-500" />
              Migration Projects
            </h1>
            <p className="text-slate-400">View and manage dedicated migration workspaces for this organization.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-95">
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* Project Gallery */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
              <Layers className="h-8 w-8 text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium text-lg">No projects found in this organization.</p>
            <button className="text-teal-500 text-sm font-bold hover:underline">Launch your first migration project</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => router.push(`/workspace/${proj.id}/overview`)}
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-8 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-2xl active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-14 w-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-teal-500/30 group-hover:bg-teal-900/20 transition-all">
                    <Layers className="h-7 w-7 text-slate-500 group-hover:text-teal-400" />
                  </div>
                  <div className="flex items-center px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-500 tracking-wider">
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    DATA READY
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors">{proj.name}</h2>
                <p className="text-slate-500 text-sm mt-3 line-clamp-2 h-10 leading-relaxed font-medium">
                  {proj.description || "Active migration sandbox for legacy SQL data transformation."}
                </p>

                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Active Jobs</p>
                    <p className="text-sm font-mono text-slate-200">2 Units</p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Storage</p>
                    <p className="text-sm font-mono text-slate-200">1.2 GB</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Last Run</p>
                    <p className="text-sm font-mono text-slate-200">2h ago</p>
                  </div>
                </div>

                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-teal-400" />
                </div>
              </div>
            ))}

            {/* Ghost Add Card */}
            <div className="border-2 border-slate-800 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all cursor-pointer group">
              <div className="h-12 w-12 rounded-full border border-slate-800 flex items-center justify-center group-hover:border-teal-500/50 transition-colors">
                <Plus className="h-6 w-6 text-slate-700 group-hover:text-teal-400 transition-colors" />
              </div>
              <p className="text-slate-600 group-hover:text-teal-500 font-bold transition-colors">Add Project</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

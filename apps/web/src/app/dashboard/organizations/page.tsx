'use client';

import React, { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/api_client';
import { useRouter } from 'next/navigation';
import { 
  Building2, Plus, ArrowRight, Activity, 
  Calendar, Layers, Filter, Search 
} from 'lucide-react';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    safeFetch(`${API_URL}/organizations`).then(res => {
      if (res.success && Array.isArray(res.data)) {
        setOrgs(res.data);
      }
      setLoading(false);
    });
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
              <Building2 className="mr-3 h-8 w-8 text-teal-500" />
              Organizations
            </h1>
            <p className="text-slate-400">Select an organization to manage your migration projects.</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search organizations..." 
                className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-64 outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-semibold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl space-y-4">
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium text-lg">No organizations found.</p>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="text-teal-500 text-sm font-bold hover:underline"
            >
              Start by creating one
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map((org) => (
              <div 
                key={org.id}
                onClick={() => router.push(`/dashboard/project/${org.id}/overview`)} // Temporary redirect for testing, eventually should list projects
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-teal-900/10 active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-xl bg-teal-900/30 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform">
                    <Building2 className="h-6 w-6 text-teal-400" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors uppercase tracking-tight font-mono">
                  {org.name}
                </h2>
                <div className="h-1 w-12 bg-teal-500/30 mt-2 mb-4 group-hover:w-24 transition-all" />

                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
                    <div className="flex items-center">
                      <Layers className="h-3 w-3 mr-1.5" />
                      Projects
                    </div>
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

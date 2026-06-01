'use client';

import React, { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/api_client';
import { useRouter } from 'next/navigation';
import { 
  Building2, Plus, ArrowRight, Layers, Search 
} from 'lucide-react';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    router.prefetch('/dashboard/new');
    safeFetch(`${API_URL}/organizations/`).then(res => {
      if (res.success && Array.isArray(res.data)) {
        setOrgs(res.data);
        res.data.forEach((org: any) => {
          if (org?.id) router.prefetch(`/dashboard/org/${org.id}`);
        });
      }
      setLoading(false);
    });
  }, [API_URL, router]);

  return (
    <div className="flex-1 bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
              <Building2 className="mr-2 h-6 w-6 text-teal-500" />
              Organizations
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 w-48 outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-semibold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-slate-800 border-dashed rounded-2xl space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No organizations found.</p>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="text-teal-500 text-xs font-bold hover:underline"
            >
              Start by creating one
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgs.map((org) => (
              <div 
                key={org.id}
                onClick={() => router.push(`/dashboard/org/${org.id}`)}
                className="group relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-900/20 flex items-center justify-center border border-teal-500/10 group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5 text-teal-400" />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors uppercase tracking-tight font-mono">
                  {org.name}
                </h2>
                <div className="h-0.5 w-8 bg-teal-500/20 mt-1.5 mb-3 group-hover:w-16 transition-all" />

                <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    <Layers className="h-3 w-3 mr-1.5 opacity-40" />
                    Projects
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

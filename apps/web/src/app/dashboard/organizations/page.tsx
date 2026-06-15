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
    <div className="flex-1 bg-brand-bg text-text-primary p-8 min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.06),transparent_35%)]">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-250 pb-6">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center">
              <Building2 className="mr-3 h-7 w-7 text-brand-primary" />
              Organizations
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-white border border-brand-border rounded-xl text-xs text-text-secondary focus:ring-1 focus:ring-brand-primary focus:border-brand-primary w-48 outline-none transition-all placeholder:text-text-muted/60"
              />
            </div>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Grid List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-brand-card border border-brand-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-brand-card/40 border border-brand-border border-dashed rounded-2xl space-y-3">
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium text-sm">No organizations found.</p>
            <button 
              onClick={() => router.push('/dashboard/new')}
              className="text-brand-primary text-xs font-bold hover:underline"
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
                className="group relative bg-brand-card border border-brand-border rounded-xl p-5 hover:border-brand-borderHover hover:bg-brand-cardHover transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-primaryLight flex items-center justify-center border border-brand-primaryBorder group-hover:scale-105 transition-transform">
                    <Building2 className="h-5 w-5 text-brand-primary" />
                  </div>
                </div>

                <h2 className="text-lg font-bold text-text-primary group-hover:text-brand-primary transition-colors uppercase tracking-tight font-sans">
                  {org.name}
                </h2>
                <div className="h-0.5 w-8 bg-brand-primary/20 mt-1.5 mb-3 group-hover:w-16 transition-all" />

                <div className="mt-6 pt-4 border-t border-brand-border flex items-center justify-between">
                  <div className="flex items-center text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                    <Layers className="h-3 w-3 mr-1.5 opacity-60" />
                    Projects
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

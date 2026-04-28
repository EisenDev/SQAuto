'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeFetch } from '@/lib/api_client';
import { Building2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function NewOrganizationPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await safeFetch(`${API_URL}/organizations`, {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() })
    });

    if (res.success) {
      toast.success('Organization created successfully!');
      router.push(`/projects/${res.data.id}/new`);
    } else {
      toast.error(res.error || 'Failed to create organization');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 blur-[100px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-600/5 blur-[80px] rounded-full -z-10" />

      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-4">
            <Building2 className="h-8 w-8 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create your organization</h1>
          <p className="text-slate-400 text-sm">Every industrial migration starts with a workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
              Organization Name
            </label>
            <div className="relative group">
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp Migration"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                disabled={loading}
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-teal-500 transition-colors" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full group relative flex items-center justify-center px-8 py-4 bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-xl shadow-teal-500/20 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Create Organization
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-600 text-[10px] uppercase tracking-widest font-mono">
          SQAUTO Enterprise Infrastructure
        </p>
      </div>
    </div>
  );
}

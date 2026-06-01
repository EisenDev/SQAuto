'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Building2,
  Shield, Sparkles 
} from 'lucide-react';

export default function NewOrganizationPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    router.prefetch('/dashboard/organizations');
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    setError(null);
    try {
      const orgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const orgData = await orgRes.json().catch(() => null);

      if (!orgRes.ok || !orgData?.id) {
        const message = orgData?.message || orgData?.detail || 'Unable to create organization.';
        setError(message);
        toast.error(message);
        return;
      }

      if (orgData.id) {
        router.prefetch(`/dashboard/new/${orgData.id}`);
        router.push(`/dashboard/new/${orgData.id}`);
      }
    } catch (err) {
      console.error(err);
      const message = 'Unable to create organization.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-slate-950 text-slate-200 flex items-start justify-center overflow-hidden px-6 pt-10 pb-8 md:pt-14">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
            <Building2 className="h-5 w-5 text-teal-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create a new organization</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Organizations are a way to group your projects. Each organization can be configured with different team members and billing settings.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">Organization Name</label>
              <input 
                required
                autoFocus
                type="text" 
                placeholder="e.g. Acme Corporation" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500 ml-0.5">What's the name of your company or team? You can change this later.</p>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
            <button 
              type="button"
              onClick={() => router.push('/dashboard/organizations')}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded transition-all border border-slate-800"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !name}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded text-xs font-bold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-[0.98]"
            >
              {loading ? 'Creating...' : 'Create organization'}
            </button>
          </div>
        </form>

        <div className="pt-8 grid grid-cols-2 gap-6 border-t border-slate-800/30 opacity-40">
           <div className="flex items-start space-x-2">
             <Shield className="h-3.5 w-3.5 text-teal-500 mt-0.5" />
             <span className="text-[10px] text-slate-400 leading-tight">Enterprise-grade security isolation</span>
           </div>
           <div className="flex items-start space-x-2">
             <Sparkles className="h-3.5 w-3.5 text-teal-500 mt-0.5" />
             <span className="text-[10px] text-slate-400 leading-tight">Automatic infrastructure scaling</span>
           </div>
        </div>
      </div>
    </div>
  );
}

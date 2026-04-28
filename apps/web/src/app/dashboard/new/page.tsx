'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, ArrowLeft, Rocket, 
  Shield, CheckCircle2, Sparkles 
} from 'lucide-react';

export default function NewOrganizationPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    try {
      // Create Organization
      const orgRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const orgData = await orgRes.json();

      if (orgData.id) {
        // Redirect to Step 2: Project Creation
        // Note: Using the hashed/ID provided by backend
        router.push(`/dashboard/new/${orgData.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-slate-950">
      
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="space-y-2">
          <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
            <Building2 className="h-6 w-6 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create Organization</h1>
          <p className="text-slate-400">Step 1: Define your organization name to get started.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Organization Name</label>
            <input 
              required
              autoFocus
              type="text" 
              placeholder="e.g. Acme Corporation" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <button 
            disabled={loading || !name}
            className="w-full group relative flex items-center justify-center space-x-2 px-6 py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 rounded-xl text-lg font-bold text-white transition-all shadow-xl shadow-teal-900/20 active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowLeft className="h-5 w-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-8 border-t border-slate-800/50 grid grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-teal-500/60 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Enterprise Security</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">RBAC and encrypted isolation by default.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-teal-500/60 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Auto-Scaling</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Infrastructure that grows with your team.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

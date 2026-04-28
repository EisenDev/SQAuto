'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Plus, ArrowLeft, Rocket, 
  Shield, CheckCircle2, Sparkles,
  Layout, Lock
} from 'lucide-react';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    try {
      // Create Project
      const projRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          organization_id: orgId,
          password: password || undefined
        }),
      });
      const projData = await projRes.json();

      if (projData.id) {
        // Redirect to Step 3: Project Dashboard
        // Route as requested: /dashboard/project/{project_id}
        router.push(`/dashboard/project/${projData.id}`);
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
          Back
        </button>

        <div className="space-y-2">
          <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
            <Layout className="h-6 w-6 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Setup your Project</h1>
          <p className="text-slate-400">Step 2: Initialize your first project within the organization.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Project Name</label>
            <input 
              required
              autoFocus
              type="text" 
              placeholder="e.g. Database Migration Q4" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-semibold text-slate-300">Project Password</label>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Optional</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button 
            disabled={loading || !name}
            className="w-full group relative flex items-center justify-center space-x-2 px-6 py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-teal-600 rounded-xl text-lg font-bold text-white transition-all shadow-xl shadow-teal-900/20 active:scale-[0.98]"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Launch Project</span>
                <Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-8 border-t border-slate-800/50 flex items-center justify-center space-x-6 text-slate-500 text-xs">
          <div className="flex items-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500/50 mr-1.5" />
            Zero-config deploy
          </div>
          <div className="flex items-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500/50 mr-1.5" />
            Instant isolation
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Plus, ArrowLeft, Rocket, 
  Shield, CheckCircle2, Sparkles,
  Layout, Lock, AlertCircle, Database, GitCompare
} from 'lucide-react';

type ProjectType = 'individual' | 'comparison';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId;

  React.useEffect(() => {
    if (!orgId) return;
    router.prefetch(`/dashboard/org/${orgId}`);
  }, [orgId, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    setError(null);
    try {
      // Create Project using the organizational endpoint
      const projRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/${orgId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          project_type: projectType,
          password: password || undefined
        }),
      });
      
      if (!projRes.ok) {
        const errorData = await projRes.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Unable to create project. Please try again.');
      }

      const projData = await projRes.json();

      if (projData.id) {
        router.prefetch(`/dashboard/project/${projData.id}`);
        if (projectType === 'comparison') {
          router.prefetch(`/dashboard/project/${projData.id}/comparison`);
        } else {
          router.prefetch(`/dashboard/project/${projData.id}/sql`);
        }
        router.push(`/dashboard/project/${projData.id}`);
      } else {
        throw new Error('Project created but no ID was returned.');
      }
    } catch (err: any) {
      console.error('Project Creation Error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-900/10 via-slate-950 to-slate-950">
      
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


        <div className="space-y-2">
          <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6">
            <Layout className="h-6 w-6 text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Create your project</h1>
          <p className="text-slate-400">
            Projects are separate migration workspaces inside one organization. One organization can hold multiple projects.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 animate-in fade-in zoom-in duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

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

          <div className="space-y-3">
            <div className="space-y-1 ml-1">
              <label className="text-sm font-semibold text-slate-300">Project Type</label>
              <p className="text-xs text-slate-500">
                Select how this project will read SQL dump data. This choice labels the project and keeps the workflow clear.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProjectType('individual')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  projectType === 'individual'
                    ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-950/20'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <Database className="h-5 w-5 text-teal-400" />
                  </div>
                  {projectType === 'individual' ? <CheckCircle2 className="h-4 w-4 text-teal-400" /> : null}
                </div>
                <div className="mt-4 space-y-1">
                  <div className="text-sm font-bold text-white">Individual SQL Dump</div>
                  <p className="text-xs leading-relaxed text-slate-500">Read and migrate one SQL dump as the source of truth.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProjectType('comparison')}
                className={`text-left rounded-xl border p-4 transition-all ${
                  projectType === 'comparison'
                    ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-950/20'
                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <GitCompare className="h-5 w-5 text-teal-400" />
                  </div>
                  {projectType === 'comparison' ? <CheckCircle2 className="h-4 w-4 text-teal-400" /> : null}
                </div>
                <div className="mt-4 space-y-1">
                  <div className="text-sm font-bold text-white">Compare Two Dumps</div>
                  <p className="text-xs leading-relaxed text-slate-500">Compare two different SQL dumps before migration decisions.</p>
                </div>
              </button>
            </div>
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

          <div className="flex items-center justify-between pt-6 border-t border-slate-800/60">
            <button 
              type="button"
              onClick={() => router.push(`/dashboard/org/${orgId}`)}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition-all border border-slate-800"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !name}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-teal-900/20 active:scale-[0.98] flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Project</span>
                  <Rocket className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
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

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
    <div className="min-h-screen bg-brand-bg text-text-primary flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.06),transparent_35%)]">
      
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


        <div className="space-y-2">
          <div className="h-12 w-12 rounded-xl bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center mb-6">
            <Layout className="h-6 w-6 text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Create your project</h1>
          <p className="text-text-secondary">
            Projects are separate migration workspaces inside one organization. One organization can hold multiple projects.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-700 animate-in fade-in zoom-in duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary ml-1">Project Name</label>
            <input 
              required
              autoFocus
              type="text" 
              placeholder="e.g. Database Migration Q4" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-text-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-text-muted/50"
            />
          </div>



          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-semibold text-text-secondary">Project Password</label>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded border border-brand-border">Optional</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/65" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-brand-border rounded-xl text-text-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-text-muted/50"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-brand-border">
            <button 
              type="button"
              onClick={() => router.push(`/dashboard/org/${orgId}`)}
              className="px-6 py-2 bg-white hover:bg-stone-50 text-text-secondary text-sm font-semibold rounded-xl transition-all border border-brand-border"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !name}
              className="px-6 py-2 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98] flex items-center space-x-2"
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

        <div className="pt-8 border-t border-brand-border flex items-center justify-center space-x-6 text-text-muted text-xs font-medium">
          <div className="flex items-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary/60 mr-1.5" />
            Zero-config deploy
          </div>
          <div className="flex items-center">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary/60 mr-1.5" />
            Instant isolation
          </div>
        </div>
      </div>
    </div>
  );
}

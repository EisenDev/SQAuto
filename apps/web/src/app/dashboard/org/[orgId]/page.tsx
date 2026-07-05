'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { safeFetch } from '@/lib/api_client';
import { toast } from 'sonner';
import {
  Building2, Plus, ArrowRight, Search,
  ChevronLeft, Layout, Rocket, AlertCircle, X, Lock
} from 'lucide-react';

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return null;
  }
}

export default function OrganizationProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const [projects, setProjects] = useState<any[]>([]);
  const [orgName, setOrgName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [password, setPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [projectsRes, orgRes] = await Promise.all([
        safeFetch(`${API_URL}/organizations/${orgId}/projects`),
        safeFetch(`${API_URL}/organizations/${orgId}`),
      ]);

      if (projectsRes.success && Array.isArray(projectsRes.data)) {
        setProjects(projectsRes.data);
        projectsRes.data.forEach((project: any) => {
          if (project?.id) router.prefetch(`/dashboard/project/${project.id}`);
        });
      } else {
        setError(projectsRes.error || 'Failed to load projects');
      }

      if (orgRes.success && orgRes.data) {
        setOrgName(orgRes.data.name);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId, API_URL]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const openModal = () => {
    setProjectName('');
    setPassword('');
    setCreateError(null);
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setCreateLoading(true);
    setCreateError(null);
    try {
      const projRes = await safeFetch(`${API_URL}/organizations/${orgId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          password: password || undefined,
        }),
      });

      if (!projRes.success || !projRes.data?.id) {
        const message = projRes.error || 'Unable to create project.';
        setCreateError(message);
        toast.error(message);
        return;
      }

      const projData = projRes.data;
      toast.success(`Project "${projData.name}" created!`);
      setModalOpen(false);
      router.push(`/dashboard/project/${projData.id}`);
    } catch (err: any) {
      const message = err.message || 'An unexpected error occurred.';
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = projects.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 bg-brand-bg text-text-primary min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.06),transparent_35%)]">
      <div className="w-full max-w-[1200px] mx-auto px-8 pt-8 pb-12">

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard/organizations')}
          className="flex items-center text-text-muted hover:text-text-primary transition-colors group text-sm font-semibold mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          Back to Organizations
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-brand-border pb-5 mb-6">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2 text-brand-primary/80 mb-0.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold uppercase tracking-widest">{orgName || 'Organization'}</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Project Hub</h1>
            <p className="text-[13px] text-text-muted">
              Each project is an isolated migration workspace with its own SQL dump, tools, and history.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="relative hidden sm:block">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Find a project..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-brand-border rounded-xl text-xs text-text-secondary focus:ring-1 focus:ring-brand-primary focus:border-brand-primary w-44 outline-none transition-all placeholder:text-text-muted/65"
              />
            </div>
            <button
              onClick={openModal}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-700 mb-6">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-brand-card border border-brand-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-brand-card/40 border border-brand-border border-dashed rounded-2xl space-y-4 w-full animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 rounded-2xl bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center">
              <Layout className="h-8 w-8 text-brand-primary" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">No projects yet</h3>
              <p className="text-xs text-text-muted max-w-sm">
                Create a project to initialize an SQL migration workspace inside this organization.
              </p>
            </div>
            <button
              onClick={openModal}
              className="flex items-center space-x-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Project</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No projects match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filtered.map((project, i) => {
              const lastActive = formatDate(project.updated_at || project.created_at);

              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="group relative bg-white border border-brand-border rounded-2xl p-5 hover:border-brand-primary/40 hover:shadow-md transition-all cursor-pointer shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 active:scale-[0.985] flex flex-col"
                >
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-primaryLight flex items-center justify-center border border-brand-primaryBorder group-hover:scale-105 transition-transform duration-200">
                      <Layout className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-brand-primaryBorder bg-brand-primaryLight text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                      Migration
                    </div>
                  </div>

                  {/* Name */}
                  <h2 className="text-base font-medium text-text-primary group-hover:text-brand-primary transition-colors tracking-tight leading-snug">
                    {project.name}
                  </h2>

                  {/* Last active */}
                  {lastActive && (
                    <p className="text-[11px] text-text-muted mt-1">
                      Last active: {lastActive}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1 min-h-[12px]" />

                  {/* Footer */}
                  <div className="mt-4 pt-3.5 border-t border-brand-border flex items-center justify-between">
                    <div className="flex items-center text-[11px] font-semibold text-text-secondary uppercase tracking-widest group-hover:text-brand-primary transition-colors">
                      <Rocket className="h-3 w-3 mr-1.5 opacity-60 group-hover:opacity-100" />
                      Open Dashboard
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Creation Modal — no type selector, unified */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-premium border border-stone-200 w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start space-x-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center shrink-0">
                <Layout className="h-6 w-6 text-brand-primary" />
              </div>
              <div className="space-y-1 pt-1">
                <h2 className="text-xl font-bold text-text-primary tracking-tight">Create a new project</h2>
                <p className="text-xs text-text-secondary">
                  Add a migration workspace inside{' '}
                  <span className="font-semibold text-text-primary">{orgName || 'this organization'}</span>.
                </p>
              </div>
            </div>

            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-700 mb-5 animate-in fade-in zoom-in duration-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold">{createError}</div>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Project Name</label>
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="e.g. Database Migration Q4"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Project Password</label>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded border border-brand-border">Optional</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted/65" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-text-muted/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-stone-50 text-text-secondary text-xs font-bold rounded-xl transition-all border border-brand-border"
                >
                  Cancel
                </button>
                <button
                  disabled={createLoading || !projectName.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98] flex items-center space-x-2"
                >
                  {createLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Project</span>
                      <Rocket className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

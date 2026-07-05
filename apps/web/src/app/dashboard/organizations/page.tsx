'use client';

import React, { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/api_client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2, Plus, ArrowRight, Layers, Search, X, AlertCircle, Rocket
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

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const orgRes = await safeFetch(`${API_URL}/organizations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!orgRes.success || !orgRes.data?.id) {
        const message = orgRes.error || 'Unable to create organization.';
        setCreateError(message);
        toast.error(message);
        return;
      }

      const orgData = orgRes.data;
      toast.success(`Organization "${orgData.name}" created!`);
      setModalOpen(false);
      setName('');
      router.push(`/dashboard/org/${orgData.id}`);
    } catch (err) {
      const message = 'Unable to create organization.';
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = orgs.filter(o =>
    !search || o.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 bg-brand-bg text-text-primary min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.06),transparent_35%)]">
      <div className="w-full max-w-[1200px] mx-auto px-8 pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-brand-border pb-5 mb-6">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
              <Building2 className="h-6 w-6 text-brand-primary shrink-0" />
              Organizations
            </h1>
            <p className="text-[13px] text-text-muted pl-9">
              Your workspaces for managing schema migration projects.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-brand-border rounded-xl text-xs text-text-secondary focus:ring-1 focus:ring-brand-primary focus:border-brand-primary w-44 outline-none transition-all placeholder:text-text-muted/60"
              />
            </div>
            <button
              onClick={() => { setCreateError(null); setModalOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-brand-card border border-brand-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orgs.length === 0 ? (
          <div className="w-full space-y-4">
            <div className="flex flex-col items-center justify-center py-20 bg-brand-card/40 border border-brand-border border-dashed rounded-2xl space-y-4 w-full">
              <div className="h-16 w-16 rounded-2xl bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center">
                <Building2 className="h-8 w-8 text-brand-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">No organizations yet</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  Create an organization to start organizing your migration workspaces and data pipelines.
                </p>
              </div>
              <button
                onClick={() => { setCreateError(null); setModalOpen(true); }}
                className="flex items-center space-x-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Create your first organization</span>
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">
            No organizations match &ldquo;{search}&rdquo;
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filtered.map(org => {
              const projectCount = org.project_count ?? org.projects?.length ?? null;
              const createdAt = formatDate(org.created_at);

              return (
                <div
                  key={org.id}
                  onClick={() => router.push(`/dashboard/org/${org.id}`)}
                  className="group relative bg-white border border-brand-border rounded-2xl p-5 hover:border-brand-primary/40 hover:shadow-md transition-all cursor-pointer shadow-sm active:scale-[0.985] flex flex-col"
                >
                  {/* Top: icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-primaryLight flex items-center justify-center border border-brand-primaryBorder group-hover:scale-105 transition-transform duration-200">
                      <Building2 className="h-5 w-5 text-brand-primary" />
                    </div>
                  </div>

                  {/* Org name */}
                  <h2 className="text-base font-medium text-text-primary group-hover:text-brand-primary transition-colors tracking-tight leading-snug">
                    {org.name}
                  </h2>

                  {/* Project count */}
                  {projectCount !== null && (
                    <p className="text-[12px] text-text-muted mt-1">
                      {projectCount === 1 ? '1 project' : `${projectCount} projects`}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1 min-h-[12px]" />

                  {/* Footer */}
                  <div className="mt-4 pt-3.5 border-t border-brand-border flex items-center justify-between">
                    <span className="text-[11px] text-text-muted">
                      {createdAt ? `Created ${createdAt}` : ''}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-primary group-hover:translate-x-0.5 transition-transform">
                      View projects
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
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
                <Building2 className="h-6 w-6 text-brand-primary" />
              </div>
              <div className="space-y-1 pt-1">
                <h2 className="text-xl font-bold text-text-primary tracking-tight">Create a new organization</h2>
                <p className="text-xs text-text-secondary">
                  Group your database migration projects and manage workspace credentials.
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
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Organization Name</label>
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-brand-border rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-text-muted/50"
                />
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
                  disabled={createLoading || !name.trim()}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-[0.98] flex items-center space-x-2"
                >
                  {createLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Organization</span>
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

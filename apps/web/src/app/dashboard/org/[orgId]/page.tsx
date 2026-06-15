'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { safeFetch } from '@/lib/api_client';
import { 
  Building2, Plus, ArrowRight, Layers, Search, 
  ChevronLeft, Layout, Rocket, AlertCircle, Database, GitCompare
} from 'lucide-react';

export default function OrganizationProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const [projects, setProjects] = useState<any[]>([]);
  const [orgName, setOrgName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getProjectTypeMeta = (projectType?: string) => {
    if (projectType === 'comparison') {
      return {
        label: 'Comparison',
        description: 'Two SQL dumps',
        icon: GitCompare,
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    }

    return {
      label: 'Migration',
      description: 'Migration & verification',
      icon: Database,
      className: 'border-brand-primaryBorder bg-brand-primaryLight text-brand-primary',
    };
  };

  useEffect(() => {
    if (!orgId) return;
    router.prefetch(`/dashboard/new/${orgId}`);

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch projects for this org
        const projectsRes = await safeFetch(`${API_URL}/organizations/${orgId}/projects`);
        if (projectsRes.success && Array.isArray(projectsRes.data)) {
          setProjects(projectsRes.data);
          projectsRes.data.forEach((project: any) => {
            if (project?.id) {
              router.prefetch(`/dashboard/project/${project.id}`);
              router.prefetch(`/dashboard/project/${project.id}/comparison`);
            }
          });
        } else {
          setError(projectsRes.error || "Failed to load projects");
        }

        // Fetch org details for the name
        const orgRes = await safeFetch(`${API_URL}/organizations/${orgId}`);
        if (orgRes.success && orgRes.data) {
          setOrgName(orgRes.data.name);
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, API_URL, router]);

  return (
    <div className="flex-1 bg-brand-bg text-text-primary p-8 min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,118,110,0.06),transparent_35%)]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Breadcrumbs / Back */}
        <button 
          onClick={() => router.push('/dashboard/organizations')}
          className="flex items-center text-text-muted hover:text-text-primary transition-colors group text-sm font-semibold"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          Back to Organizations
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-brand-primary/80">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{orgName || "Organization"}</span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Project Hub</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative hidden sm:block">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Find a project..." 
                className="pl-9 pr-3 py-2 bg-white border border-brand-border rounded-xl text-xs text-text-secondary focus:ring-1 focus:ring-brand-primary focus:border-brand-primary w-48 outline-none transition-all placeholder:text-text-muted/65"
              />
            </div>
            <button 
              onClick={() => router.push(`/dashboard/new/${orgId}`)}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-primary hover:bg-brand-primaryHover rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-brand-primary/10 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Project Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-brand-card border border-brand-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-brand-card/40 border border-brand-border border-dashed rounded-3xl space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 rounded-2xl bg-stone-50 flex items-center justify-center border border-brand-border">
              <Layout className="h-8 w-8 text-text-muted" />
            </div>
            <div className="text-center">
              <p className="text-text-secondary font-bold text-lg">No projects yet</p>
              <p className="text-text-muted text-sm mt-1">Create an individual SQL dump project or a comparison project inside this organization.</p>
            </div>
            <button 
              onClick={() => router.push(`/dashboard/new/${orgId}`)}
              className="mt-2 text-brand-primary text-sm font-bold hover:text-brand-primaryHover transition-colors flex items-center space-x-2"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => {
              const typeMeta = getProjectTypeMeta(project.project_type);
              const TypeIcon = typeMeta.icon;

              return (
                <div 
                  key={project.id}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="group relative bg-brand-card border border-brand-border rounded-2xl p-6 hover:border-brand-borderHover hover:bg-brand-cardHover transition-all cursor-pointer shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-xl bg-brand-primaryLight flex items-center justify-center border border-brand-primaryBorder group-hover:scale-110 group-hover:bg-brand-primaryLight/80 transition-all duration-300">
                      <Layout className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${typeMeta.className}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeMeta.label}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-text-primary group-hover:text-brand-primary transition-colors tracking-tight font-sans">
                      {project.name}
                    </h2>
                    <p className="text-xs text-text-secondary">
                      {typeMeta.description}
                    </p>
                    <p className="text-xs text-text-muted font-mono truncate opacity-60">
                      ID: {project.id}
                    </p>
                  </div>

                  <div className="mt-8 pt-5 border-t border-brand-border flex items-center justify-between">
                    <div className="flex items-center text-[10px] font-bold text-text-secondary uppercase tracking-widest group-hover:text-brand-primary transition-colors">
                      <Rocket className="h-3 w-3 mr-2 opacity-60 group-hover:opacity-100" />
                      Open Dashboard
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

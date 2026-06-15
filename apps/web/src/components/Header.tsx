"use client";

import React from 'react';
import { useJob } from '@/components/JobProvider';
import { Database, Triangle, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export default function Header() {
  const { activeJob } = useJob();
  const params = useParams();
  const pathname = usePathname();
  const projectId = params?.projectId as string;
  const [projectData, setProjectData] = React.useState<{ name: string, organization?: { name: string } } | null>(null);
  
  React.useEffect(() => {
    if (!projectId) {
      setProjectData(null);
      return;
    }
    
    import('@/lib/api_client').then(({ safeFetch }) => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      
      // First fetch project to get organization_id
      safeFetch(`${API_URL}/projects/${projectId}`).then(res => {
        if (res.success && res.data) {
          const project = res.data;
          
          // If organization data is already there, use it
          if (project.organization) {
            setProjectData(project);
          } else if (project.organization_id) {
            // Otherwise fetch the organization details
            safeFetch(`${API_URL}/organizations/${project.organization_id}`).then(orgRes => {
              if (orgRes.success && orgRes.data) {
                setProjectData({
                  ...project,
                  organization: orgRes.data
                });
              } else {
                setProjectData(project);
              }
            });
          } else {
            setProjectData(project);
          }
        }
      });
    });
  }, [projectId]);

  const fallbackSection = React.useMemo(() => {
    if (pathname.startsWith('/dashboard/organizations')) return 'Organizations';
    if (pathname.startsWith('/dashboard/org/')) return 'Projects';
    if (pathname.startsWith('/dashboard/new')) return 'Setup';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    return 'SQAuto';
  }, [pathname]);
  
  const statusColor = activeJob?.status === 'completed' 
    ? 'text-teal-400 bg-teal-400/10' 
    : activeJob?.status === 'failed'
    ? 'text-red-400 bg-red-400/10'
    : activeJob?.status 
    ? 'text-teal-300 animate-pulse'
    : 'text-slate-500';

  const isLandingPage = pathname === '/' || pathname === '/guide';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl h-14">
      <div className="w-full h-full flex items-center justify-between px-6">
        
        {isLandingPage ? (
          <>
            {/* Landing Page Header Layout */}
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <img src="/sqauto.png" alt="SQAuto Logo" className="h-full w-full object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-text-primary font-sans">
                  SQAuto
                </span>
              </Link>
            </div>

            {/* Right Side Navigation */}
            <div className="flex items-center space-x-6">
              <Link href="/guide" className="text-xs font-semibold text-text-secondary hover:text-brand-primary transition-colors">
                Guide
              </Link>
              <Link href="/dashboard/organizations" className="text-xs font-semibold text-text-secondary hover:text-brand-primary transition-colors">
                Organizations
              </Link>
              <Link 
                href="/dashboard/organizations" 
                className="premium-btn-primary !px-5 !py-2 text-xs"
              >
                Launch Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Inside Dashboard Header Layout */}
            <div className="flex items-center flex-1 min-w-0">
              {/* Logo icon */}
              <div className="flex items-center pr-4 border-r border-brand-border mr-4">
                <Link href="/" className="group">
                  <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <img src="/sqauto.png" alt="SQAuto Logo" className="h-full w-full object-contain" />
                  </div>
                </Link>
              </div>

              {/* Breadcrumbs Section */}
              <div className="flex-1 flex items-center space-x-2 overflow-hidden">
                <div className="flex items-center text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] whitespace-nowrap">
                  <span className="opacity-30">/</span>
                  <span className="mx-2 hover:text-text-primary cursor-default transition-colors">
                    {projectData?.organization?.name || fallbackSection}
                  </span>
                  {projectId && (
                    <>
                      <span className="opacity-30">/</span>
                      <span className="mx-2 text-brand-primary truncate max-w-[200px]">
                        {projectData?.name || projectId}
                      </span>
                    </>
                  )}
                </div>
                
                {activeJob && (
                  <div className="hidden md:flex items-center space-x-2 px-2 py-0.5 bg-brand-primary-light rounded-full border border-brand-primary-border ml-4">
                    <div className="h-1 w-1 rounded-full bg-brand-primary animate-ping"></div>
                    <span className="text-[9px] text-brand-primary font-mono uppercase tracking-tighter">
                      {activeJob.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* AI Assistant Logo (Triangle) */}
              <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors group relative" title="AI Assistant">
                <Triangle className="h-4.5 w-4.5 text-brand-primary fill-brand-primary-light group-hover:fill-brand-primary/20 transition-all rotate-180" />
                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-brand-primary rounded-full border border-brand-bg" />
              </button>

              {/* Profile Logo (Circle) */}
              <button className="h-7 w-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center hover:border-brand-primary transition-all">
                <User className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
          </>
        )}

      </div>
    </header>
  );
}

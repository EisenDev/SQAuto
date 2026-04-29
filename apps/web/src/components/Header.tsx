"use client";

import React from 'react';
import { useJob } from '@/components/JobProvider';
import { Database, Triangle, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function Header() {
  const { activeJob } = useJob();
  const params = useParams();
  const projectId = params?.projectId as string;
  const [projectData, setProjectData] = React.useState<{ name: string, organization?: { name: string } } | null>(null);
  
  React.useEffect(() => {
    if (!projectId) return;
    
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
  
  const statusColor = activeJob?.status === 'completed' 
    ? 'text-teal-400 bg-teal-400/10' 
    : activeJob?.status === 'failed'
    ? 'text-red-400 bg-red-400/10'
    : activeJob?.status 
    ? 'text-teal-300 animate-pulse'
    : 'text-slate-500';

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl h-12">
      <div className="w-full h-full flex items-center">
        {/* Logo Section - Aligned with Restored Sidebar Icons (12px left padding + 20px centered icon) */}
        <div className="w-20 flex-shrink-0 flex items-center h-full border-r border-slate-800/40 px-3">
          <div className="w-5 flex items-center justify-center">
            <Link href="/" className="group">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200">
                <Database className="h-4.5 w-4.5 text-slate-950" />
              </div>
            </Link>
          </div>
        </div>

        {/* Breadcrumbs Section */}
        <div className="flex-1 flex items-center px-4 space-x-2 overflow-hidden">
          <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
            <span className="opacity-30">/</span>
            <span className="mx-2 hover:text-slate-300 cursor-default transition-colors">
              {projectData?.organization?.name || "Loading..."}
            </span>
            {projectId && (
              <>
                <span className="opacity-30">/</span>
                <span className="mx-2 text-teal-500/80 truncate max-w-[200px]">
                  {projectData?.name || projectId}
                </span>
              </>
            )}
          </div>
          
          {activeJob && (
            <div className="hidden md:flex items-center space-x-2 px-2 py-0.5 bg-slate-900/80 rounded-full border border-slate-800 ml-4">
              <div className="h-1 w-1 rounded-full bg-teal-500 animate-ping"></div>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-tighter">
                {activeJob.status}
              </span>
            </div>
          )}
        </div>
        
        {/* Right Side Actions */}
        <div className="flex items-center px-4 space-x-4">
          {/* AI Assistant Logo (Triangle) */}
          <button className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors group relative" title="AI Assistant">
            <Triangle className="h-4.5 w-4.5 text-teal-400 fill-teal-400/10 group-hover:fill-teal-400/30 transition-all rotate-180" />
            <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-teal-500 rounded-full border border-slate-950" />
          </button>

          {/* Profile Logo (Circle) */}
          <button className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:border-teal-500/50 transition-all">
            <User className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}


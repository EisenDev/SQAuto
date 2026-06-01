"use client";
import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Database, Layout, Settings, FileSearch, 
  Map, Activity, Share2, Upload, AlertCircle, CheckCircle2,
  Lock, ChevronRight, ClipboardList, GitCompare
} from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useJob } from '@/components/JobProvider';
import { safeFetch } from '@/lib/api_client';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  id: string;
  active: boolean;
  disabled?: boolean;
  onClick: (id: string) => void;
  unlockRequirement?: string;
}

const SidebarItem = ({ icon: Icon, label, id, active, disabled, onClick, unlockRequirement }: SidebarItemProps) => (
  <div 
    className={`group flex items-center pl-[18px] py-2.5 text-sm font-medium rounded-md cursor-pointer transition-all ${
      active 
        ? 'bg-teal-900/40 text-teal-300 border-l-2 border-teal-500' 
        : disabled 
          ? 'text-slate-600 cursor-not-allowed' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`}
    onClick={() => !disabled && onClick(id)}
    title={disabled ? `Requires ${unlockRequirement}` : ''}
  >
    {/* Precisely centered icon in the narrow w-14 drawer (center at 28px) */}
    <div className="w-5 flex-shrink-0 flex items-center justify-center mr-3">
      <Icon className={`h-5 w-5 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
    </div>
    <span className={`flex-1 truncate transition-opacity duration-200 ${label ? 'opacity-100' : 'opacity-0 w-0'}`}>
      {label}
    </span>
  </div>
);

const SectionLabel = ({ label }: { label: string }) => (
  <h3 className="pl-[18px] mt-6 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.1em]">
    {label}
  </h3>
);


export const ProjectSidebar = () => {
  const { activeJob } = useJob();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params?.projectId;
  const [isHovered, setIsHovered] = useState(false);
  const [projectType, setProjectType] = useState<string>('individual');

  // If we are NOT in a project context, some items should be disabled or hidden
  const hasProject = !!projectId;

  const extractionCompleted = activeJob?.status === 'completed';

  useEffect(() => {
    const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
    if (!normalizedProjectId) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    safeFetch(`${API_URL}/projects/${normalizedProjectId}`).then((res) => {
      if (res.success && res.data?.project_type) {
        setProjectType(res.data.project_type);
      }
    });
  }, [projectId]);

  const isComparisonProject = projectType === 'comparison';

  const getActiveTab = () => {
    const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
    if (pathname === `/dashboard/project/${normalizedProjectId}`) return 'overview';
    if (pathname.includes('/comparison/mismatches')) return 'comparison-mismatches';
    if (pathname.includes('/comparison')) return 'comparison';
    if (pathname.endsWith('/sql')) return 'upload';
    if (pathname.includes('/diagnostics')) return 'diagnostics';
    if (pathname.includes('/explorer')) return 'explorer';
    if (pathname.includes('/visualizer')) return 'visualizer';
    if (pathname.includes('/quality')) return 'quality';
    if (pathname.includes('/mapping')) return 'mapping';
    if (pathname.includes('/export')) return 'export';
    if (pathname.includes('/destination')) return 'destination';
    if (pathname.includes('/simulation')) return 'simulation';
    if (pathname.includes('/settings')) return 'settings';
    return 'overview';
  };

  const handleNav = (tabId: string) => {
    if (!hasProject) return; // Guard
    
    const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
    const routeMap: Record<string, string> = {
      overview: `/dashboard/project/${normalizedProjectId}`,
      upload: `/dashboard/project/${normalizedProjectId}/sql`,
      comparison: `/dashboard/project/${normalizedProjectId}/comparison`,
      'comparison-mismatches': `/dashboard/project/${normalizedProjectId}/comparison/mismatches`,
      diagnostics: `/dashboard/project/${normalizedProjectId}/diagnostics`,
      explorer: `/dashboard/project/${normalizedProjectId}/explorer`,
      visualizer: `/dashboard/project/${normalizedProjectId}/visualizer`,
      quality: `/dashboard/project/${normalizedProjectId}/quality`,
      mapping: `/dashboard/project/${normalizedProjectId}/mapping`,
      export: `/dashboard/project/${normalizedProjectId}/export`,
      destination: `/dashboard/project/${normalizedProjectId}/destination`,
      simulation: `/dashboard/project/${normalizedProjectId}/simulation`,
      settings: `/dashboard/project/${normalizedProjectId}/settings`,
    };

    router.push(routeMap[tabId] || routeMap.overview);
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-12 bottom-0 left-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-50 overflow-x-hidden ${
        isHovered ? 'w-64 shadow-2xl shadow-black/80' : 'w-14'
      }`}
    >
      <nav className="flex-1 px-0 py-4 space-y-1 overflow-x-hidden custom-scrollbar">
        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="Project" />
        </div>
        <SidebarItem 
          icon={Activity} 
          label={isHovered ? "Overview" : ""} 
          id="overview" 
          active={getActiveTab() === 'overview'} 
          disabled={!hasProject}
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Upload} 
          label={isHovered ? "SQL Upload" : ""} 
          id="upload" 
          active={getActiveTab() === 'upload'} 
          disabled={!hasProject || isComparisonProject}
          unlockRequirement={isComparisonProject ? "individual project" : undefined}
          onClick={handleNav} 
        />

        {isComparisonProject ? (
          <>
            <SidebarItem
              icon={GitCompare}
              label={isHovered ? "Compare Dumps" : ""}
              id="comparison"
              active={getActiveTab() === 'comparison'}
              disabled={!hasProject}
              onClick={handleNav}
            />
            <SidebarItem
              icon={AlertCircle}
              label={isHovered ? "Mismatches" : ""}
              id="comparison-mismatches"
              active={getActiveTab() === 'comparison-mismatches'}
              disabled={!hasProject}
              onClick={handleNav}
            />
          </>
        ) : null}

        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="Analysis" />
        </div>
        <SidebarItem 
          icon={BarChart2} 
          label={isHovered ? "Extraction Diagnostics" : ""} 
          id="diagnostics" 
          active={getActiveTab() === 'diagnostics'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={FileSearch} 
          label={isHovered ? "Truth Explorer" : ""} 
          id="explorer" 
          active={getActiveTab() === 'explorer'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Layout} 
          label={isHovered ? "Schema Visualizer" : ""} 
          id="visualizer" 
          active={getActiveTab() === 'visualizer'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={AlertCircle} 
          label={isHovered ? "Data Quality" : ""} 
          id="quality" 
          active={getActiveTab() === 'quality'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />

        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="Migration Builder" />
        </div>
        <SidebarItem 
          icon={Map} 
          label={isHovered ? "Schema Mapping" : ""} 
          id="mapping" 
          active={getActiveTab() === 'mapping'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Share2} 
          label={isHovered ? "Export SQL" : ""} 
          id="export" 
          active={getActiveTab() === 'export'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />

        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="Live Database Tools" />
        </div>
        <SidebarItem 
          icon={Layout} 
          label={isHovered ? "Live Destination" : ""} 
          id="destination" 
          active={getActiveTab() === 'destination'} 
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={ClipboardList} 
          label={isHovered ? "Simulation" : ""} 
          id="simulation" 
          active={getActiveTab() === 'simulation'} 
          onClick={handleNav} 
        />

        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="System" />
        </div>
        <SidebarItem 
          icon={Settings} 
          label={isHovered ? "Settings" : ""} 
          id="settings" 
          active={getActiveTab() === 'settings'} 
          onClick={handleNav} 
        />
      </nav>
    </div>
  );
};

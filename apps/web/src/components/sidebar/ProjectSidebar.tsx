import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Databases, Layout, Settings, FileSearch, 
  Map, Activity, Share2, Upload, AlertCircle, CheckCircle2,
  Lock, ChevronRight, ClipboardList
} from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';

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
    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all ${
      active 
        ? 'bg-teal-900/40 text-teal-300 border-l-2 border-teal-500' 
        : disabled 
          ? 'text-slate-600 cursor-not-allowed' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`}
    onClick={() => !disabled && onClick(id)}
    title={disabled ? `Requires ${unlockRequirement}` : ''}
  >
    <Icon className={`mr-3 h-5 w-5 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
    <span className="flex-1">{label}</span>
    {disabled && <Lock className="h-3 w-3 text-slate-700" />}
  </div>
);

const SectionLabel = ({ label }: { label: string }) => (
  <h3 className="px-3 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
    {label}
  </h3>
);

export const ProjectSidebar = ({ extractionCompleted = false }) => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params?.projectId;

  const getActiveTab = () => {
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'overview';
  };

  const handleNav = (tabId: string) => {
    router.push(`/workspace/${projectId}/${tabId}`);
  };

  return (
    <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen overflow-y-auto">
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Databases className="h-6 w-6 text-teal-500" />
          <span className="text-xl font-bold text-white tracking-tight">SQ<span className="text-teal-500">Auto</span></span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        <SectionLabel label="Project" />
        <SidebarItem 
          icon={Activity} 
          label="Overview" 
          id="overview" 
          active={getActiveTab() === 'overview'} 
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Upload} 
          label="SQL Upload" 
          id="upload" 
          active={getActiveTab() === 'upload'} 
          onClick={handleNav} 
        />

        <SectionLabel label="Analysis" />
        <SidebarItem 
          icon={BarChart2} 
          label="Extraction Diagnostics" 
          id="diagnostics" 
          active={getActiveTab() === 'diagnostics'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={FileSearch} 
          label="Truth Explorer" 
          id="explorer" 
          active={getActiveTab() === 'explorer'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Layout} 
          label="Schema Visualizer" 
          id="visualizer" 
          active={getActiveTab() === 'visualizer'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={AlertCircle} 
          label="Data Quality" 
          id="quality" 
          active={getActiveTab() === 'quality'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />

        <SectionLabel label="Migration Builder" />
        <SidebarItem 
          icon={Map} 
          label="Schema Mapping" 
          id="mapping" 
          active={getActiveTab() === 'mapping'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Share2} 
          label="Export SQL" 
          id="export" 
          active={getActiveTab() === 'export'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />

        <SectionLabel label="Live Database Tools" />
        <SidebarItem 
          icon={Layout} 
          label="Live Destination" 
          id="destination" 
          active={getActiveTab() === 'destination'} 
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={ClipboardList} 
          label="Simulation" 
          id="simulation" 
          active={getActiveTab() === 'simulation'} 
          onClick={handleNav} 
        />

        <SectionLabel label="System" />
        <SidebarItem 
          icon={Settings} 
          label="Settings" 
          id="settings" 
          active={getActiveTab() === 'settings'} 
          onClick={handleNav} 
        />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 px-2 py-3 bg-slate-800/50 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold text-teal-950">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-white truncate">Industrial User</p>
            <p className="text-[10px] text-slate-500 truncate">PRO Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Database, Layout, Settings, FileSearch, 
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
    className={`group flex items-center h-10 px-2 rounded-lg cursor-pointer transition-all duration-200 ${
      active 
        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
        : disabled 
          ? 'text-slate-700 cursor-not-allowed opacity-50' 
          : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
    }`}
    onClick={() => !disabled && onClick(id)}
    title={disabled ? `Requires ${unlockRequirement}` : ''}
  >
    {/* Fixed-width icon container to prevent rearrangement */}
    <div className="w-12 flex items-center justify-center flex-shrink-0">
      <Icon className={`h-5 w-5 transition-colors ${active ? 'text-teal-400' : 'group-hover:text-slate-300'}`} />
    </div>
    
    {/* Label with absolute-like feel within the flex row */}
    <span className={`flex-1 text-xs font-semibold tracking-wide transition-opacity duration-300 whitespace-nowrap overflow-hidden ${label ? 'opacity-100 ml-1' : 'opacity-0 w-0'}`}>
      {label}
    </span>
    
    {disabled && (
      <div className="w-8 flex justify-center">
        <Lock className="h-3 w-3 text-slate-800" />
      </div>
    )}
  </div>
);

const SectionLabel = ({ label, isHovered }: { label: string, isHovered: boolean }) => (
  <h3 className={`px-4 mt-6 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
    {label}
  </h3>
);

export const ProjectSidebar = ({ extractionCompleted = false }) => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params?.projectId;
  const [isHovered, setIsHovered] = useState(false);

  const getActiveTab = () => {
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'overview';
  };

  const handleNav = (tabId: string) => {
    router.push(`/workspace/${projectId}/${tabId}`);
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute inset-y-0 left-0 flex flex-col bg-slate-950 border-r border-slate-900 transition-all duration-300 ease-in-out z-20 overflow-x-hidden ${
        isHovered ? 'w-64 shadow-2xl shadow-black/80' : 'w-20'
      }`}
    >
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-x-hidden custom-scrollbar">
        <SectionLabel label="Project" isHovered={isHovered} />
        <SidebarItem 
          icon={Activity} 
          label={isHovered ? "Overview" : ""} 
          id="overview" 
          active={getActiveTab() === 'overview'} 
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Upload} 
          label={isHovered ? "SQL Upload" : ""} 
          id="upload" 
          active={getActiveTab() === 'upload'} 
          onClick={handleNav} 
        />

        <SectionLabel label="Analysis" isHovered={isHovered} />
        <SidebarItem 
          icon={BarChart2} 
          label={isHovered ? "Extraction" : ""} 
          id="diagnostics" 
          active={getActiveTab() === 'diagnostics'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={FileSearch} 
          label={isHovered ? "Explorer" : ""} 
          id="explorer" 
          active={getActiveTab() === 'explorer'} 
          disabled={!extractionCompleted}
          unlockRequirement="Extraction"
          onClick={handleNav} 
        />
        <SidebarItem 
          icon={Layout} 
          label={isHovered ? "Visualizer" : ""} 
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

        <SectionLabel label="Build" isHovered={isHovered} />
        <SidebarItem 
          icon={Map} 
          label={isHovered ? "Mapping" : ""} 
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

        <SectionLabel label="System" isHovered={isHovered} />
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

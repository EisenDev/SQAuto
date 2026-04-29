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
      className={`absolute inset-y-0 left-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out z-20 overflow-x-hidden ${
        isHovered ? 'w-64 shadow-2xl shadow-black/80' : 'w-20'
      }`}
    >
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-x-hidden custom-scrollbar">
        <div className={`transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
          <SectionLabel label="Project" />
        </div>
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

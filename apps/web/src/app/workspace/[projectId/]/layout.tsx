'use client';

import React from 'react';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';
import { 
  Bell, HelpCircle, User, ChevronRight, 
  Search, ShieldCheck, Database
} from 'lucide-react';
import { useParams } from 'next/navigation';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams();
  const projectId = params?.projectId;

  // In a real app, we'd fetch project/job status via SWR/Query
  const [extractionCompleted, setExtractionCompleted] = React.useState(true); 

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-200">
      {/* Sidebar */}
      <ProjectSidebar extractionCompleted={extractionCompleted} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">Default Org</span>
            <ChevronRight className="h-3 w-3 text-slate-700" />
            <span className="text-white font-medium">Legacy Workspace</span>
            <div className="flex items-center ml-4 px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded text-[10px] font-bold text-teal-400">
              <Database className="h-2.5 w-2.5 mr-1" />
              JOB: f4934dc4...
            </div>
            <div className="flex items-center px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-400">
              READY
            </div>
          </div>

          <div className="flex items-center space-x-5">
            <div className="relative group">
              <Search className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" />
            </div>
            <HelpCircle className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" />
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-teal-500 rounded-full border border-slate-900"></span>
            </div>
            <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:border-teal-500/50 transition-all cursor-pointer">
              <User className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-6 md:p-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
}

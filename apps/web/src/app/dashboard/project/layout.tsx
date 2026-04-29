'use client';

import React from 'react';
import Header from '@/components/Header';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex bg-slate-950 h-[calc(100vh-48px)] overflow-hidden relative">
      {/* Sidebar Container (Maintains 80px space) */}
      <div className="w-20 flex-shrink-0 relative z-30 h-full border-r border-slate-800/40">
        <ProjectSidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar relative h-full">
        {children}
      </main>
    </div>
  );
}

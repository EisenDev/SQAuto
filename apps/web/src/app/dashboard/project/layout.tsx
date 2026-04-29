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
    <div className="flex-1 flex bg-slate-950 overflow-hidden relative">
      {/* Sidebar Container (Maintains 80px space) */}
      <div className="w-20 flex-shrink-0 relative z-30">
        <ProjectSidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar relative">
        {children}
      </main>
    </div>
  );
}

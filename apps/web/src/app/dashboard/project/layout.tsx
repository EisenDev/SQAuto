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
    <div className="flex-1 flex bg-slate-950 relative min-h-screen">
      {/* Sidebar Spacer (Maintains space for fixed sidebar) */}
      <div className="w-14 flex-shrink-0 border-r border-slate-800/40" />
      <ProjectSidebar />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative">
        {children}
      </main>
    </div>
  );
}

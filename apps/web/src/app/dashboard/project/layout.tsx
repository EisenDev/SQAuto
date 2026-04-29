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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Shared Sidebar */}
      <ProjectSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Shared Header */}
        <Header />
        
        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";
import React from 'react';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex bg-slate-950 relative min-h-screen">
      {/* Sidebar Spacer (Maintains space for fixed sidebar drawer) */}
      <div className="w-14 flex-shrink-0 border-r border-slate-800/40" />
      
      {/* Fixed Side Navigation */}
      <ProjectSidebar />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative">
        {children}
      </main>
    </div>
  );
}

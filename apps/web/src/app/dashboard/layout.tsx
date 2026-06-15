"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showProjectSidebar = pathname.startsWith('/dashboard/project/');

  return (
    <div className="flex-1 flex bg-brand-bg relative min-h-0 text-text-primary">
      {showProjectSidebar ? (
        <>
          {/* Sidebar Spacer (Maintains space for fixed sidebar drawer) */}
          <div className="w-14 flex-shrink-0 border-r border-brand-border" />
 
           {/* Fixed Side Navigation */}
           <ProjectSidebar />
         </>
       ) : null}
 
       {/* Main Content Area */}
       <main className="flex-1 min-w-0 relative min-h-0 overflow-x-hidden bg-brand-bg">
         {children}
       </main>
     </div>
   );
 }

"use client";

import React from 'react';
import { useJob } from '@/components/JobProvider';
import { Database, User, ChevronRight, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { activeJob } = useJob();
  const params = useParams();
  const pathname = usePathname();
  
  const projectId = params?.projectId as string;
  const [projectData, setProjectData] = React.useState<{ name: string, organization?: { name: string } } | null>(null);
  
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const username = (session?.user as any)?.username || session?.user?.name || "User";
  
  React.useEffect(() => {
    if (!projectId) {
      setProjectData(null);
      return;
    }
    
    import('@/lib/api_client').then(({ safeFetch }) => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
      
      // First fetch project to get organization_id
      safeFetch(`${API_URL}/projects/${projectId}`).then(res => {
        if (res.success && res.data) {
          const project = res.data;
          
          // If organization data is already there, use it
          if (project.organization) {
            setProjectData(project);
          } else if (project.organization_id) {
            // Otherwise fetch the organization details
            safeFetch(`${API_URL}/organizations/${project.organization_id}`).then(orgRes => {
              if (orgRes.success && orgRes.data) {
                setProjectData({
                  ...project,
                  organization: orgRes.data
                });
              } else {
                setProjectData(project);
              }
            });
          } else {
            setProjectData(project);
          }
        }
      });
    });
  }, [projectId]);

  const fallbackSection = React.useMemo(() => {
    if (pathname.startsWith('/dashboard/organizations')) return 'Organizations';
    if (pathname.startsWith('/dashboard/org/')) return 'Projects';
    if (pathname.startsWith('/dashboard/new')) return 'Setup';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    return 'SQAuto';
  }, [pathname]);
  
  const statusColor = activeJob?.status === 'completed' 
    ? 'text-teal-400 bg-teal-400/10' 
    : activeJob?.status === 'failed'
    ? 'text-red-400 bg-red-400/10'
    : activeJob?.status 
    ? 'text-teal-300 animate-pulse'
    : 'text-slate-500';

  const isLandingPage = pathname === '/' || pathname === '/guide';

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl h-14">
      <div className="w-full h-full flex items-center justify-between px-6">
        
        {isLandingPage ? (
          <>
            {/* Landing Page Header Layout */}
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                  <img src="/sqauto.png" alt="SQAuto Logo" className="h-full w-full object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-text-primary font-sans">
                  SQAuto
                </span>
              </Link>
            </div>

            {/* Right Side Navigation */}
            <div className="flex items-center space-x-6">
              <Link href="/guide" className="text-xs font-semibold text-text-secondary hover:text-brand-primary transition-colors">
                Guide
              </Link>
              <Link href="/dashboard/organizations" className="text-xs font-semibold text-text-secondary hover:text-brand-primary transition-colors">
                Dashboard
              </Link>
              <Link 
                href="/login" 
                className="premium-btn-primary !px-5 !py-2 text-xs"
              >
                Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Inside Dashboard Header Layout */}
            <div className="flex items-center flex-1 min-w-0">
              {/* Logo icon */}
              <div className="flex items-center pr-4 border-r border-brand-border mr-4">
                <Link href="/" className="group">
                  <div className="w-8 h-8 overflow-hidden rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <img src="/sqauto.png" alt="SQAuto Logo" className="h-full w-full object-contain" />
                  </div>
                </Link>
              </div>

              {/* Breadcrumbs Section */}
              <div className="flex-1 flex items-center space-x-2 overflow-hidden">
                <div className="flex items-center text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] whitespace-nowrap">
                  <span className="opacity-30">/</span>
                  <span className="mx-2 hover:text-text-primary cursor-default transition-colors">
                    {projectData?.organization?.name || fallbackSection}
                  </span>
                  {projectId && (
                    <>
                      <span className="opacity-30">/</span>
                      <span className="mx-2 text-brand-primary truncate max-w-[200px]">
                        {projectData?.name || projectId}
                      </span>
                    </>
                  )}
                </div>
                
                {activeJob && (
                  <div className="hidden md:flex items-center space-x-2 px-2 py-0.5 bg-brand-primary-light rounded-full border border-brand-primary-border ml-4">
                    <div className="h-1 w-1 rounded-full bg-brand-primary animate-ping"></div>
                    <span className="text-[9px] text-brand-primary font-mono uppercase tracking-tighter">
                      {activeJob.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Profile Dropdown Container */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-7 w-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center hover:border-brand-primary transition-all focus:outline-none"
                  title="Profile settings"
                >
                  <User className="h-4 w-4 text-text-secondary" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-brand-border/60 rounded-xl shadow-premium z-50 py-1.5 text-xs text-text-primary animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 flex flex-col">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Signed in as</span>
                      <span className="font-bold text-text-primary mt-0.5 truncate max-w-full" title={username}>
                        {username}
                      </span>
                    </div>
                    
                    <div className="border-t border-brand-border/60 my-1"></div>
                    
                    <Link 
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 hover:bg-stone-50 text-text-secondary hover:text-text-primary transition-colors font-medium"
                    >
                      Account settings
                    </Link>
                    
                    <div className="border-t border-brand-border/60 my-1"></div>
                    
                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-red-50/50 text-[#A32D2D] hover:text-[#822323] transition-colors font-semibold text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </header>
  );
}

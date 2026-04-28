'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  ArrowUpRight, 
  LayoutDashboard, 
  Database, 
  History,
  Workflow
} from 'lucide-react';

export default function WorkspaceOverview() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId;

  return (
    <div className="flex-1 p-8 space-y-10 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative group overflow-hidden p-8 rounded-[2rem] glass-panel border-teal-500/10 shadow-2xl shadow-teal-500/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-widest">
            Workspace Active
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Project Overview</h1>
          <p className="text-slate-400 max-w-xl text-lg leading-relaxed">
            Welcome to your migration command center. Upload your SQL dump to begin the mapping process.
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard 
          icon={Plus} 
          title="New Migration" 
          desc="Upload a new SQL dump and start schema extraction." 
          onClick={() => router.push(`/workspace/${projectId}/upload`)}
          primary
        />
        <ActionCard 
          icon={Database} 
          title="Schema Explorer" 
          desc="Inspect extracted tables, relationships and constraints." 
          onClick={() => router.push(`/workspace/${projectId}/explorer`)}
        />
        <ActionCard 
          icon={Workflow} 
          title="Migration Logic" 
          desc="Configure mapping rules and data transformation steps." 
          onClick={() => router.push(`/workspace/${projectId}/mapping`)}
        />
      </div>

      {/* Stats/Status Section placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 opacity-60">
        {[
          { label: 'Total Tables', value: '0', icon: Database },
          { label: 'Mapping Progress', value: '0%', icon: Workflow },
          { label: 'Extraction Jobs', value: '0', icon: History },
          { label: 'Critical Errors', value: '0', icon: LayoutDashboard },
        ].map((stat, i) => ( stat &&
          <div key={i} className="p-6 rounded-2xl glass-panel space-y-2 border-slate-800/30">
            <stat.icon className="h-4 w-4 text-slate-500" />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, onClick, primary = false }: { icon: any, title: string, desc: string, onClick: () => void, primary?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`group text-left p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        primary 
        ? 'bg-teal-500 hover:bg-teal-400 border-teal-400 shadow-lg shadow-teal-500/20' 
        : 'glass-panel border-slate-800 hover:border-teal-500/40 hover:bg-slate-900'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-lg ${
        primary ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-teal-500 group-hover:bg-teal-500 group-hover:text-slate-950'
      } transition-colors`}>
        <Icon className="h-6 w-6" />
      </div>

      <div className="flex items-center justify-between space-x-2">
        <h3 className={`text-xl font-bold ${primary ? 'text-slate-950' : 'text-white'}`}>{title}</h3>
        <ArrowUpRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-all ${primary ? 'text-slate-900' : 'text-teal-500'}`} />
      </div>
      
      <p className={`mt-2 text-sm leading-relaxed ${primary ? 'text-slate-900/70' : 'text-slate-500'}`}>{desc}</p>
    </button>
  );
}

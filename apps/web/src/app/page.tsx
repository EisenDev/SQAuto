'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Shield, Zap, Layout } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-teal-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-600/5 blur-[80px] rounded-full -z-10 pointer-events-none" />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-32 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-teal-400">Production Ready v1.0</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl leading-[1.1]">
          Industrial-Grade <span className="text-teal-500">Data Migration</span> for Modern Devs
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
          Map, extract, and transform massive SQL dumps with pixel-perfect structural integrity. 
          The database architect's secret weapon for legacy transformations.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link 
            href="/dashboard/organizations"
            className="group relative px-8 py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all duration-200 flex items-center shadow-xl shadow-teal-500/20 active:scale-95 text-sm"
          >
            Start your project
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="flex items-center space-x-3">
            {activeJob && (
              <div className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${statusColor} transition-all`}>
                {activeJob.status.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Feature Grid Mockup */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full opacity-80">
          <FeatureCard 
            icon={Zap} 
            title="Instant Extraction" 
            desc="Blazing fast schema analysis of gigabyte-scale SQL dumps with native PSQL workers." 
          />
          <FeatureCard 
            icon={Shield} 
            title="Zero Data Loss" 
            desc="Ensuring every constraint, index, and relationship is maintained during the mapping process." 
          />
          <FeatureCard 
            icon={Layout} 
            title="Visual Schema Dev" 
            desc="Drag-and-drop mapping interface designed for complex industrial database entities." 
          />
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-8 border-t border-slate-900/50 flex flex-col items-center space-y-2">
        <div className="flex items-center space-x-2 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
          <Database className="h-4 w-4 text-teal-500" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">SQAUTO SYSTEMS ENGINE</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-left hover:border-teal-500/30 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-teal-500 transition-colors">
        <Icon className="h-6 w-6 text-teal-500 group-hover:text-slate-950" />
      </div>
      <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

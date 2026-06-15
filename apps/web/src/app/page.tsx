'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, Database, Shield, Zap, CheckCircle2, 
  Layers, RefreshCw, FileText, AlertTriangle, ArrowRightLeft,
  ChevronRight, Lock, Check, Search, Code
} from 'lucide-react';
import { useJob } from '@/components/JobProvider';

export default function Home() {
  const { activeJob } = useJob();
  const [activeStep, setActiveStep] = useState(0);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Explicitly trigger autoplay to ensure the decorative video plays in all browsers
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Autoplay prevented:", err);
      });
    }
  }, []);

  // Auto rotate the interactive walkthrough steps every 5 seconds unless hovered/clicked
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const steps = [
    {
      id: 0,
      phase: "01. DIAGNOSE & EXTRACT",
      label: "Schema & Data Diagnostics",
      description: "Instantly analyze gigabyte-scale SQL dumps. Inspect table counts, row estimates, character encodings, and foreign key definitions.",
      mockTitle: "Extraction Results summary_dump.sql",
      mockBadge: "COMPLETED",
      mockBadgeColor: "premium-badge-success"
    },
    {
      id: 1,
      phase: "02. RECONCILE",
      label: "Entity Schema Reconciliation",
      description: "Map source fields to target schemas with absolute precision. Compares primary keys, null risk constraints, and handles type matching.",
      mockTitle: "Schema Mapping Panel",
      mockBadge: "MAPPING IN PROGRESS",
      mockBadgeColor: "premium-badge-warning"
    },
    {
      id: 2,
      phase: "03. CLEANSE & REPAIR",
      label: "Safe Preview-First Cleanse",
      description: "Detect orphan records, duplicate keys, and schema violations. Choose deterministic repair patterns or flag items for human review.",
      mockTitle: "Exception Resolution Queue",
      mockBadge: "REQUIRES REVIEW",
      mockBadgeColor: "premium-badge-error"
    },
    {
      id: 3,
      phase: "04. TRANSLATE & EXPORT",
      label: "SQL Dialect Export Pipeline",
      description: "Generate clean, ready-to-run DDL and DML scripts translated between PostgreSQL, MySQL, and SQLite with explicit validation check gates.",
      mockTitle: "Export Pipeline Generator",
      mockBadge: "READY TO EXPORT",
      mockBadgeColor: "premium-badge-brand"
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-brand-bg relative overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="flex flex-col items-start justify-center px-6 pt-36 pb-36 max-w-7xl mx-auto text-left relative z-10 w-full">
        {/* Decorative Ghost Background Accent */}
        <div 
          className="absolute right-6 md:right-12 top-24 w-64 h-64 md:w-[380px] md:h-[380px] pointer-events-none select-none z-0"
          style={{
            mixBlendMode: 'multiply',
            opacity: 0.25
          }}
          aria-hidden="true"
        >
          <video 
            ref={videoRef}
            src="/sqauto-motiongraphics.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Production Ready v1.0 Pill */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-brand-primaryLight border border-brand-primaryBorder mb-8 shadow-sm relative z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-brand-primary">SQAuto Platform Ready</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary mb-8 max-w-5xl leading-[1.15] font-sans relative z-10">
          Deploy trusted schema <span className="text-brand-primary font-medium italic">migrations</span> to Production
        </h1>
        
        {/* Hero Subtitle */}
        <p className="text-base md:text-lg text-text-secondary mb-12 max-w-3xl leading-relaxed relative z-10">
          A calm, source-of-truth workspace built for developers, database administrators, and data engineers. 
          Analyze complex schema structures, resolve integrity anomalies, and export clean database scripts in one place.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-20 w-full sm:w-auto relative z-10">
          <Link 
            href="/dashboard/organizations"
            className="premium-btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Explore migrations
            <ArrowRight className="h-4 w-4" />
          </Link>
          
          <Link 
            href="/dashboard/organizations"
            className="premium-btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Launch a sandbox
          </Link>
        </div>

        {/* Active Job Alert, if any */}
        {activeJob && (
          <div className="mb-20 inline-flex items-center space-x-3 px-4 py-2 bg-white border border-brand-border rounded-xl shadow-premium relative z-10">
            <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              activeJob.status === 'completed' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : activeJob.status === 'failed'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-teal-50 border-teal-200 text-teal-700 animate-pulse'
            }`}>
              {activeJob.status.toUpperCase()}
            </div>
            <span className="text-xs text-text-secondary">
              Active Job running in sandbox: <span className="font-mono font-bold text-brand-primary">{activeJob.id?.substring(0, 8)}</span>
            </span>
          </div>
        )}

        {/* Core Principles Row (Three Columns) */}
        <div className="border-t border-brand-border pt-12 w-full grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto">
          <div>
            <h4 className="text-[11px] font-bold tracking-widest text-text-primary uppercase mb-2">01 / DETERMINISTIC MAPPING</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Deterministic engines evaluate constraints and relationships first. AI assists solely to suggest field layouts and map names.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold tracking-widest text-text-primary uppercase mb-2">02 / STAGING ISOLATION</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Legacy files are processed inside secure, isolated sandboxes. Production servers are kept strictly read-only to avoid leaks or accidents.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-bold tracking-widest text-text-primary uppercase mb-2">03 / INTEGRITY ASSURED</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every dry-run verifies row counts, NULL percentages, and foreign key matches. No migration completes without validation checks.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1: "Designed around trust, privacy, and craft" */}
      <section className="py-24 border-t border-brand-border bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Bold Header */}
          <div className="lg:col-span-5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase block mb-4">ENGINEERED FOR SAFETY</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-6 leading-tight">
              Designed around trust, safety, and data integrity.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-8">
              Legacy database dumps are messy, incomplete, and highly inconsistent. SQAuto does not guess. It provides transparent tools to isolate databases, audit integrity issues, and resolve column mismatches safely.
            </p>
          </div>

          {/* Right Column: Numbered List */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex gap-6 pb-6 border-b border-brand-border">
              <span className="text-xs font-mono font-bold text-stone-300">01</span>
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2">Sandbox Isolation Environment</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Staging database isolation guarantees your uploads never leak. Test transformations in real-time without affecting live datasets.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6 pb-6 border-b border-brand-border">
              <span className="text-xs font-mono font-bold text-stone-300">02</span>
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2">Deterministic Key Mapping</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Matches indexes, tables, and columns using relational constraints first. Generates high-confidence mapping recommendations for human review.
                </p>
              </div>
            </div>

            <div className="flex gap-6 pb-6 border-b border-brand-border">
              <span className="text-xs font-mono font-bold text-stone-300">03</span>
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2">Exception Routing Queue</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Low confidence mappings or broken foreign relationships are automatically flagged and routed to the exception queue to prevent silent corruption.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <span className="text-xs font-mono font-bold text-stone-300">04</span>
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2">Reversible Action Logging</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Every edit, schema override, or script generated maintains step history, making dry-runs fully traceable and rolls backs straightforward.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section 2: Interactive Walkthrough */}
      <section className="py-24 border-t border-brand-border bg-brand-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase block mb-3">WORKFLOW PREVIEW</span>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">Experience the calm workflow.</h2>
          </div>

          <div 
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Left Column: Menu Items */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-2">
              {steps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`text-left p-6 rounded-xl transition-all duration-300 border ${
                    activeStep === idx 
                      ? 'bg-white border-brand-border shadow-premium' 
                      : 'border-transparent hover:bg-stone-100/50'
                  }`}
                >
                  <span className={`text-[9px] font-bold tracking-widest block mb-1 ${
                    activeStep === idx ? 'text-brand-primary' : 'text-text-muted'
                  }`}>
                    {step.phase}
                  </span>
                  <h3 className="text-sm font-bold text-text-primary mb-2">{step.label}</h3>
                  {activeStep === idx && (
                    <p className="text-xs text-text-secondary leading-relaxed animate-fade-in">
                      {step.description}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* Right Column: Browser Mockup container */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <div className="w-full bg-white border border-brand-border rounded-2xl shadow-premium overflow-hidden flex flex-col h-[380px]">
                {/* Browser bar */}
                <div className="px-4 py-3 bg-stone-50 border-b border-brand-border flex items-center gap-2 flex-shrink-0">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-200 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-200 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-200 block" />
                  </div>
                  <div className="flex-1 bg-white border border-stone-200 rounded-md py-0.5 px-3 flex items-center text-[10px] text-text-muted max-w-sm mx-auto font-mono">
                    <Lock className="h-3 w-3 mr-1 text-stone-400" />
                    sqauto.io/project/sandbox_4982
                  </div>
                </div>

                {/* Browser Content */}
                <div className="flex-1 p-6 overflow-y-auto bg-stone-50/40 relative flex flex-col">
                  {/* Card Title inside mockup */}
                  <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h4 className="text-xs font-bold text-text-primary tracking-tight font-mono">
                      {steps[activeStep].mockTitle}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      steps[activeStep].id === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      steps[activeStep].id === 1 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      steps[activeStep].id === 2 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      'bg-teal-50 text-brand-primary border border-brand-primaryBorder'
                    }`}>
                      {steps[activeStep].mockBadge}
                    </span>
                  </div>

                  {/* Render steps inside the browser mockup */}
                  {activeStep === 0 && (
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-white border border-brand-border rounded-lg text-center shadow-sm">
                          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Tables</span>
                          <span className="text-lg font-bold text-text-primary">28</span>
                        </div>
                        <div className="p-3 bg-white border border-brand-border rounded-lg text-center shadow-sm">
                          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Total Rows</span>
                          <span className="text-lg font-bold text-text-primary">1.42M</span>
                        </div>
                        <div className="p-3 bg-white border border-brand-border rounded-lg text-center shadow-sm">
                          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Size</span>
                          <span className="text-lg font-bold text-text-primary">412 MB</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-brand-border rounded-lg shadow-sm space-y-2 flex-1">
                        <div className="flex justify-between text-[10px] pb-1.5 border-b border-stone-100">
                          <span className="font-semibold text-text-primary">File name:</span>
                          <span className="font-mono text-text-secondary">v2_ecom_prod.sql</span>
                        </div>
                        <div className="flex justify-between text-[10px] pb-1.5 border-b border-stone-100">
                          <span className="font-semibold text-text-primary">Dialect Detected:</span>
                          <span className="font-mono text-text-secondary">MySQL 5.7 (InnoDB)</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="font-semibold text-text-primary">Constraints found:</span>
                          <span className="font-mono text-emerald-600">32 PKs, 19 FKs</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      <div className="bg-white border border-brand-border rounded-lg p-3 shadow-sm space-y-2 flex-1">
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">Mapped Entities</div>
                        <div className="flex items-center justify-between p-2 bg-stone-50 border border-stone-100 rounded-md">
                          <div className="text-[10px] font-mono">
                            <div className="text-text-secondary">source_db.<span className="font-bold text-text-primary">legacy_customers</span></div>
                            <div className="text-text-muted pl-2 mt-0.5">↳ usr_email (varchar)</div>
                          </div>
                          <ArrowRightLeft className="h-3.5 w-3.5 text-stone-400" />
                          <div className="text-[10px] font-mono text-right">
                            <div className="text-text-secondary">target_db.<span className="font-bold text-text-primary">accounts</span></div>
                            <div className="text-text-muted pr-2 mt-0.5">email (text) ↲</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-brand-primary-light/50 border border-brand-primary-border/60 rounded-md">
                          <div className="text-[10px] font-mono">
                            <div className="text-text-secondary">source_db.<span className="font-bold text-text-primary">orders</span></div>
                            <div className="text-text-muted pl-2 mt-0.5">↳ order_date (datetime)</div>
                          </div>
                          <ArrowRightLeft className="h-3.5 w-3.5 text-brand-primary" />
                          <div className="text-[10px] font-mono text-right">
                            <div className="text-text-secondary">target_db.<span className="font-bold text-text-primary">sales_records</span></div>
                            <div className="text-text-muted pr-2 mt-0.5">created_at (timestamp) ↲</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      <div className="bg-white border border-brand-border rounded-lg p-3 shadow-sm space-y-2 flex-1">
                        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded-md p-2 text-[10px]">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          <span><strong>14 Orphan Records</strong> found in <code>orders.customer_id</code> (non-matching references).</span>
                        </div>
                        <div className="p-2 border border-stone-200 rounded-md bg-stone-50 space-y-2">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Repair Suggestions</span>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-[10px] font-mono text-text-secondary">Deterministic repair: Fallback ID</span>
                            <button className="bg-brand-primary text-white text-[9px] font-bold px-2 py-1 rounded hover:bg-brand-primaryHover">
                              Apply
                            </button>
                          </div>
                          <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-stone-200/60">
                            <span className="text-[10px] font-mono text-text-secondary">Convert column to Nullable</span>
                            <button className="bg-stone-200 text-text-primary text-[9px] font-bold px-2 py-1 rounded hover:bg-stone-300">
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      <div className="bg-white border border-brand-border rounded-lg p-3 shadow-sm space-y-2 flex-1 flex flex-col">
                        <div className="flex justify-between items-center text-[10px] border-b border-stone-100 pb-1.5">
                          <span className="font-semibold text-text-primary">Source: MySQL</span>
                          <span className="text-brand-primary font-bold">→ PostgreSQL</span>
                        </div>
                        <div className="bg-stone-900 rounded-md p-3 font-mono text-[9px] text-stone-200 flex-1 overflow-x-auto whitespace-pre leading-relaxed">
                          {`-- Translated SQL DDL code snippet\nCREATE TABLE accounts (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email TEXT UNIQUE NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);`}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Section 3: "Build a schema mapping that feels as premium as your target." */}
      <section className="py-24 border-t border-brand-border bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Bullet points with icons */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase block mb-3">SCHEMA MAPPING</span>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4 leading-tight">
                Build mapping workflows that feel premium.
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Connect your source and target structures seamlessly. Clean constraints, map types, and trace conversions with strict guardrails.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-brand-primary-light border border-brand-primaryBorder rounded-lg text-brand-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Deterministic Resolution</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Instantly resolve indexes, data type mappings, and tables that require zero guess-work.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-brand-primary-light border border-brand-primaryBorder rounded-lg text-brand-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Smart Dialect Translations</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Translate schemas and copy operations cleanly between MySQL, PostgreSQL, and SQLite with dialect warnings.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-brand-primary-light border border-brand-primaryBorder rounded-lg text-brand-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Zero-Risk Staging sandboxes</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Keep live databases untouched. Build staging layouts in isolated docker sandboxes first.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Milestones Card on dotted grid */}
          <div className="lg:col-span-6 flex items-center justify-center p-8 bg-stone-50 border border-brand-border rounded-2xl relative overflow-hidden h-[340px]">
            {/* Dotted Background Grid */}
            <div className="absolute inset-0 opacity-[0.15]" style={{
              backgroundImage: "radial-gradient(#0f766e 1px, transparent 0)",
              backgroundSize: "24px 24px"
            }} />
            
            {/* Milestone Card */}
            <div className="w-full max-w-sm bg-white border border-brand-border rounded-xl shadow-premium p-6 relative z-10 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Workspace Milestones</span>
                <span className="premium-badge-brand text-[8px] font-bold">ACTIVE SANDBOX</span>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-text-primary">01. SQL Schema Extracted</span>
                    <span className="text-text-muted block text-[10px]">Analyzed 28 tables, v2_ecom.sql</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-text-primary">02. Integrity checked</span>
                    <span className="text-text-muted block text-[10px]">Detected 14 orphan keys, routed to review</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 animate-pulse">
                  <div className="h-5 w-5 rounded-full bg-teal-50 border border-brand-primaryBorder text-brand-primary flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-brand-primary">03. Target Schema Mapping</span>
                    <span className="text-text-muted block text-[10px]">Resolving customer_id to uuid relations</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 opacity-50">
                  <div className="h-5 w-5 rounded-full bg-stone-100 border border-stone-200 text-stone-400 flex items-center justify-center text-[10px] font-bold">
                    4
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-text-primary">04. SQL Scripts Exported</span>
                    <span className="text-text-muted block text-[10px]">Reversible DDL and DML scripts generated</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Section 4: "Discover and migrate with absolute confidence." */}
      <section className="py-24 border-t border-brand-border bg-brand-bg">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Escrow Card on Dotted Grid */}
          <div className="lg:col-span-6 flex items-center justify-center p-8 bg-stone-50 border border-brand-border rounded-2xl relative overflow-hidden h-[340px] order-last lg:order-first">
            {/* Dotted Background Grid */}
            <div className="absolute inset-0 opacity-[0.15]" style={{
              backgroundImage: "radial-gradient(#0f766e 1px, transparent 0)",
              backgroundSize: "24px 24px"
            }} />
            
            {/* Protection Card */}
            <div className="w-full max-w-sm bg-white border border-brand-border rounded-xl shadow-premium p-6 relative z-10 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Migration Integrity Shield</span>
                <span className="premium-badge-success text-[8px] font-bold">SECURED</span>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-lg space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted block">Dry-Run Statistics</span>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Row Count matched:</span>
                  <span className="text-xs font-bold text-emerald-600">100.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Foreign Key integrity:</span>
                  <span className="text-xs font-bold text-emerald-600">100.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary">Nullable Constraints:</span>
                  <span className="text-xs font-bold text-emerald-600">Verified</span>
                </div>
              </div>

              <p className="text-[10px] text-text-muted leading-relaxed">
                SQAuto runs active migrations in a temporary sandbox first. Target database execution is only committed after passing all schema constraints.
              </p>
            </div>
          </div>

          {/* Right Column: Bullet points with icons */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase block mb-3">SAFE RUNS ONLY</span>
              <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-4 leading-tight">
                Discover and map schemas with absolute confidence.
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Never write directly to production databases. We verify entity integrity, rows, and constraints beforehand to ensure zero data loss.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Verified Schema Mappings</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Run ID-level checks and value matches to prove target layouts correctly contain legacy properties.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Traceable Run Summaries</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Generates detailed validation dry-run logs before any commit action. See what rows changed immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Operator Override Gates</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Optionally bypass minor constraint checks with logged operators. Always gives you the final decision.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section (Big dark rounded container) */}
      <section className="py-16 px-6 bg-brand-bg">
        <div className="max-w-6xl mx-auto">
          <div className="bg-brand-darkBg text-text-dark rounded-[32px] px-8 py-16 md:py-24 text-center relative overflow-hidden border border-brand-darkBorder shadow-premiumLg">
            
            {/* Subtle glow background */}
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/25 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <span className="text-[10px] font-bold tracking-[0.2em] text-brand-primary uppercase">GET STARTED</span>
              
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                Give your database migrations the precision they deserve.
              </h2>
              
              <p className="text-sm text-text-darkMuted leading-relaxed max-w-xl mx-auto">
                Join engineers, data architects, and operators on a platform shaped entirely around safety, integrity, and predictable execution.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                <Link 
                  href="/dashboard/organizations"
                  className="premium-btn-light w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                
                <Link 
                  href="/dashboard/organizations"
                  className="premium-btn-dark w-full sm:w-auto flex items-center justify-center gap-2 border border-stone-850 hover:bg-stone-900"
                >
                  Explore sandboxes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-brand-border py-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center space-y-12">
          
          {/* Big SQAuto text */}
          <div className="text-center">
            <span className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-stone-900 select-none block">
              SQAuto
            </span>
          </div>

          <div className="w-full border-t border-stone-100 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-text-muted gap-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-brand-primary" />
              <span className="font-semibold text-text-primary">SQAuto Migration Platform</span>
              <span>@ 2026 Zeraynce. All rights reserved.</span>
            </div>
            
            <div className="flex gap-6">
              <Link href="/dashboard/organizations" className="hover:underline">Dashboard</Link>
              <a href="#" className="hover:underline">Documentation</a>
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Help & Support</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

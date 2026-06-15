'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Database, Shield, Zap, CheckCircle2, 
  Layers, RefreshCw, FileText, ArrowRight,
  Lock, Check, Sparkles, BookOpen, HelpCircle
} from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="flex-1 bg-stone-50/50 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden py-20 border-b border-brand-border bg-white">
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1D9E75_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex items-center space-x-2 text-brand-primary font-bold text-xs uppercase tracking-widest mb-4">
            <BookOpen className="h-4 w-4" />
            <span>Platform Documentation</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-6 leading-tight">
            Understanding the <span className="text-brand-primary font-medium italic">SQAuto</span> Engine
          </h1>
          
          <p className="text-base md:text-lg text-text-secondary max-w-3xl leading-relaxed">
            Welcome to SQAuto. This guide details our safety-first system architectures, legacy profiling tools, schema reconciliation workflows, and dialect translation pipelines.
          </p>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Side: Table of Contents Outline (Sticky) */}
        <aside className="lg:col-span-3 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="border border-brand-border bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-4 pb-2 border-b border-stone-100">
                On This Page
              </h3>
              <nav className="flex flex-col space-y-3 text-xs font-medium text-text-secondary">
                <a href="#about" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  What is SQAuto?
                </a>
                <a href="#hierarchy" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  Product Hierarchy
                </a>
                <a href="#capabilities" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  Core Capabilities
                </a>
                <a href="#workflow" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  Migration User Flow
                </a>
                <a href="#safety" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  Safety & Integrity Rules
                </a>
                <a href="#faq" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  Frequently Asked Questions
                </a>
              </nav>
            </div>

            <div className="bg-brand-primaryLight border border-brand-primaryBorder rounded-2xl p-5 shadow-sm text-center">
              <Sparkles className="h-5 w-5 text-brand-primary mx-auto mb-3" />
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider mb-2">Ready to Map?</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                Launch a sandbox to safely upload and analyze SQL dumps.
              </p>
              <Link 
                href="/dashboard/organizations"
                className="premium-btn-primary !py-2 !px-4 text-xs w-full block text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Side: Document Content */}
        <main className="lg:col-span-9 space-y-16">
          
          {/* Section 1: What is SQAuto */}
          <section id="about" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              What is SQAuto?
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              SQAuto is an embedded, migration-first data intelligence platform. It is engineered specifically to assist database developers, administrators, and architects in profiling, cleansing, repairing, and translating legacy SQL dumps before executing migrations to modern target systems.
            </p>
            
            {/* Visual Callout boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="border border-brand-border bg-white rounded-2xl p-6 shadow-sm hover:border-brand-primary/20 transition-all">
                <Database className="h-6 w-6 text-brand-primary mb-4" />
                <h3 className="text-sm font-bold text-text-primary mb-2">SQL-File First Workflow</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Unlike traditional ETL utilities that force online connections, SQAuto treats the SQL dump as the primary source of truth. We build safe, offline-first target exports so you have full code visibility before any database commits.
                </p>
              </div>
              
              <div className="border border-brand-border bg-white rounded-2xl p-6 shadow-sm hover:border-brand-primary/20 transition-all">
                <Shield className="h-6 w-6 text-brand-primary mb-4" />
                <h3 className="text-sm font-bold text-text-primary mb-2">Staging Sandbox Isolation</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Raw SQL dumps are treated as strict, read-only artifacts. All transformations, smart corrections, and diagnostics run inside isolated project sandboxes, guaranteeing that your production databases remain entirely safe.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Hierarchy */}
          <section id="hierarchy" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              Product Structure Hierarchy
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              The platform mirrors modern cloud setups, organizing resources cleanly to prevent data leakage and provide scope-level isolation:
            </p>
            
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-xl hover:bg-white border border-transparent hover:border-brand-border transition-all">
                <div className="font-bold text-sm text-brand-primary w-8 h-8 rounded-full bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary mb-1">Organization</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    The top-level tenant. Typically maps to a company division, a consulting firm, or a dedicated enterprise unit managing multiple clients.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl hover:bg-white border border-transparent hover:border-brand-border transition-all">
                <div className="font-bold text-sm text-brand-primary w-8 h-8 rounded-full bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary mb-1">Project</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    A specific migration initiative within an organization. For example, migrating "Legacy CRM Dump" to a modern PostgreSQL target.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl hover:bg-white border border-transparent hover:border-brand-border transition-all">
                <div className="font-bold text-sm text-brand-primary w-8 h-8 rounded-full bg-brand-primaryLight border border-brand-primaryBorder flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary mb-1">Project Workspace & Sandbox</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    An active, project-scoped workspace powered by a SQL Dump Restore job. All diagnostic tools, graphs, mappings, and exports operate within this sandbox's boundaries.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Capabilities */}
          <section id="capabilities" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              Core Capabilities & Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <Zap className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Schema Diagnostics</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Fast extraction parses gigabyte-scale legacy files. Profiles table volumes, character encodings, row estimates, and detects primary/foreign key definitions.
                </p>
              </div>
              
              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <Layers className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Entity Reconciliation</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Interactive mapping of source table properties to target fields. Compares ID ranges, analyzes constraint mismatches, and exposes data null risk patterns.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <RefreshCw className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Smart Fix Repairs</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Automatic discovery of orphan records, broken constraints, and duplicate rows. Apply deterministic fixes safely inside the staging sandbox first.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <FileText className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">SQL Translation</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Generate cleaned, production-ready DDL and DML scripts. Translate schemas accurately between PostgreSQL, MySQL, and SQLite dialects.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <Lock className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Staging Sandboxes</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Perform dry-run executions in temporary environments. Dry-run queries and check targets without modifying target production.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-brand-primary mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Validation Gates</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Enforce strict constraints (e.g. check for null percentages, duplicate keys, orphaned relations). Operators can manually override warnings.
                </p>
              </div>

            </div>
          </section>

          {/* Section 4: User Flow */}
          <section id="workflow" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              The Migration User Flow
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              We recommend the following systematic workflow to guarantee safe database transitions:
            </p>
            
            <div className="relative border-l-2 border-stone-200 pl-6 ml-4 space-y-10">
              
              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 bg-brand-primary border-4 border-stone-50 rounded-full w-4 h-4 flex items-center justify-center" />
                <h4 className="text-sm font-bold text-text-primary mb-1">1. Initialize Organization & Project</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Setup your company organization and create a project specifying your source dialect, target dialect, and mapping goals.
                </p>
              </div>
              
              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 bg-brand-primary border-4 border-stone-50 rounded-full w-4 h-4 flex items-center justify-center" />
                <h4 className="text-sm font-bold text-text-primary mb-1">2. Upload the Source SQL Dump</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Upload your raw database backup. We isolate it in a read-only staging workspace and spin up a local diagnostic sandbox automatically.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 bg-brand-primary border-4 border-stone-50 rounded-full w-4 h-4 flex items-center justify-center" />
                <h4 className="text-sm font-bold text-text-primary mb-1">3. Run Diagnostics & Inspect Data</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Analyze row counts, primary key constraints, and check the integrity dashboards for orphaned tables or broken constraints.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 bg-brand-primary border-4 border-stone-50 rounded-full w-4 h-4 flex items-center justify-center" />
                <h4 className="text-sm font-bold text-text-primary mb-1">4. Map Fields & Run Smart Repairs</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Bind legacy columns to new target schemas. Apply deterministic fixes to repair missing relations, remove duplicates, or clean values.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 bg-brand-primary border-4 border-stone-50 rounded-full w-4 h-4 flex items-center justify-center" />
                <h4 className="text-sm font-bold text-text-primary mb-1">5. Dry Run Validation & Dialect Export</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Pass validation gates and export the final translated SQL migration file. You can also connect a live target DB to run a dry-run test push.
                </p>
              </div>

            </div>
          </section>

          {/* Section 5: Safety Rules */}
          <section id="safety" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              Safety & Staging Rules
            </h2>
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-700" />
                Platform Safety Compliance Protocols
              </h4>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                As a user-guided data intelligence tool, SQAuto enforces architectural restrictions to prevent accidental data corruption:
              </p>
              <ul className="text-xs text-amber-900/80 space-y-2.5 list-disc pl-5">
                <li>
                  <strong className="text-amber-950">Read-Only Source Dumps:</strong> SQL backup uploads are strict read-only files. They can never be altered by automatic scripts.
                </li>
                <li>
                  <strong className="text-amber-950">Isolated Sandboxing:</strong> All data cleaning, schema manipulations, and relationship repairing happen on staging tables inside isolated sandboxes.
                </li>
                <li>
                  <strong className="text-amber-950">Deterministic First:</strong> Algorithms prioritize strict database constraints and deterministic values over AI suggestions to guarantee schema precision.
                </li>
                <li>
                  <strong className="text-amber-950">Validation Gates:</strong> Migration files are not generated if critical integrity tests fail (such as duplicate primary keys or high null rates) unless manually overridden and signed off by the operator.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section id="faq" className="scroll-mt-24 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary border-b border-stone-200 pb-3">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              
              <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-brand-primary" />
                  Is SQAuto a SaaS database?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  No, SQAuto is not a host database. It is a data intelligence and migration staging suite. Its purpose is to analyze database backup dumps, profile anomalies, and export clean, ready-to-run SQL scripts for database engines (Postgres, MySQL, SQLite) hosted elsewhere.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-brand-primary" />
                  Are my legacy SQL dumps safe?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Yes. All legacy SQL dumps are processed in project-scoped, local sandboxes. SQAuto prevents any cross-project data leaks, and your source database backup files are treated as strict, read-only files.
                </p>
              </div>

              <div className="bg-white border border-brand-border rounded-xl p-5 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-brand-primary" />
                  What SQL dialects are supported?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  SQAuto parses SQL dumps and generates translated DDL/DML migration files matching three major relational database dialects: PostgreSQL, MySQL, and SQLite.
                </p>
              </div>

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import UploadCard from '@/components/UploadCard';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-2">
          <Upload className="h-8 w-8 text-teal-400" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Initialize Data Stream</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Upload a legacy SQL dump to begin the extraction and analysis pipeline. 
          The data will be restored into a project-scoped staging sandbox.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl shadow-black/50">
        <UploadCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          <div className="h-10 w-10 rounded-lg bg-teal-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-teal-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Automated Restore</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            SQAuto automatically creates an isolated staging database and restores the dump.
          </p>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Schema Discovery</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            After restoration, the system profiles every table, column, and relationship.
          </p>
        </div>
        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          <div className="h-10 w-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <Upload className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Large File Handling</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Supports multi-GB chunked uploads and gzipped SQL dumps natively.
          </p>
        </div>
      </div>
    </div>
  );
}

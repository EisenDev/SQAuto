'use client';

import React from 'react';
import MigrationControlCenter from '@/components/MigrationControlCenter';
import { ShieldCheck, Zap } from 'lucide-react';

export default function SimulationPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Live Database Simulation</h1>
          <p className="text-slate-400 text-sm mt-1">Execute dry-runs, reconciliations, and push actions to a live target database.</p>
        </div>
        <div className="flex items-center px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs font-bold text-amber-500">
          <Zap className="h-3.5 w-3.5 mr-2" />
          SIMULATION MODE: ACTIVE
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
            <ShieldCheck className="h-4 w-4 mr-2 text-teal-400" />
            Execution Console
          </h2>
        </div>
        <div className="p-6">
          <MigrationControlCenter />
        </div>
      </div>
    </div>
  );
}

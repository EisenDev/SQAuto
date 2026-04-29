"use client";
import React from 'react';
import { Terminal, Info, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';

interface ExtractionLogPreviewProps {
  logs: string;
  onViewFullLogs: () => void;
}

export default function ExtractionLogPreview({ logs, onViewFullLogs }: ExtractionLogPreviewProps) {
  const logLines = logs.split('\n').filter(l => l.trim()).slice(-10);
  
  const getLogIcon = (line: string) => {
    if (line.toUpperCase().includes('ERROR')) return <XCircle className="h-3 w-3 text-red-500" />;
    if (line.toUpperCase().includes('WARN')) return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    return <Info className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
          <Terminal className="h-4 w-4 mr-2" />
          Extraction Log Preview
        </h4>
        <button 
          onClick={onViewFullLogs}
          className="text-[10px] font-black text-teal-500 hover:text-teal-400 uppercase tracking-widest flex items-center"
        >
          View All <ChevronRight className="h-3 w-3 ml-1" />
        </button>
      </div>

      <div className="bg-slate-950 rounded-2xl border border-slate-800/50 p-6 font-mono text-[11px] space-y-2 overflow-hidden shadow-inner">
        {logLines.length > 0 ? (
          logLines.map((line, i) => (
            <div key={i} className="flex items-start space-x-3 group">
              <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                {getLogIcon(line)}
              </div>
              <p className="text-slate-400 break-all leading-relaxed hover:text-slate-200 transition-colors">
                {line}
              </p>
            </div>
          ))
        ) : (
          <p className="text-slate-600 italic">No logs available for the current active source.</p>
        )}
      </div>
    </div>
  );
}

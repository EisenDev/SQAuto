"use client";
// apps/web/src/components/ExportPanel.tsx
import React, { useState } from 'react';
import { useJob } from '@/components/JobProvider';

interface ExportPanelProps {
  disabled?: boolean;
}

export default function ExportPanel({ disabled }: ExportPanelProps) {
  const { activeJob } = useJob();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Translation Modal State
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetDialect, setTargetDialect] = useState<string>('mysql');
  const [translateError, setTranslateError] = useState<string | null>(null);

  const flavor = activeJob?.profile?.metadata?.flavor || 'postgres';

  const handleExport = (type: string) => {
    const jId = activeJob?.id || activeJob?.job_id;
    if (!jId) return;
    
    setDownloading(type);
    const url = `${API_URL}/api/jobs/${jId}/export/${type}`;
    window.open(url, '_blank');
    setTimeout(() => setDownloading(null), 1500);
  };

  const attemptTranslation = () => {
    if (targetDialect === flavor) {
      setTranslateError(`You cannot translate to the same SQL format. Source is already ${flavor}.`);
      return;
    }
    setTranslateError(null);
    setShowTranslateModal(false);
    handleExport(`translated-sql?target=${targetDialect}`);
  };

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm border-teal-100 mt-6 relative">
      <h2 className="text-lg font-bold mb-4 text-teal-800 flex items-center">
        <span className="bg-teal-100 text-teal-600 rounded-full w-6 h-6 flex items-center justify-center mr-2">↓</span>
        Export Delivery
      </h2>
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={() => handleExport("clean-sql")}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm" 
          disabled={disabled || downloading === "clean-sql"}
        >
          {downloading === "clean-sql" ? "Dumping..." : "Clean SQL (.sql)"}
        </button>
        <button 
          onClick={() => {
            setTranslateError(null);
            setShowTranslateModal(true);
          }}
          className="px-6 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all border border-gray-200" 
          disabled={disabled || downloading === "translated-sql"}
        >
          Translated SQL (Dialect)
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-4 italic">
        {disabled ? "All intelligence engines must complete processing before generating exports." : "Server processing is complete. You may dispatch exports instantly."}
      </p>

      {/* Translation Modal Overlay */}
      {showTranslateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-gray-800 mb-2">Configure SQL Translation</h3>
            <p className="text-xs text-gray-500 mb-4 tracking-tight">What SQL Format would you like to translate the payload into?</p>
            
            <select 
              value={targetDialect} 
              onChange={(e) => {
                setTargetDialect(e.target.value);
                setTranslateError(null);
              }}
              className="w-full border border-gray-300 rounded-lg text-sm p-3 mb-2 shadow-sm text-gray-700 font-medium"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL 8.0</option>
              <option value="sqlite">SQLite</option>
              <option value="tsql">Microsoft SQL Server (T-SQL)</option>
            </select>

            {translateError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-100 mb-4 animate-in fade-in zoom-in-95">
                {translateError}
              </p>
            )}

            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setShowTranslateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={attemptTranslation}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold shadow-md transition-colors"
              >
                Translate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

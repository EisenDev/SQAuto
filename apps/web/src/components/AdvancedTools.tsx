"use client";
// apps/web/src/components/AdvancedTools.tsx
import React, { useState } from 'react';

export default function AdvancedTools() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="border rounded-xl p-0 bg-white shadow-sm overflow-hidden border-teal-100 transition-all duration-300">
      <button
        className={`w-full flex justify-between items-center px-6 py-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 transition-colors ${open ? 'bg-teal-50 border-b border-teal-100' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>Advanced Diagnostic Settings</span>
        <span className="text-xl leading-none">{open ? '−' : '+'}</span>
      </button>
      
      {open && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50">
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">Translation Dialect</label>
            <select className="w-full border-gray-300 rounded-lg text-sm bg-white focus:ring-teal-500 focus:border-teal-500 shadow-sm border p-2 text-gray-600">
              <option value="postgres">PostgreSQL (Native)</option>
              <option value="mysql">MySQL 8.0</option>
              <option value="sqlite">SQLite3</option>
            </select>
            <p className="text-[10px] text-gray-400">Controls the SQL dialect for 'Translated SQL' export.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">Extraction Chunk Flow</label>
            <select className="w-full border-gray-300 rounded-lg text-sm bg-white focus:ring-teal-500 focus:border-teal-500 shadow-sm border p-2 text-gray-600">
              <option value="3">3 MB / sync (Default)</option>
              <option value="10">10 MB / sync</option>
              <option value="50">50 MB / sync (High RAM)</option>
            </select>
            <p className="text-[10px] text-gray-400">Modifies the database sync frequency during extraction.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-tight">Validation Strictness</label>
            <label className="flex items-center space-x-2 mt-1 cursor-pointer">
              <input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500 border-gray-300" defaultChecked />
              <span className="text-sm text-gray-600">Flag Implicit Data Loss</span>
            </label>
            <p className="text-[10px] text-gray-400 mt-1">If enabled, validation engine marks type-cast truncations as 'Needs Review'.</p>
          </div>

        </div>
      )}
    </div>
  );
}

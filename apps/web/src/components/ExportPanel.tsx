"use client";
// apps/web/src/components/ExportPanel.tsx
import React from 'react';

interface ExportPanelProps {
  disabled?: boolean;
}

export default function ExportPanel({ disabled }: ExportPanelProps) {
  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-2">Export Options</h2>
      <div className="flex space-x-4">
        <button 
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" 
          disabled={disabled}
        >
          Excel
        </button>
        <button 
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" 
          disabled={disabled}
        >
          Clean SQL
        </button>
        <button 
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" 
          disabled={disabled}
        >
          Translated SQL
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        {disabled ? "Waiting for job completion to enable exports..." : "Ready to export results."}
      </p>
    </div>
  );
}

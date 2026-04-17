"use client";
// apps/web/src/components/ExportPanel.tsx
import React from 'react';

export default function ExportPanel() {
  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-2">Export Options</h2>
      <div className="flex space-x-4">
        <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" disabled>
          Excel
        </button>
        <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" disabled>
          Clean SQL
        </button>
        <button className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50" disabled>
          Translated SQL
        </button>
      </div>
      {/* TODO: enable buttons when export data is ready */}
    </div>
  );
}

// apps/web/src/components/AIExplanationPanel.tsx
import React from 'react';

export default function AIExplanationPanel() {
  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <h2 className="text-lg font-medium mb-2">AI Explanation</h2>
      <p className="text-gray-500">AI generated insights will appear here.</p>
      {/* TODO: render AI explanation JSON when available */}
    </div>
  );
}

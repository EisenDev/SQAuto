// apps/web/src/components/AIExplanationPanel.tsx
import React from 'react';
import { useJob } from '@/components/JobProvider';

export default function AIExplanationPanel() {
  const { activeJob } = useJob();
  const insights: string[] = activeJob?.profile?.ai_insights || [];

  return (
    <div className="border rounded p-6 bg-white shadow-sm border-teal-100">
      <h2 className="text-lg font-bold mb-4 text-teal-800 flex items-center">
        <span className="bg-teal-100 text-teal-600 rounded-full w-6 h-6 flex items-center justify-center mr-2">✧</span>
        AI Explanation & Discovery Insights
      </h2>
      
      {insights.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm italic">Industrial Discovery Active. Intelligent insights will generate automatically once the schema profile is completed.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight, idx) => (
            <li 
              key={idx} 
              className={`p-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-300 ${
                insight.includes('⚠') 
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-amber-100/50' 
                  : insight.includes('⚡') 
                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-indigo-100/50' 
                    : 'bg-teal-50/50 text-teal-800 border border-teal-100 shadow-teal-100/20'
              }`}
            >
              {insight}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

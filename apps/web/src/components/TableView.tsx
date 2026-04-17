"use client";
import React from 'react';

interface TableViewProps {
  profile?: Record<string, any[]>;
}

export default function TableView({ profile }: TableViewProps) {
  const tableNames = profile ? Object.keys(profile) : [];

  return (
    <div className="border border-teal-100 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Extracted Tables</h2>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
          {tableNames.length} Tables Detected
        </span>
      </div>
      
      {tableNames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tableNames.map((tableName) => (
            <div 
              key={tableName} 
              className="p-4 border border-gray-100 rounded-lg hover:border-teal-300 hover:bg-teal-50/20 transition-all cursor-default group"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full group-hover:scale-125 transition-transform" />
                <h3 className="font-mono text-sm font-bold text-gray-700 truncate">
                  {tableName}
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                {profile?.[tableName]?.length || 0} Columns
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No tables loaded yet. Upload a SQL dump to begin profiling.</p>
        </div>
      )}
    </div>
  );
}

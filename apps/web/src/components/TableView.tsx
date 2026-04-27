import React, { useState } from 'react';
import Skeleton from './Skeleton';

interface TableViewProps {
  profile?: Record<string, any>;
  loading?: boolean;
}

export default function TableView({ profile, loading }: TableViewProps) {
  // Industrial safety: if profile contains a 'tables' key (new structure), use it
  const actualTables = profile?.tables || (profile?.metadata ? {} : profile) || {};
  const liveChunks = (profile as any)?.live_chunks || [];
  const finalTables = !liveChunks.length ? Object.keys(actualTables) : [];
  
  const hasData = liveChunks.length > 0 || finalTables.length > 0;
  
  // Track open table for column view
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  return (
    <div className="border border-teal-100 rounded-xl p-6 bg-white shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Extracted Tables & Chunks</h2>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
          {loading ? "Analyzing Pipeline..." : hasData ? "Industrial Discovery Active" : "Waiting for Data..."}
        </span>
      </div>
      
      {loading && !hasData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="p-4 border border-gray-100 rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          ))}
        </div>
      ) : liveChunks.length > 0 ? (
        <div className="space-y-6">
          <p className="text-[10px] uppercase font-bold text-teal-600 tracking-widest flex items-center">
            <span className="w-2 h-2 bg-teal-500 rounded-full mr-2 animate-pulse" />
            Live Data Extraction (Peeking in progress)
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {liveChunks.map((chunk: any) => (
              <div key={chunk.table} className="border border-teal-50 rounded-lg overflow-hidden flex flex-col shadow-sm">
                <div className="bg-teal-50/50 px-3 py-2 border-b border-teal-50 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-teal-800">{chunk.table}</span>
                  <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded uppercase">{chunk.rows.length} Rows</span>
                </div>
                <div className="p-2 overflow-x-auto bg-white">
                   <table className="min-w-full text-[10px] text-gray-600">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {chunk.rows[0] && Object.keys(chunk.rows[0]).slice(0, 4).map((k: string) => (
                            <th key={k} className="text-left py-1 font-semibold pr-2">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.rows.slice(0, 3).map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-teal-50/10">
                            {Object.values(row).slice(0, 4).map((v: any, vIdx: number) => (
                              <td key={vIdx} className="py-1 pr-2 truncate max-w-[120px]">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : finalTables.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {finalTables.map((tableName) => {
            const isExpanded = expandedTable === tableName;
            const tableData = (actualTables as any)?.[tableName];
            // Industrial safety: Handle both new relational structure {columns: []} and legacy flat structure []
            const columns = Array.isArray(tableData) ? tableData : (tableData?.columns || []);
            
            return (
              <div 
                key={tableName} 
                onClick={() => setExpandedTable(isExpanded ? null : tableName)}
                className={`p-4 border rounded-lg transition-all cursor-pointer group shadow-sm overflow-hidden ${isExpanded ? 'border-teal-300 bg-teal-50/10 ring-1 ring-teal-300' : 'border-gray-100 hover:border-teal-300 hover:bg-teal-50/20'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full transition-all ${isExpanded ? 'bg-teal-500 scale-125' : 'bg-gray-300 group-hover:bg-teal-400 group-hover:scale-125'}`} />
                    <h3 className="font-mono text-sm font-bold text-gray-700 truncate max-w-[180px]">
                      {tableName}
                    </h3>
                  </div>
                  <span className={`text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono transition-colors ${isExpanded ? 'bg-teal-100 text-teal-700' : ''}`}>
                    {Array.isArray(columns) ? columns.length : 0} Cols
                  </span>
                </div>
                
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <ul className="space-y-1 bg-white p-2 rounded border border-gray-50">
                      {Array.isArray(columns) && columns.map((col: {name: string, type: string}, cIdx: number) => (
                        <li key={cIdx} className="flex justify-between text-[11px] py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <span className="font-mono text-gray-600 truncate mr-2">{col.name}</span>
                          <span className="text-teal-600 font-mono opacity-80">{col.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No tables loaded yet. Upload a SQL dump to begin profiling.</p>
        </div>
      )}
    </div>
  );
}

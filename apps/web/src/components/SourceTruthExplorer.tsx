"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Skeleton from './Skeleton';
import { Database, AlertTriangle, RefreshCw, Layers, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { safeFetch } from '@/lib/api_client';

interface SourceTruthExplorerProps {
  jobId: string;
  profile: Record<string, any>;
}

export default function SourceTruthExplorer({ jobId, profile }: SourceTruthExplorerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{columns: string[], rows: any[], total: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{detail: string, code: number} | null>(null);
  
  // Search & Pagination States
  const [tableSearch, setTableSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const tables = profile ? Object.keys(profile) : [];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Local filtering for tables list
  const filteredTables = useMemo(() => {
    return tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [tables, tableSearch]);

  // Fetch Table Data with Search & Pagination
  useEffect(() => {
    if (!selectedTable || !jobId) return;
    
    setLoading(true);
    setError(null);
    
    const offset = (page - 1) * itemsPerPage;
    const searchParam = rowSearch ? `&q=${encodeURIComponent(rowSearch)}` : "";
    
    safeFetch(`${API_URL}/explorer/${jobId}/table/${selectedTable}/data?limit=${itemsPerPage}&offset=${offset}${searchParam}`)
      .then(result => {
        if (result.success) {
          setTableData(result.data);
        } else {
          setError({ detail: result.error, code: result.status || 500 });
          setTableData(null);
        }
        setLoading(false);
      });
      
  }, [selectedTable, jobId, API_URL, page, rowSearch]);

  // Reset pagination when table changes
  useEffect(() => {
    setPage(1);
    setRowSearch("");
  }, [selectedTable]);

  if (tables.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 mt-6">
        <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-400 text-sm font-medium">No profile data available.</p>
      </div>
    );
  }

  const totalPages = tableData ? Math.ceil(tableData.total / itemsPerPage) : 0;

  return (
    <div className="flex flex-col md:flex-row gap-6 mt-6 min-h-[700px] animate-in fade-in duration-500">
      {/* Left Pane: Table Selection */}
      <div className="w-full md:w-1/4 min-w-[300px] bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-br from-teal-800 to-teal-900 text-white p-5 border-b border-teal-700/30">
          <div className="flex items-center space-x-2 mb-4">
             <Layers className="w-4 h-4 text-teal-400" />
             <h3 className="font-black text-xs tracking-widest uppercase italic">Staging Data Bank</h3>
          </div>
          
          {/* Table Finder */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300 transition-colors group-focus-within:text-white" />
            <input 
              type="text"
              placeholder="FILTER TABLES..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-teal-950/50 border border-teal-600/50 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black tracking-widest text-white placeholder-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-500/20 focus:bg-teal-950 transition-all"
            />
            {tableSearch && (
              <button 
                onClick={() => setTableSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex justify-between items-center mt-3">
             <p className="text-[10px] text-teal-200/60 font-bold uppercase tracking-tighter">
               {filteredTables.length} OF {tables.length} CLUBS
             </p>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[600px] flex-grow custom-scrollbar bg-[#fdfdfd]">
          {filteredTables.map(table => (
            <button
              key={table}
              onClick={() => setSelectedTable(table)}
              className={`w-full text-left px-5 py-3.5 border-b border-gray-100 text-[11px] font-mono transition-all duration-200 flex items-center justify-between group ${selectedTable === table ? 'bg-teal-50 text-teal-900 font-bold border-l-4 border-l-teal-600 shadow-inner' : 'text-gray-500 hover:bg-gray-50 border-l-4 border-l-transparent hover:text-gray-900 border-b-gray-50'}`}
            >
              <span className="truncate pr-2">{table}</span>
              {selectedTable === table && <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]" />}
            </button>
          ))}
          {filteredTables.length === 0 && (
            <div className="p-10 text-center text-gray-300 italic text-[10px] uppercase font-bold tracking-widest">
              No matching tables found
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Content Viewer */}
      <div className="w-full md:w-3/4 bg-white border border-teal-100 rounded-2xl shadow-xl flex flex-col overflow-hidden relative border-t-4 border-t-teal-600">
        {selectedTable ? (
          <>
            <div className="bg-white border-b border-gray-100 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm z-10 transition-all">
              <div className="flex flex-col w-full sm:w-auto">
                <h3 className="font-black text-teal-900 font-mono text-sm leading-none flex items-center uppercase tracking-tighter">
                  <Database className="w-4 h-4 text-teal-600 mr-2" />
                  {selectedTable}
                </h3>
                <div className="flex items-center space-x-2 mt-1.5">
                   <span className="text-[10px] bg-teal-900 text-teal-50 px-2 py-0.5 rounded font-black tracking-widest italic uppercase">
                     {tableData?.total || 0} TOTAL ROWS
                   </span>
                   <span className="text-[9px] text-gray-400 font-extrabold tracking-tight uppercase">Sandbox Explorer Active</span>
                </div>
              </div>

              {/* Row Search Field */}
              <div className="relative w-full sm:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-focus-within:text-teal-600" />
                <input 
                  type="text"
                  placeholder="SEARCH KEYWORDS..."
                  value={rowSearch}
                  onChange={(e) => {
                    setRowSearch(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold tracking-widest text-teal-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-inner"
                />
              </div>
            </div>
            
            <div className="flex-grow p-0 overflow-auto bg-white relative min-h-[500px]">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl opacity-20 border border-gray-50 shadow-sm" />
                  ))}
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center">
                     <RefreshCw className="w-8 h-8 text-teal-200 animate-spin" />
                  </div>
                </div>
              ) : error ? (
                <div className="p-20 text-center animate-in zoom-in-95 duration-500">
                  <AlertTriangle className="w-16 h-16 text-red-100 mx-auto mb-6" />
                  <h4 className="text-red-900 font-black text-xl mb-4 italic uppercase tracking-tighter">Communication Failed</h4>
                  <p className="text-xs text-red-600/70 font-mono bg-red-50 p-4 rounded-2xl border border-red-100 max-w-sm mx-auto">
                    {error.detail}
                  </p>
                </div>
              ) : tableData && tableData.rows.length > 0 ? (
                <div className="overflow-x-auto h-[550px] relative">
                  <table className="min-w-full text-[11px] text-gray-700 whitespace-nowrap table-auto">
                    <thead className="bg-[#f8fcfc] sticky top-0 z-20">
                      <tr className="shadow-sm">
                        {tableData.columns.map((col, i) => (
                          <th key={i} className="px-5 py-4 text-left font-black text-gray-500 uppercase tracking-widest border-b border-gray-100 bg-[#f8fcfc] border-r border-gray-100">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-mono">
                      {tableData.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-teal-50/40 transition-colors group border-gray-50">
                          {tableData.columns.map((col, j) => (
                            <td key={j} className="px-5 py-3 text-gray-600 border-r border-gray-50 last:border-r-0 truncate max-w-[250px] transition-all group-hover:text-teal-900 group-hover:bg-white" title={String(row[col])}>
                              {row[col] === null ? <span className="text-gray-300 italic opacity-30">NULL</span> : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-32 text-center text-gray-400 animate-in fade-in transition-all">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                    <Database className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-black text-sm uppercase tracking-widest text-gray-300">No Records Found</p>
                  <p className="text-[10px] mt-2 font-bold text-gray-400 uppercase">Try broading your search or selecting a different table</p>
                </div>
              )}
            </div>

            {/* Pagination HUD */}
            {tableData && tableData.total > 0 && (
              <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="text-[10px] font-black text-gray-400 tracking-widest uppercase">
                    SHOWING <span className="text-teal-600">{tableData.rows.length}</span> OF {tableData.total} RESULTS
                 </div>
                 
                 <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 hover:bg-white border border-gray-200 rounded-xl disabled:opacity-30 transition-all hover:text-teal-600 hover:shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="px-4 py-1.5 bg-white border border-teal-100 rounded-xl shadow-inner text-[11px] font-black text-teal-900 min-w-24 text-center">
                       PAGE <span className="text-teal-600">{page}</span> OF {totalPages}
                    </div>

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-2 hover:bg-white border border-gray-200 rounded-xl disabled:opacity-30 transition-all hover:text-teal-600 hover:shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center bg-gray-50/30 overflow-hidden relative">
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 p-20 opacity-5 -rotate-12 translate-x-20 -translate-y-20">
               <Database className="w-96 h-96" />
            </div>

            <div className="text-center animate-in zoom-in-95 duration-700 relative z-10 px-6">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto mb-8 border border-teal-50 ring-8 ring-teal-50/30">
                <Layers className="w-10 h-10 text-teal-300" />
              </div>
              <h3 className="text-teal-900 font-black text-2xl tracking-tighter mb-3 italic uppercase">Industrial Databank</h3>
              <p className="text-[10px] text-teal-600 font-black uppercase tracking-[0.2em] mb-8 bg-teal-50 py-1 rounded-full px-4 max-w-fit mx-auto">Select content to audit</p>
              <p className="text-xs text-gray-400 max-w-[320px] mx-auto leading-relaxed font-bold font-mono">
                PEEK DIRECTLY INTO THE ACTIVE STAGING SANDBOX. CHOOSE A CLUSTER FROM THE LEFT PANEL TO INITIALIZE CONTENT AUDIT.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

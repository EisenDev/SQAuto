"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useJob } from '@/components/JobProvider';
import {
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, Save,
  Columns, RefreshCw, ChevronDown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface ColumnMapping {
  sourceColumn: string;
  sourceType: string;
  targetColumn: string;
  typeMatch: boolean;
  status: 'mapped' | 'unmapped' | 'type_mismatch';
}

interface TableMapping {
  tableName: string;
  mappings: ColumnMapping[];
}

import Tooltip from './Tooltip';

export default function SchemaMappingPanel() {
  const { activeJob } = useJob();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, TableMapping>>({});
  const [saved, setSaved] = useState(false);

  const jobId = activeJob?.id || activeJob?.job_id;

  // Reset session mapping state if the active Job changes
  useEffect(() => {
    setSelectedTable('');
    setMappings({});
  }, [jobId]);

  // Extract table info from active job profile
  const tables = useMemo(() => {
    const profile = activeJob?.profile?.tables || {};
    return Object.entries(profile).map(([name, info]: [string, any]) => ({
      name,
      columns: info.columns || [],
      primary_keys: info.primary_keys || [],
    }));
  }, [activeJob?.profile?.tables]);

  // Auto-select first table
  useEffect(() => {
    if (tables.length > 0 && !selectedTable) {
      setSelectedTable(tables[0].name);
    }
  }, [tables, selectedTable]);

  // Build initial mapping when table changes
  useEffect(() => {
    if (!selectedTable) return;
    if (mappings[selectedTable]) return; // already mapped

    const tableInfo = tables.find(t => t.name === selectedTable);
    if (!tableInfo) return;

    const initialMappings: ColumnMapping[] = tableInfo.columns.map((col: any) => ({
      sourceColumn: col.name,
      sourceType: col.type,
      targetColumn: col.name, // Default: identity mapping
      typeMatch: true, // Assume match by default
      status: 'mapped' as const,
    }));

    setMappings(prev => ({
      ...prev,
      [selectedTable]: { tableName: selectedTable, mappings: initialMappings }
    }));
  }, [selectedTable, tables]);

  const currentMappings = mappings[selectedTable]?.mappings || [];

  const updateMapping = (index: number, field: string, value: string) => {
    setSaved(false);
    setMappings(prev => {
      const updated = { ...prev };
      const table = { ...updated[selectedTable] };
      const newMappings = [...table.mappings];
      const mapping = { ...newMappings[index] };
      
      if (field === 'targetColumn') {
        mapping.targetColumn = value;
        mapping.status = value ? (mapping.sourceColumn === value ? 'mapped' : 'mapped') : 'unmapped';
      }
      
      newMappings[index] = mapping;
      table.mappings = newMappings;
      updated[selectedTable] = table;
      return updated;
    });
  };

  const toggleTypeMatch = (index: number) => {
    setSaved(false);
    setMappings(prev => {
      const updated = { ...prev };
      const table = { ...updated[selectedTable] };
      const newMappings = [...table.mappings];
      const mapping = { ...newMappings[index] };
      mapping.typeMatch = !mapping.typeMatch;
      mapping.status = mapping.typeMatch ? 'mapped' : 'type_mismatch';
      newMappings[index] = mapping;
      table.mappings = newMappings;
      updated[selectedTable] = table;
      return updated;
    });
  };

  const saveConfig = () => {
    // Store to localStorage for now (Phase 2 — backend persistence in Phase 3+)
    try {
      if (!jobId) return;
      localStorage.setItem(`sqauto_mapping_${jobId}`, JSON.stringify(mappings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save mapping config:", e);
    }
  };

  // Load saved config on mount
  useEffect(() => {
    if (!jobId) return;
    try {
      const stored = localStorage.getItem(`sqauto_mapping_${jobId}`);
      if (stored) {
        setMappings(JSON.parse(stored));
      }
    } catch (e) { /* ignore */ }
  }, [jobId]);

  // Stats
  const mappedCount = currentMappings.filter(m => m.status === 'mapped').length;
  const unmappedCount = currentMappings.filter(m => m.status === 'unmapped').length;
  const mismatchCount = currentMappings.filter(m => m.status === 'type_mismatch').length;

  if (tables.length === 0) {
    return (
      <div className="bg-white border border-violet-100 rounded-2xl shadow-xl p-12 text-center">
        <Columns className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">No schema data</p>
        <div className="max-w-xs mx-auto text-left bg-gray-50 p-4 rounded-xl text-[11px] text-gray-600 font-mono leading-relaxed">
          <p className="font-bold text-gray-800 mb-2">Steps:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Upload a SQL dump</li>
            <li>Wait for extraction processing</li>
            <li>Mapping table will appear automatically</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-violet-100 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-violet-800 to-purple-900 p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Columns className="w-5 h-5 text-violet-300" />
          <h3 className="font-black text-sm text-white tracking-widest uppercase italic flex items-center">
            Schema Mapping Layer
            <Tooltip content="This defines how columns from your source map to your destination database." />
          </h3>
        </div>
        <button
          onClick={saveConfig}
          className="px-4 py-2 bg-white/10 backdrop-blur text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center space-x-2 border border-white/20"
        >
          {saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
          <span>{saved ? 'SAVED ✓' : 'SAVE MAPPING'}</span>
        </button>
      </div>

      <div className="p-6">
        {/* Table Selector */}
        <div className="flex items-center space-x-4 mb-6">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0">SELECT TABLE</label>
          <div className="relative flex-1">
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-800 font-mono appearance-none focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 shadow-inner pr-10"
            >
              {tables.map(t => (
                <option key={t.name} value={t.name}>{t.name} ({t.columns.length} columns)</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <p className="text-lg font-black text-emerald-700">{mappedCount}</p>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Mapped</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-lg font-black text-gray-500">{unmappedCount}</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Unmapped</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
            <p className="text-lg font-black text-amber-700">{mismatchCount}</p>
            <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Type Mismatch</p>
          </div>
        </div>

        {/* Mapping Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-[11px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Source Column</th>
                <th className="px-4 py-3 text-center font-black text-gray-500 uppercase tracking-widest w-10"></th>
                <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-widest">Target Column</th>
                <th className="px-4 py-3 text-center font-black text-gray-500 uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-center font-black text-gray-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentMappings.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div>
                      <span className="font-mono font-bold text-gray-800">{m.sourceColumn}</span>
                      <span className="text-[9px] text-gray-400 ml-2 font-mono">{m.sourceType}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <ArrowRight className="w-3 h-3 text-gray-300 mx-auto" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={m.targetColumn}
                      onChange={e => updateMapping(i, 'targetColumn', e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-3 text-[11px] text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                      placeholder="Target column name..."
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => toggleTypeMatch(i)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase transition-colors ${
                        m.typeMatch 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {m.typeMatch ? '✓ OK' : '✗ MISMATCH'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {m.status === 'mapped' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />}
                    {m.status === 'unmapped' && <XCircle className="w-3.5 h-3.5 text-gray-300 mx-auto" />}
                    {m.status === 'type_mismatch' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[9px] text-gray-400 mt-3 text-center font-mono">
          Mappings are saved to browser storage. Backend persistence coming in Phase 3.
        </p>
      </div>
    </div>
  );
}

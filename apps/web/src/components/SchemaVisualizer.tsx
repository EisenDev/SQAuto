"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Handle, 
  Position,
  NodeProps,
  Edge,
  Node,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Database, Key, Link as LinkIcon, Info, Save, RotateCcw } from 'lucide-react';
import { toast } from "sonner";
import { safeFetch } from "@/lib/api_client";

// Custom Table Node Component
const TableNode = ({ data }: NodeProps) => {
  const { label, columns, primary_keys } = data;
  
  return (
    <div className="bg-white border-2 border-teal-600 rounded-xl shadow-xl min-w-[200px] overflow-hidden group hover:ring-4 ring-teal-500/20 transition-all">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white p-3 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-teal-400" />
          <span className="font-bold text-xs uppercase tracking-widest">{label}</span>
        </div>
      </div>
      
      {/* Columns List */}
      <div className="p-3 bg-white space-y-1.5">
        {columns.map((col: any, idx: number) => {
          const isPK = primary_keys.includes(col.name);
          return (
            <div key={idx} className="flex items-center justify-between text-[10px] py-1 border-b border-gray-100 last:border-0">
              <div className="flex items-center space-x-2">
                {isPK ? (
                  <Key className="w-3 h-3 text-amber-500 fill-amber-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-200" />
                )}
                <span className={`font-mono ${isPK ? 'text-teal-900 font-bold' : 'text-gray-600 font-medium'}`}>
                  {col.name}
                </span>
              </div>
              <span className="text-[8px] text-gray-400 font-mono uppercase bg-gray-50 px-1 rounded italic">{col.type}</span>
            </div>
          );
        })}
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-teal-500 !border-2 !border-white" />
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
};

interface SchemaVisualizerProps {
  jobId: string;
  graph: {
    nodes: any[];
    edges: any[];
  };
}

export default function SchemaVisualizer({ jobId, graph }: SchemaVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Effect to initialize nodes and edges from graph prop
  useEffect(() => {
    if (!graph?.nodes) return;

    const initialNodes = graph.nodes.map((node, index) => {
      // Use saved position if available, otherwise default to grid
      const defaultX = (index % 4) * 350;
      const defaultY = Math.floor(index / 4) * 450;
      
      return {
        id: node.id,
        type: 'tableNode',
        data: { 
          label: node.label,
          columns: node.columns,
          primary_keys: node.primary_keys
        },
        position: node.position || { x: defaultX, y: defaultY },
      };
    });

    const initialEdges: Edge[] = graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: edge.status === 'valid',
      labelStyle: { fontSize: 8, fontWeight: 700, fill: '#0d9488' },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: '#f0fdfa', fillOpacity: 0.9, stroke: '#ccfbf1' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#0d9488',
      },
      style: { stroke: '#0d9488', strokeWidth: 2 },
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graph, setNodes, setEdges]);

  // Function to save the currently dragged layout back to the Job server
  const saveLayout = async () => {
    if (!jobId) return;
    setIsSaving(true);
    
    // We extract only the positions to keep the payload clean
    const nodePositions = nodes.map(n => ({
      id: n.id,
      position: n.position
    }));

    // Update the backend profile with persistent positions
    const result = await safeFetch(`${API_URL}/jobs/${jobId}/layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions: nodePositions })
    });

    if (result.success) {
      toast.success("Industrial Layout Synchronized", {
        description: "Your custom table arrangement has been persisted to the server storage."
      });
    } else {
      toast.error("Communication Failure", {
        description: result.error
      });
    }
    setIsSaving(false);
  };

  if (!graph || (graph.nodes.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 mt-6 min-h-[500px]">
        <Database className="w-16 h-16 text-gray-300 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-gray-800 tracking-tight">Industrial Graph Pending</h3>
        <p className="text-sm text-gray-500 max-w-sm text-center mt-2 leading-relaxed">
          The relational schema graph will materialize here once the industrial profiling phase successfully detects native Foreign Key constraints.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 border border-teal-100 rounded-2xl shadow-2xl overflow-hidden bg-[#fafafa] relative animate-in fade-in zoom-in-95 duration-700 h-[750px]">
      {/* Control Overlay */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
         <button 
           onClick={saveLayout}
           disabled={isSaving}
           className="bg-teal-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-50 ring-4 ring-teal-900/10"
         >
           {isSaving ? (
             <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
           ) : (
             <Save className="w-3 h-3" />
           )}
           <span>{isSaving ? 'SYNCING...' : 'SYNC LAYOUT'}</span>
         </button>
      </div>

      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md p-4 rounded-xl border border-teal-100 shadow-xl space-y-3 max-w-[220px]">
         <div className="flex items-center space-x-2 border-b border-gray-100 pb-2 mb-2">
            <Info className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-black uppercase text-teal-900 tracking-widest">Industrial Legend</h4>
         </div>
         <div className="flex items-center space-x-3 text-[10px] font-bold text-gray-600">
           <div className="w-3 h-3 bg-amber-500 rounded-sm" />
           <span>Primary Key (PK)</span>
         </div>
         <div className="flex items-center space-x-3 text-[10px] font-bold text-gray-600">
           <div className="w-3 h-0.5 bg-teal-600" />
           <span>Native Foreign Key</span>
         </div>
         <div className="pt-2 text-[9px] text-gray-400 italic">
           * Drag table headers to rearrange. Click SYNC to save.
         </div>
      </div>

      {/* Main Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="industrial-flow-canvas"
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls className="bg-white border-teal-100 shadow-lg rounded-xl" />
        <MiniMap 
          nodeColor="#0d9488" 
          maskColor="rgba(15, 23, 42, 0.05)" 
          className="rounded-xl border border-teal-100 shadow-xl"
        />
      </ReactFlow>
    </div>
  );
}

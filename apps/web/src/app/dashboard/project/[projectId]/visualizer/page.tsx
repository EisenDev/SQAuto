"use client";

import React from "react";
import "reactflow/dist/style.css";
import ReactFlow, { Background, Controls, MarkerType, MiniMap, useEdgesState, useNodesState } from "reactflow";
import { RefreshCw, UploadCloud } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  ProjectLockGuard,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import { getJobQualityReport, getJobSchemaGraph } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

function SchemaNode({ data }: { data: { label: string; columns?: Array<{ name: string; type?: string; primary?: boolean; foreign?: string | null }>; primaryKeys?: string[] } }) {
  const columns = data.columns || [];
  const primaryKeys = new Set(data.primaryKeys || []);
  return (
    <div className="w-[260px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-premium">
      <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
        <div className="text-sm font-bold text-stone-900">{data.label}</div>
        <span className="rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-stone-600 font-semibold">
          {columns.length} cols
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {columns.map((column) => {
          const isPrimary = column.primary || primaryKeys.has(column.name);
          const isForeign = Boolean(column.foreign);
          return (
            <div key={column.name} className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2.5 text-xs">
              <div className="min-w-0">
                <div className="truncate font-semibold text-stone-850">{column.name}</div>
                <div className="truncate text-stone-500 font-bold">{String(column.type || "text").toUpperCase()}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {isPrimary ? <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 text-[10px] font-bold">PK</span> : null}
                {isForeign ? <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-150 px-2 py-0.5 text-[10px] font-bold">FK</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VisualizerPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [graph, setGraph] = React.useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [issues, setIssues] = React.useState<any[]>([]);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!workspace.sourceStatus.active_job_id) {
        setGraph({ nodes: [], edges: [] });
        setIssues([]);
        return;
      }
      try {
        const [graphResult, qualityResult] = await Promise.all([
          getJobSchemaGraph(workspace.sourceStatus.active_job_id),
          getJobQualityReport(workspace.sourceStatus.active_job_id),
        ]);
        if (cancelled) return;
        setGraph(graphResult);
        setIssues((qualityResult.issues || []).filter((issue) => issue.issue_type === "Orphan Records" || issue.issue_type === "Type Mismatches"));
        setPageError(null);
      } catch (error: any) {
        if (!cancelled) {
          setGraph({ nodes: [], edges: [] });
          setIssues([]);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workspace.sourceStatus.active_job_id]);

  const flowNodes = React.useMemo(() => graph.nodes.map((node, index) => ({
    id: node.id,
    position: node.position || { x: (index % 3) * 260, y: Math.floor(index / 3) * 180 },
    type: "schemaNode",
    data: { label: node.label, columns: node.columns || [], primaryKeys: node.primary_keys || [] },
  })), [graph.nodes]);

  const flowEdges = React.useMemo(() => graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: edge.relation_type === "inferred",
    style: { stroke: edge.relation_type === "inferred" ? "#3b82f6" : "#0f766e", strokeWidth: 2.2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.relation_type === "inferred" ? "#3b82f6" : "#0f766e" },
    labelStyle: { fill: "#44403c", fontSize: 11, fontWeight: "bold" },
  })), [graph.edges]);
  const nodeTypes = React.useMemo(() => ({ schemaNode: SchemaNode }), []);

  React.useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <ProjectLockGuard projectId={projectId} allowedType="individual">
        <PageFrame>
          <PageHeader title={workspaceMeta.visualizer.title} description={workspaceMeta.visualizer.description} />
          <div className="mt-8">
            <EmptyState
              title="No schema graph available yet"
              description="Complete extraction first so the schema visualizer can generate table nodes and relationship edges."
              action={
                <button className={workspaceActions.primary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                  <UploadCloud className="h-4 w-4" />
                  Upload SQL dump
                </button>
              }
            />
          </div>
        </PageFrame>
      </ProjectLockGuard>
    );
  }

  return (
    <ProjectLockGuard projectId={projectId} allowedType="individual">
      <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspaceMeta.visualizer.title}
          description={workspaceMeta.visualizer.description}
          badge={<StatusBadge status={workspace.sourceStatus.status || "idle"} />}
          actions={
            <button className={workspaceActions.secondary} onClick={workspace.reload}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <SectionCard title="Schema Graph" description="Detected tables and deterministic relationships">
            {nodes.length > 0 ? (
            <div className="h-[720px] overflow-hidden rounded-3xl border border-stone-200 bg-stone-50/50 shadow-inner">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodesDraggable
                panOnDrag
                fitView
                fitViewOptions={{ padding: 0.16 }}
              >
                <Background color="rgba(28,25,23,0.06)" gap={24} />
                <MiniMap nodeColor="#0f766e" maskColor="rgba(28,25,23,0.15)" />
                <Controls />
              </ReactFlow>
            </div>
            ) : (
              <EmptyState title="Schema graph not generated yet" description="No real schema graph is available for the active job yet." />
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Legend" description="Relationship cues used by the workspace">
              <div className="space-y-3 text-sm text-stone-750 font-medium">
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3">
                  <span>Primary Key</span>
                  <StatusBadge status="completed">PK</StatusBadge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3">
                  <span>Foreign Key</span>
                  <StatusBadge status="warning">FK</StatusBadge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3">
                  <span>Broken Relation</span>
                  <StatusBadge status="failed">Future</StatusBadge>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Detected Issues" description="Schema concerns to review before migration">
              {issues.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "table", label: "Table" },
                    { key: "issue_type", label: "Issue" },
                    {
                      key: "severity",
                      label: "Severity",
                      render: (row) => <StatusBadge status={row.severity === "high" ? "failed" : row.severity === "medium" ? "warning" : "idle"}>{row.severity}</StatusBadge>,
                    },
                  ]}
                  rows={issues}
                />
              ) : (
                <EmptyState title="No data available yet" description="Missing foreign keys and orphaned islands will be highlighted here when real quality analysis reports them." />
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </PageFrame>
    </ProjectLockGuard>
  );
}

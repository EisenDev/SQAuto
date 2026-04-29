"use client";

import React from "react";
import "reactflow/dist/style.css";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import { RefreshCw, UploadCloud } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
} from "@/components/workspace/project-workspace";
import { getJobQualityReport, getJobSchemaGraph } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function VisualizerPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);
  const [graph, setGraph] = React.useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [issues, setIssues] = React.useState<any[]>([]);
  const [pageError, setPageError] = React.useState<string | null>(null);

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

  const flowNodes = graph.nodes.map((node, index) => ({
    id: node.id,
    position: node.position || { x: (index % 3) * 260, y: Math.floor(index / 3) * 180 },
    data: { label: node.label },
    style: {
      borderRadius: 18,
      border: "1px solid rgba(45,212,191,0.25)",
      background: "rgba(15,23,42,0.92)",
      color: "#f8fafc",
      padding: 16,
      width: 190,
      boxShadow: "0 20px 60px rgba(2,6,23,0.35)",
    },
  }));

  const flowEdges = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    style: { stroke: "#2dd4bf", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#2dd4bf" },
    labelStyle: { fill: "#cbd5e1", fontSize: 11 },
  }));

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
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
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
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
            {flowNodes.length > 0 ? (
            <div className="h-[640px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
              <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
                <Background color="rgba(148,163,184,0.15)" gap={24} />
                <MiniMap nodeColor="#2dd4bf" maskColor="rgba(2,6,23,0.55)" />
                <Controls />
              </ReactFlow>
            </div>
            ) : (
              <EmptyState title="Schema graph not generated yet" description="No real schema graph is available for the active job yet." />
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Legend" description="Relationship cues used by the workspace">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <span>Primary Key</span>
                  <StatusBadge status="completed">PK</StatusBadge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <span>Foreign Key</span>
                  <StatusBadge status="warning">FK</StatusBadge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
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
  );
}

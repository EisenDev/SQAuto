"use client";

import React from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { RefreshCw } from "lucide-react";
import {
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  severityTone,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
} from "@/components/workspace/project-workspace";

const CHART_COLORS = ["#2dd4bf", "#60a5fa", "#f59e0b", "#fb7185"];

export default function QualityPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);

  const grouped = [
    { name: "Duplicate Rows", value: workspace.issues.filter((issue) => issue.issueType === "Duplicate Rows").reduce((sum, issue) => sum + issue.affectedRows, 0) },
    { name: "Null Violations", value: workspace.issues.filter((issue) => issue.issueType === "Null Violations").reduce((sum, issue) => sum + issue.affectedRows, 0) },
    { name: "Orphan Records", value: workspace.issues.filter((issue) => issue.issueType === "Orphan Records").reduce((sum, issue) => sum + issue.affectedRows, 0) },
    { name: "Type Mismatches", value: workspace.issues.filter((issue) => issue.issueType === "Type Mismatches").reduce((sum, issue) => sum + issue.affectedRows, 0) },
  ];

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader title={workspaceMeta.quality.title} description={workspaceMeta.quality.description} />
        <div className="mt-8">
          <EmptyState title="Run analysis to detect issues" description="Quality summaries appear here after an extracted source is available for inspection." />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={workspaceMeta.quality.title}
          description={workspaceMeta.quality.description}
          badge={<StatusBadge status={workspace.usingMockData ? "mock" : workspace.sourceStatus.status || "idle"} />}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={`${workspaceActions.secondary} opacity-60`} disabled>
                Auto Fix (AI Assisted)
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Duplicate Rows" value={grouped[0].value} tone="teal" />
          <StatCard title="Null Violations" value={grouped[1].value} tone="blue" />
          <StatCard title="Orphan Records" value={grouped[2].value} tone="amber" />
          <StatCard title="Type Mismatches" value={grouped[3].value} tone="rose" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SectionCard title="Issue Distribution" description="Current issue mix across the staged source">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={grouped} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={5}>
                    {grouped.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2">
              {grouped.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    {item.name}
                  </div>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Issues List" description="Table-level details for the current integrity snapshot">
            <DataTable
              columns={[
                { key: "table", label: "Table" },
                { key: "issueType", label: "Issue Type" },
                {
                  key: "severity",
                  label: "Severity",
                  render: (row) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${severityTone(row.severity)}`}>{row.severity}</span>,
                },
                { key: "affectedRows", label: "Affected Rows" },
                { key: "detail", label: "Notes" },
              ]}
              rows={workspace.issues}
            />
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}

"use client";

import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Database,
  FileCode2,
  PlayCircle,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  ActionLink,
  DataTable,
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspacePageShell,
} from "@/components/workspace/project-workspace";

export default function ProjectDashboardPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projectId } = params;
  const workspace = useProjectWorkspaceData(projectId);

  const quickActions = [
    {
      id: "sql",
      title: "Upload SQL Dump",
      description: "Initialize or replace the active source for this project.",
      icon: UploadCloud,
      tone: "teal" as const,
    },
    {
      id: "explorer",
      title: "Truth Explorer",
      description: "Browse staged tables and inspect representative rows.",
      icon: Search,
      tone: "blue" as const,
    },
    {
      id: "mapping",
      title: "Schema Mapping",
      description: "Prepare source-to-target column bindings before export.",
      icon: FileCode2,
      tone: "violet" as const,
    },
    {
      id: "simulation",
      title: "Resume Last Job",
      description: "Continue from the latest active extraction or dry-run path.",
      icon: PlayCircle,
      tone: "amber" as const,
    },
  ];

  const statusSeries = workspace.recentJobs.map((job, index) => ({
    label: `Job ${index + 1}`,
    completed: job.status === "completed" ? 1 : 0,
    processing: job.status === "restoring" || job.status === "analyzing" || job.status === "uploaded" ? 1 : 0,
  }));

  return (
    <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspace.project.name}
          description={workspace.project.description || "Project workspace overview for migration progress, source health, and next actions."}
          badge={<StatusBadge status={workspace.sourceStatus.status || "idle"} />}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                className={workspaceActions.primary}
                onClick={() => router.push(`/dashboard/project/${projectId}/${workspace.sourceStatus.active_job_id ? "simulation" : "sql"}`)}
              >
                <PlayCircle className="h-4 w-4" />
                Resume last job
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Current Status" value={(workspace.sourceStatus.status || "idle").replace(/_/g, " ")} hint={workspace.sourceStatus.filename || "No source attached"} tone="teal" />
          <StatCard title="Tables" value={workspace.sourceStatus.metrics.tables} hint="Profiled in the latest workspace source" tone="blue" />
          <StatCard title="Rows" value={workspace.sourceStatus.metrics.rows.toLocaleString()} hint="Current staged row volume" tone="violet" />
          <StatCard title="Recent Jobs" value={workspace.recentJobs.length} hint={workspace.hasAnyJob ? "Jobs found in this project" : "Waiting for first upload"} tone="amber" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(`/dashboard/project/${projectId}/${action.id}`)}
              className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-left transition hover:-translate-y-1 hover:bg-white/[0.04]"
            >
              <div className="rounded-2xl bg-slate-950/70 p-3 w-fit">
                <action.icon className="h-5 w-5 text-teal-300" />
              </div>
              <div className="mt-5 text-lg font-semibold text-white">{action.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{action.description}</p>
              <div className="mt-5">
                <ActionLink>Open workspace</ActionLink>
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Activity Timeline" description="Recent workspace events and source transitions">
            {workspace.timeline.length > 0 ? (
            <div className="space-y-4">
              {workspace.timeline.map((entry) => (
                <div key={`${entry.title}-${entry.time}`} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-teal-400 shadow-[0_0_16px_rgba(45,212,191,0.55)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm font-medium text-white">{entry.title}</div>
                      <StatusBadge status={entry.status} />
                    </div>
                    <div className="mt-1 text-sm text-slate-400">{entry.subtitle}</div>
                  </div>
                  <div className="text-xs text-slate-500">{entry.time}</div>
                </div>
              ))}
            </div>
            ) : (
              <EmptyState title="No data available yet" description="Upload a SQL source to start building a project activity timeline." />
            )}
          </SectionCard>

          <SectionCard title="Status Graph" description="Latest job progression snapshot">
            {statusSeries.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statusSeries}>
                  <defs>
                    <linearGradient id="completedFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="processingFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" strokeDasharray="4 4" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16 }} />
                  <Area type="monotone" dataKey="completed" stroke="#2dd4bf" fill="url(#completedFill)" />
                  <Area type="monotone" dataKey="processing" stroke="#60a5fa" fill="url(#processingFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <EmptyState title="No data available yet" description="Recent job status activity appears here after the first project upload." />
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SectionCard title="Recent Jobs" description="Most recent jobs attached to this project">
            {workspace.recentJobs.length > 0 ? (
            <DataTable
              columns={[
                { key: "filename", label: "Source File" },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <StatusBadge status={row.status}>{row.status}</StatusBadge>,
                },
                { key: "created_at", label: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "—" },
              ]}
              rows={workspace.recentJobs}
            />
            ) : (
              <EmptyState title="No data available yet" description="This project has no job history yet." />
            )}
          </SectionCard>

          <SectionCard title="Current Source" description="Latest active source-of-truth attachment">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-teal-300" />
                  <div>
                    <div className="text-sm font-medium text-white">{workspace.sourceStatus.filename || "No source attached"}</div>
                    <div className="text-xs text-slate-500">{workspace.sourceStatus.dialect || "Dialect pending"}</div>
                  </div>
                </div>
              </div>
              <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${projectId}/diagnostics`)}>
                <BarChart3 className="h-4 w-4" />
                View diagnostics
              </button>
              <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${projectId}/sql`)}>
                <ArrowRight className="h-4 w-4" />
                Manage source upload
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageFrame>
  );
}

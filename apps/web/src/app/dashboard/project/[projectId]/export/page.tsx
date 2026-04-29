"use client";

import React from "react";
import { Download, Eye, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  PageFrame,
  PageHeader,
  SectionCard,
  StatusBadge,
  useProjectWorkspaceData,
  WorkspaceNote,
  workspaceActions,
  workspaceMeta,
  workspacePageShell,
} from "@/components/workspace/project-workspace";
import { getJobExportPreview, getJobExportStatus } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ExportPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const router = useRouter();
  const [selectedPreview, setSelectedPreview] = React.useState("clean-sql");
  const [exportStatus, setExportStatus] = React.useState<any | null>(null);
  const [preview, setPreview] = React.useState("Generate export first");
  const [pageError, setPageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!workspace.sourceStatus.active_job_id) {
        setExportStatus(null);
        return;
      }
      try {
        const result = await getJobExportStatus(workspace.sourceStatus.active_job_id);
        if (!cancelled) {
          setExportStatus(result);
          setPageError(null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setExportStatus(null);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [workspace.sourceStatus.active_job_id]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!workspace.sourceStatus.active_job_id) {
        setPreview("Generate export first");
        return;
      }
      try {
        const result = await getJobExportPreview(workspace.sourceStatus.active_job_id, selectedPreview);
        if (!cancelled) {
          setPreview(result.preview || "Generate export first");
        }
      } catch {
        if (!cancelled) {
          setPreview("Generate export first");
        }
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedPreview, workspace.sourceStatus.active_job_id]);

  if (!workspace.hasExtraction && !workspace.usingMockData) {
    return (
      <PageFrame>
        <PageHeader title={workspaceMeta.export.title} description={workspaceMeta.export.description} />
        <div className="mt-8">
          <EmptyState title="Generate first" description="Exports become available after a source has been restored and profiled in staging." />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className={workspacePageShell}>
        <PageHeader
          title={workspaceMeta.export.title}
          description={workspaceMeta.export.description}
          badge={<StatusBadge status={exportStatus?.clean_sql_ready || exportStatus?.excel_ready ? "completed" : "idle"}>{exportStatus?.clean_sql_ready || exportStatus?.excel_ready ? "Ready for export" : "Generate first"}</StatusBadge>}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={workspace.reload}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className={workspaceActions.secondary} onClick={() => router.push(`/dashboard/project/${params.projectId}/mapping`)}>
                <Eye className="h-4 w-4" />
                Review Mapping
              </button>
            </>
          }
        />

        <WorkspaceNote usingMockData={false} loading={workspace.loading} error={workspace.error || pageError} />

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { id: "clean-sql", title: "Clean SQL", description: "Sanitized PostgreSQL-friendly export from staging.", format: ".sql", ready: Boolean(exportStatus?.clean_sql_ready), endpoint: "clean-sql" },
            { id: "translated-sql", title: "Translated SQL", description: "Dialect-converted output for the chosen target engine.", format: ".sql", ready: Boolean(exportStatus?.translated_sql_ready), endpoint: "translated-sql" },
            { id: "excel", title: "Excel Export", description: "Workbook package with summary, tables, and QA notes.", format: ".xlsx", ready: Boolean(exportStatus?.excel_ready), endpoint: "excel" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedPreview(item.id)}
              className={`rounded-3xl border p-6 text-left transition ${
                selectedPreview === item.id
                  ? "border-teal-400/30 bg-teal-400/10"
                  : "border-white/10 bg-slate-900/60 hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {item.id === "excel" ? <FileSpreadsheet className="h-5 w-5 text-sky-300" /> : <FileText className="h-5 w-5 text-teal-300" />}
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                  </div>
                  <p className="text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
                <StatusBadge status={item.ready ? "completed" : "idle"}>{item.format}</StatusBadge>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-slate-500">{item.ready ? "Ready" : "Pending generation"}</span>
                <a
                  href={item.ready && workspace.sourceStatus.active_job_id ? `${API_URL}/jobs/${workspace.sourceStatus.active_job_id}/export/${item.endpoint}` : undefined}
                  className={`${workspaceActions.secondary} ${item.ready ? "" : "opacity-50 pointer-events-none"}`}
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            </button>
          ))}
        </div>

        <SectionCard title="Preview Panel" description="Readonly preview of the selected export artifact">
          <textarea
            readOnly
            value={preview}
            className="min-h-[340px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none"
          />
        </SectionCard>
      </div>
    </PageFrame>
  );
}

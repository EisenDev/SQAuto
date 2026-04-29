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
} from "@/components/workspace/project-workspace";

export default function ExportPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const router = useRouter();
  const [selectedPreview, setSelectedPreview] = React.useState("clean-sql");

  const preview = {
    "clean-sql": `-- Clean SQL Preview\nCREATE TABLE customers (\n  customer_id uuid primary key,\n  created_at timestamp,\n  status text\n);\n\n-- ${workspace.tables[0]?.rowCount || 0} staged rows available for export`,
    "translated-sql": `-- Translated SQL Preview\n-- Target dialect conversion is staged after mapping review.\n-- Preview data remains read-only until generated.`,
    excel: `Workbook Preview\n- 00_Summary\n- Table Sheets (${workspace.tables.length})\n- Validation_Report\n- AI_Summary`,
  } as Record<string, string>;

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
      <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-500">
        <PageHeader
          title={workspaceMeta.export.title}
          description={workspaceMeta.export.description}
          badge={<StatusBadge status={workspace.activeJob?.id ? "completed" : "idle"}>{workspace.activeJob?.id ? "Ready for export" : "Generate first"}</StatusBadge>}
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

        <WorkspaceNote usingMockData={workspace.usingMockData} loading={workspace.loading} error={workspace.error} />

        <div className="grid gap-4 md:grid-cols-3">
          {workspace.exportOptions.map((item) => (
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
                <span className={`${workspaceActions.secondary} ${item.ready ? "" : "opacity-50"} pointer-events-none`}>
                  <Download className="h-4 w-4" />
                  Download
                </span>
              </div>
            </button>
          ))}
        </div>

        <SectionCard title="Preview Panel" description="Readonly preview of the selected export artifact">
          <textarea
            readOnly
            value={preview[selectedPreview]}
            className="min-h-[340px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none"
          />
        </SectionCard>
      </div>
    </PageFrame>
  );
}

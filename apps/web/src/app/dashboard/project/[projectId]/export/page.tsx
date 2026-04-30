"use client";

import React from "react";
import { AlertTriangle, Download, Eye, FileSpreadsheet, FileText, RefreshCw, ShieldCheck, Wand2 } from "lucide-react";
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
import { ExportPreviewResponse, ExportStatusResponse, ExportValidateResponse, getJobExportPreview, getJobExportStatus, validateJobExport } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const EXPORT_TYPES = [
  {
    id: "clean-sql",
    title: "Clean SQL",
    description: "Cleaned SQL generated from the uploaded source/staging data in normalized PostgreSQL form.",
    format: ".sql",
  },
  {
    id: "translated-sql",
    title: "Translated SQL",
    description: "Cleaned SQL converted into the selected target dialect: PostgreSQL, MySQL, or SQLite.",
    format: ".sql",
  },
  {
    id: "excel",
    title: "Excel Export",
    description: "Workbook package with summary, tables, and QA notes for review workflows.",
    format: ".xlsx",
  },
] as const;

const EXPORT_MODES = [
  { value: "full", label: "Schema + Data" },
  { value: "schema-only", label: "Schema only" },
  { value: "data-only", label: "Data only" },
];

const DIALECTS = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
];

type ExportKind = (typeof EXPORT_TYPES)[number]["id"];

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-teal-400/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildDownloadUrl(jobId: string, kind: ExportKind, targetDialect: string, exportMode: string, overrideValidation: boolean, useManualVersion: boolean) {
  if (kind === "excel") {
    return `${API_URL}/jobs/${jobId}/export/excel`;
  }
  if (useManualVersion) {
    return `${API_URL}/jobs/${jobId}/export/manual-sql`;
  }
  const params = new URLSearchParams({
    export_mode: exportMode,
    override_validation: String(overrideValidation),
  });
  if (kind === "translated-sql") {
    params.set("target", targetDialect);
    return `${API_URL}/jobs/${jobId}/export/translated-sql?${params.toString()}`;
  }
  return `${API_URL}/jobs/${jobId}/export/clean-sql?${params.toString()}`;
}

export default function ExportPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const router = useRouter();
  const [selectedKind, setSelectedKind] = React.useState<ExportKind>("clean-sql");
  const [targetDialect, setTargetDialect] = React.useState("postgresql");
  const [exportMode, setExportMode] = React.useState("full");
  const [exportStatus, setExportStatus] = React.useState<ExportStatusResponse | null>(null);
  const [previewData, setPreviewData] = React.useState<ExportPreviewResponse | null>(null);
  const [manualSql, setManualSql] = React.useState("");
  const [manualTouched, setManualTouched] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ExportValidateResponse | null>(null);
  const [allowOverride, setAllowOverride] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [validating, setValidating] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!workspace.sourceStatus.active_job_id) {
        setExportStatus(null);
        return;
      }
      try {
        const result = await getJobExportStatus(workspace.sourceStatus.active_job_id);
        if (cancelled) return;
        setExportStatus(result);
        setPageError(null);
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
    setValidationResult(null);
    setManualTouched(false);
    setPreviewData(null);
    setPageError(null);
    if (selectedKind === "excel" || !manualTouched) {
      setManualSql("");
    }
  }, [selectedKind, targetDialect, exportMode]);

  const activeJobId = workspace.sourceStatus.active_job_id;
  const isSqlKind = selectedKind !== "excel";
  const readyByKind =
    selectedKind === "clean-sql" ? Boolean(exportStatus?.clean_sql_ready) : selectedKind === "translated-sql" ? Boolean(exportStatus?.translated_sql_ready) : Boolean(exportStatus?.excel_ready);
  const hasManualVersion = Boolean(exportStatus?.artifacts?.manual_edits_version?.sql);
  const useManualVersion = isSqlKind && Boolean(validationResult?.kind === "manual-sql" && validationResult.valid);
  const canDownload = selectedKind === "excel" ? readyByKind : readyByKind && (Boolean(validationResult?.valid) || allowOverride);
  const downloadHref = activeJobId ? buildDownloadUrl(activeJobId, selectedKind, targetDialect, exportMode, allowOverride, useManualVersion) : undefined;

  async function handleGeneratePreview() {
    if (!activeJobId || !isSqlKind) return;
    setLoadingPreview(true);
    try {
      const result = await getJobExportPreview(activeJobId, {
        kind: selectedKind,
        target: targetDialect,
        exportMode,
        overrideValidation: true,
      });
      setPreviewData(result);
      if (!manualTouched) {
        setManualSql(result.preview || "");
      }
      setPageError(null);
    } catch (error: any) {
      setPreviewData(null);
      if (!manualTouched) {
        setManualSql("");
      }
      setPageError(error?.message || "Unable to load real data");
    }
    setLoadingPreview(false);
  }

  async function handleValidate() {
    if (!activeJobId) return;
    setValidating(true);
    try {
      const result = await validateJobExport(activeJobId, {
        kind: selectedKind,
        target: targetDialect,
        exportMode,
        overrideValidation: allowOverride,
        manualSql: isSqlKind && manualTouched ? manualSql : undefined,
      });
      setValidationResult(result);
      setPageError(null);
      const status = await getJobExportStatus(activeJobId);
      setExportStatus(status);
    } catch (error: any) {
      setValidationResult(null);
      setPageError(error?.message || "Unable to validate SQL");
    }
    setValidating(false);
  }

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
          description="Build cleaned or translated SQL from uploaded staging data, validate it, and export with an explicit safety gate."
          badge={<StatusBadge status={readyByKind ? "completed" : "idle"}>{readyByKind ? "Ready for export" : "Generate first"}</StatusBadge>}
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

        <WorkspaceNote usingMockData={false} loading={workspace.loading || loadingPreview || validating} error={workspace.error || pageError} />

        <div className="rounded-3xl border border-teal-400/20 bg-teal-400/10 px-5 py-4 text-sm leading-6 text-teal-100">
          <div className="font-medium text-white">Translated SQL is generated from the uploaded SQL/staging data. Simulation is optional and only tests the generated output.</div>
          <div className="mt-1 text-teal-100/80">Simulation does not generate translated SQL. It only tests exported SQL against a live destination database.</div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {EXPORT_TYPES.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedKind(item.id)}
              className={`rounded-3xl border p-6 text-left transition ${
                selectedKind === item.id ? "border-teal-400/30 bg-teal-400/10" : "border-white/10 bg-slate-900/60 hover:bg-white/[0.03]"
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
                <StatusBadge status={item.id === "clean-sql" ? (exportStatus?.clean_sql_ready ? "completed" : "idle") : item.id === "translated-sql" ? (exportStatus?.translated_sql_ready ? "completed" : "idle") : exportStatus?.excel_ready ? "completed" : "idle"}>
                  {item.format}
                </StatusBadge>
              </div>
            </button>
          ))}
        </div>

        <SectionCard title="Export Builder" description="Select what to generate before validating or downloading.">
          <div className="grid gap-4 lg:grid-cols-4">
            <SelectField
              label="Export Type"
              value={selectedKind}
              onChange={(value) => setSelectedKind(value as ExportKind)}
              options={EXPORT_TYPES.map((item) => ({ value: item.id, label: item.title }))}
            />
            <SelectField
              label="Target Dialect"
              value={targetDialect}
              onChange={setTargetDialect}
              options={DIALECTS}
              disabled={!isSqlKind || selectedKind === "clean-sql"}
            />
            <SelectField label="Export Mode" value={exportMode} onChange={setExportMode} options={EXPORT_MODES} disabled={!isSqlKind} />
            <label className="flex items-end">
              <span className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(event) => setAllowOverride(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-400"
                />
                Export with explicit override
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className={workspaceActions.secondary} onClick={handleGeneratePreview} disabled={!isSqlKind || loadingPreview}>
              <Eye className="h-4 w-4" />
              {loadingPreview ? "Generating Preview..." : "Generate Preview"}
            </button>
            <button className={workspaceActions.primary} onClick={handleValidate} disabled={!isSqlKind || validating}>
              <ShieldCheck className="h-4 w-4" />
              Validate SQL
            </button>
            <a href={canDownload ? downloadHref : undefined} className={`${workspaceActions.secondary} ${canDownload ? "" : "pointer-events-none opacity-50"}`}>
              <Download className="h-4 w-4" />
              {useManualVersion ? "Export manual SQL" : selectedKind === "excel" ? "Download Excel" : "Export SQL"}
            </a>
            <span className="text-sm text-slate-500">
              {allowOverride ? "Explicit override enabled." : "Export remains blocked until validation passes or override is enabled."}
            </span>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="SQL Cleaning Workbench" description="Preview generated SQL, review auto-clean suggestions, and optionally override the final SQL manually.">
            {isSqlKind ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                      <Wand2 className="h-4 w-4 text-teal-300" />
                      Auto-clean suggestions
                    </div>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {(previewData?.cleaning_suggestions || []).map((suggestion) => (
                        <li key={suggestion} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                          {suggestion}
                        </li>
                      ))}
                      {!previewData?.cleaning_suggestions?.length ? <li className="text-slate-500">No data available yet</li> : null}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      Validation snapshot
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      {previewData?.blocking_issues?.length ? previewData.blocking_issues.map((issue) => <div key={issue} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">{issue}</div>) : null}
                      {previewData?.warnings?.length ? previewData.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-100">{warning}</div>) : null}
                      {!previewData?.warnings?.length && !previewData?.blocking_issues?.length ? <div className="text-slate-500">{previewData ? "No validation warnings yet" : "Generate a preview to inspect current export issues"}</div> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Generated SQL Preview</span>
                    <textarea
                      readOnly
                      value={previewData?.preview || "Preview is generated on demand to avoid rebuilding heavy SQL when switching tabs."}
                      className="min-h-[360px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Manual Final SQL Override</span>
                    <textarea
                      value={manualSql}
                      onChange={(event) => {
                        setManualSql(event.target.value);
                        setManualTouched(true);
                      }}
                      placeholder="Adjust final SQL here before validation if you need an explicit manual override."
                      className="min-h-[360px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none transition focus:border-teal-400/40"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <EmptyState title="Excel export selected" description="Excel export does not use the SQL cleaning workbench. Switch to Clean SQL or Translated SQL to validate generated SQL." />
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Artifact Store" description="Persisted export references for this job.">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Original source SQL reference</div>
                  <div className="mt-2 text-white">{exportStatus?.artifacts?.original_source_sql_reference?.filename || workspace.sourceStatus.filename || "No data available yet"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Cleaned SQL version</div>
                  <div className="mt-2 text-white">{exportStatus?.artifacts?.cleaned_sql_version?.created_at || "Not stored yet"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Translated SQL version</div>
                  <div className="mt-2 text-white">
                    {exportStatus?.artifacts?.translated_sql_version?.[targetDialect]?.created_at || "Not stored yet"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Manual edits version</div>
                  <div className="mt-2 text-white">{hasManualVersion ? exportStatus?.artifacts?.manual_edits_version?.created_at : "Not stored yet"}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Validation Result" description="Export stays gated until validation passes or you apply an explicit override.">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <span>Current state</span>
                  <StatusBadge status={validationResult?.valid ? "completed" : allowOverride ? "warning" : "idle"}>
                    {validationResult?.valid ? "Validated" : allowOverride ? "Override armed" : "Awaiting validation"}
                  </StatusBadge>
                </div>
                {validationResult?.warnings?.length ? validationResult.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-100">{warning}</div>) : null}
                {validationResult?.blocking_issues?.length ? validationResult.blocking_issues.map((issue) => <div key={issue} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">{issue}</div>) : null}
                {!validationResult && <div className="text-slate-500">Run validation to store the final validation result and artifact timestamp.</div>}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

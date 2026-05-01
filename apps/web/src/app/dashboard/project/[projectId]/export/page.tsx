"use client";

import React from "react";
import { AlertTriangle, Download, Eye, FileSpreadsheet, FileText, RefreshCw, ShieldCheck, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  ExportArtifactRecord,
  ExportPreviewResponse,
  ExportStatusResponse,
  ExportValidateResponse,
  generateJobExportArtifact,
  getJobExportPreview,
  getJobExportStatus,
  listJobExportArtifacts,
  selectStoredJobExportArtifact,
  validateJobExport,
  validateStoredJobExportArtifact,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const EXPORT_TYPES = [
  {
    id: "clean-sql",
    title: "Clean SQL",
    description: "Cleaned SQL generated from uploaded source/staging data in normalized PostgreSQL form.",
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

function buildArtifactDownloadUrl(jobId: string, artifactId?: string, kind?: ExportKind) {
  if (!jobId) return undefined;
  if (kind === "excel") return `${API_URL}/jobs/${jobId}/export/excel`;
  if (!artifactId) return undefined;
  return `${API_URL}/jobs/${jobId}/exports/artifacts/${artifactId}/download`;
}

export default function ExportPage({ params }: { params: { projectId: string } }) {
  const workspace = useProjectWorkspaceData(params.projectId);
  const router = useRouter();
  const [selectedKind, setSelectedKind] = React.useState<ExportKind>("clean-sql");
  const [targetDialect, setTargetDialect] = React.useState("postgresql");
  const [exportMode, setExportMode] = React.useState("full");
  const [exportStatus, setExportStatus] = React.useState<ExportStatusResponse | null>(null);
  const [storedArtifacts, setStoredArtifacts] = React.useState<ExportArtifactRecord[]>([]);
  const [previewData, setPreviewData] = React.useState<ExportPreviewResponse | null>(null);
  const [manualSql, setManualSql] = React.useState("");
  const [manualTouched, setManualTouched] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ExportValidateResponse | null>(null);
  const [allowOverride, setAllowOverride] = React.useState(false);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  const activeJobId = workspace.sourceStatus.active_job_id;
  const isSqlKind = selectedKind !== "excel";

  const refreshExportState = React.useCallback(async () => {
    if (!activeJobId) {
      setExportStatus(null);
      setStoredArtifacts([]);
      return;
    }
    const [status, artifacts] = await Promise.all([getJobExportStatus(activeJobId), listJobExportArtifacts(activeJobId)]);
    setExportStatus(status);
    setStoredArtifacts(artifacts.artifacts);
  }, [activeJobId]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!activeJobId) {
        setExportStatus(null);
        setStoredArtifacts([]);
        return;
      }
      try {
        const [status, artifacts] = await Promise.all([getJobExportStatus(activeJobId), listJobExportArtifacts(activeJobId)]);
        if (cancelled) return;
        setExportStatus(status);
        setStoredArtifacts(artifacts.artifacts);
        setPageError(null);
      } catch (error: any) {
        if (!cancelled) {
          setExportStatus(null);
          setStoredArtifacts([]);
          setPageError(error?.message || "Unable to load real data");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeJobId]);

  React.useEffect(() => {
    setValidationResult(null);
    setPreviewData(null);
    setPageError(null);
    if (selectedKind === "excel") {
      setManualTouched(false);
      setManualSql("");
    }
  }, [selectedKind, targetDialect, exportMode]);

  React.useEffect(() => {
    if (!activeJobId) return;
    const pending = storedArtifacts.some((artifact) => artifact.status === "queued" || artifact.status === "running");
    if (!pending) return;
    const timer = window.setInterval(() => {
      void refreshExportState();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [activeJobId, storedArtifacts, refreshExportState]);

  const currentCleanArtifact = exportStatus?.artifacts?.cleaned_sql_version as ExportArtifactRecord | undefined;
  const currentTranslatedArtifact = (exportStatus?.artifacts?.translated_sql_version?.[targetDialect] as ExportArtifactRecord | undefined) || undefined;
  const currentManualArtifact = exportStatus?.artifacts?.manual_edits_version as ExportArtifactRecord | undefined;
  const activeStoredArtifact =
    selectedKind === "clean-sql" ? currentCleanArtifact : selectedKind === "translated-sql" ? currentTranslatedArtifact : undefined;
  const artifactForDownload = manualTouched && currentManualArtifact ? currentManualArtifact : activeStoredArtifact;
  const readyByKind =
    selectedKind === "clean-sql"
      ? Boolean(exportStatus?.clean_sql_artifact_stored)
      : selectedKind === "translated-sql"
        ? Boolean(currentTranslatedArtifact?.artifact_id)
        : Boolean(exportStatus?.excel_ready);
  const canDownload =
    selectedKind === "excel"
      ? readyByKind
      : Boolean(artifactForDownload?.artifact_id) && (Boolean(artifactForDownload?.validation_result?.validated_at) || allowOverride);
  const downloadHref = buildArtifactDownloadUrl(activeJobId || "", artifactForDownload?.artifact_id, selectedKind);

  async function handleGeneratePreview() {
    if (!activeJobId || !isSqlKind) return;
    setLoadingPreview(true);
    try {
      const result = await getJobExportPreview(activeJobId, {
        kind: selectedKind,
        target: targetDialect,
        exportMode,
        overrideValidation: allowOverride,
      });
      setPreviewData(result);
      if (!manualTouched) setManualSql(result.preview || "");
      setPageError(null);
    } catch (error: any) {
      setPreviewData(null);
      if (!manualTouched) setManualSql("");
      setPageError(error?.message || "Unable to load real data");
    }
    setLoadingPreview(false);
  }

  async function handleGenerateArtifact(lightweight: boolean) {
    if (!activeJobId || !isSqlKind) return;
    setGenerating(true);
    try {
      const response = await generateJobExportArtifact(activeJobId, {
        kind: selectedKind === "translated-sql" ? "translated" : "clean",
        target: targetDialect,
        exportMode,
        overrideValidation: allowOverride,
        sampleRowsPerTable: lightweight ? 1000 : null,
        sampleTableLimit: lightweight ? 10 : null,
      });
      toast.success(
        response.status === "completed"
          ? (lightweight ? "Lightweight artifact generated" : "Artifact generated")
          : (lightweight ? "Lightweight artifact generation queued" : "Artifact generation queued"),
      );
      setPageError(null);
      await refreshExportState();
    } catch (error: any) {
      setPageError(error?.message || "Unable to queue artifact generation");
    }
    setGenerating(false);
  }

  async function handleValidate() {
    if (!activeJobId || !isSqlKind) return;
    setValidating(true);
    try {
      let result: ExportValidateResponse;
      if (manualTouched) {
        result = await validateJobExport(activeJobId, {
          kind: selectedKind,
          target: targetDialect,
          exportMode,
          overrideValidation: allowOverride,
          manualSql,
        });
      } else if (activeStoredArtifact?.artifact_id) {
        const artifact = await validateStoredJobExportArtifact(activeJobId, activeStoredArtifact.artifact_id);
        result = {
          job_id: activeJobId,
          project_id: params.projectId,
          kind: selectedKind,
          target_dialect: artifact.target_dialect,
          export_mode: artifact.export_mode,
          valid: !Boolean(artifact.validation_result?.blocked),
          blocked: Boolean(artifact.validation_result?.blocked),
          warnings: artifact.validation_result?.warnings || [],
          blocking_issues: artifact.validation_result?.blocking_issues || [],
          unmapped_columns: artifact.validation_result?.unmapped_columns || [],
          created_at: artifact.updated_at || artifact.created_at || new Date().toISOString(),
          artifact_id: artifact.artifact_id,
        };
      } else {
        throw new Error("Generate and store an artifact before validating.");
      }
      setValidationResult(result);
      setPageError(null);
      await refreshExportState();
    } catch (error: any) {
      setValidationResult(null);
      setPageError(error?.message || "Unable to validate SQL");
    }
    setValidating(false);
  }

  async function handleSelectArtifact(artifactId: string) {
    if (!activeJobId) return;
    try {
      await selectStoredJobExportArtifact(activeJobId, artifactId);
      toast.success("Artifact selected for simulation");
      await refreshExportState();
    } catch (error: any) {
      setPageError(error?.message || "Unable to select artifact");
    }
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
          description="Build cleaned or translated SQL from uploaded staging data, validate stored artifacts, and prepare simulation-ready output without rebuilding everything in memory."
          badge={<StatusBadge status={readyByKind ? "completed" : "idle"}>{readyByKind ? "Artifact stored" : "Generate first"}</StatusBadge>}
          actions={
            <>
              <button className={workspaceActions.secondary} onClick={() => void Promise.all([workspace.reload(), refreshExportState()])}>
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

        <WorkspaceNote usingMockData={false} loading={workspace.loading || loadingPreview || validating || generating} error={workspace.error || pageError} />

        <div className="rounded-3xl border border-teal-400/20 bg-teal-400/10 px-5 py-4 text-sm leading-6 text-teal-100">
          <div className="font-medium text-white">Translated SQL is generated from the uploaded SQL/staging data. Simulation is optional and only tests the generated output.</div>
          <div className="mt-1 text-teal-100/80">Generate and store an artifact before running simulation. Lightweight generation uses sample rows to verify SQL compatibility without processing the full dataset.</div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {EXPORT_TYPES.map((item) => {
            const stored =
              item.id === "clean-sql"
                ? exportStatus?.clean_sql_artifact_stored
                : item.id === "translated-sql"
                  ? exportStatus?.translated_sql_artifact_stored
                  : exportStatus?.excel_ready;
            return (
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
                  <StatusBadge status={stored ? "completed" : "idle"}>{item.format}</StatusBadge>
                </div>
              </button>
            );
          })}
        </div>

        <SectionCard title="Export Builder" description="Generate, validate, and store SQL artifacts before download or simulation.">
          <div className="grid gap-4 lg:grid-cols-4">
            <SelectField label="Export Type" value={selectedKind} onChange={(value) => setSelectedKind(value as ExportKind)} options={EXPORT_TYPES.map((item) => ({ value: item.id, label: item.title }))} />
            <SelectField label="Target Dialect" value={targetDialect} onChange={setTargetDialect} options={DIALECTS} disabled={!isSqlKind || selectedKind === "clean-sql"} />
            <SelectField label="Export Mode" value={exportMode} onChange={setExportMode} options={EXPORT_MODES} disabled={!isSqlKind} />
            <label className="flex items-end">
              <span className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                <input type="checkbox" checked={allowOverride} onChange={(event) => setAllowOverride(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-400" />
                Export with explicit override
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button className={workspaceActions.secondary} onClick={handleGeneratePreview} disabled={!isSqlKind || loadingPreview}>
              <Eye className="h-4 w-4" />
              {loadingPreview ? "Generating Preview..." : "Generate Preview"}
            </button>
            <button className={workspaceActions.primary} onClick={() => void handleGenerateArtifact(false)} disabled={!isSqlKind || generating}>
              <FileText className="h-4 w-4" />
              {generating ? "Queueing..." : selectedKind === "translated-sql" ? "Generate Translated SQL" : "Generate Clean SQL"}
            </button>
            <button className={workspaceActions.secondary} onClick={() => void handleGenerateArtifact(true)} disabled={!isSqlKind || generating}>
              <Wand2 className="h-4 w-4" />
              Generate simulation-ready artifact
            </button>
            <button className={workspaceActions.primary} onClick={handleValidate} disabled={!isSqlKind || validating || (!manualTouched && !activeStoredArtifact?.artifact_id)}>
              <ShieldCheck className="h-4 w-4" />
              {manualTouched ? "Validate Manual SQL" : "Validate Stored Artifact"}
            </button>
            <a href={canDownload ? downloadHref : undefined} className={`${workspaceActions.secondary} ${canDownload ? "" : "pointer-events-none opacity-50"}`}>
              <Download className="h-4 w-4" />
              {selectedKind === "excel" ? "Download Excel" : manualTouched && currentManualArtifact ? "Download Manual SQL" : "Download Stored Artifact"}
            </a>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="SQL Cleaning Workbench" description="Preview generated SQL, review auto-clean suggestions, and optionally save a manual final SQL artifact.">
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
                      {!previewData?.cleaning_suggestions?.length ? <li className="text-slate-500">Preview is on-demand. Generate one to inspect suggestions safely.</li> : null}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      Artifact status
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        Can generate: {selectedKind === "clean-sql" ? (exportStatus?.can_generate_clean_sql ? "yes" : "no") : selectedKind === "translated-sql" ? (exportStatus?.can_generate_translated_sql ? "yes" : "no") : "n/a"}
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        Stored artifact: {activeStoredArtifact?.artifact_id ? "yes" : "no"}
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        Validation status: {activeStoredArtifact?.validation_result?.validated_at ? "validated" : "pending"}
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        Simulation-ready: {exportStatus?.simulation_ready ? "yes" : "no"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Generated SQL Preview</span>
                    <textarea readOnly value={previewData?.preview || "Preview is generated on demand and sample-limited to avoid rebuilding a full artifact on tab switch."} className="min-h-[360px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Manual Final SQL Override</span>
                    <textarea
                      value={manualSql}
                      onChange={(event) => {
                        setManualSql(event.target.value);
                        setManualTouched(true);
                      }}
                      placeholder="Paste or edit final SQL here, then validate to store a manual artifact."
                      className="min-h-[360px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-6 text-slate-200 outline-none transition focus:border-teal-400/40"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <EmptyState title="Excel export selected" description="Excel export does not use the SQL cleaning workbench. Switch to Clean SQL or Translated SQL to prepare simulation-ready artifacts." />
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Artifact Store" description="Stored artifact metadata for this job.">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Original source SQL reference</div>
                  <div className="mt-2 text-white">{exportStatus?.artifacts?.original_source_sql_reference?.filename || workspace.sourceStatus.filename || "No data available yet"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Clean SQL artifact</div>
                  <div className="mt-2 text-white">{currentCleanArtifact?.created_at || "Not stored yet"}</div>
                  <div className="mt-1 text-xs text-slate-500">{currentCleanArtifact?.size_bytes ? `${currentCleanArtifact.size_bytes} bytes` : "Generate and store an artifact before running simulation."}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Translated SQL artifact</div>
                  <div className="mt-2 text-white">{currentTranslatedArtifact?.created_at || "Not stored yet"}</div>
                  <div className="mt-1 text-xs text-slate-500">{currentTranslatedArtifact?.size_bytes ? `${currentTranslatedArtifact.size_bytes} bytes` : "Requires generation"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Manual SQL artifact</div>
                  <div className="mt-2 text-white">{currentManualArtifact?.created_at || "Not stored yet"}</div>
                </div>
                {storedArtifacts.length ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Stored artifacts</div>
                    <div className="mt-3 space-y-2">
                      {storedArtifacts.map((artifact) => (
                        <div key={artifact.artifact_id} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm text-white">
                                {artifact.kind} · {artifact.target_dialect} · {artifact.export_mode}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {artifact.status} · {artifact.size_bytes || 0} bytes · {artifact.validation_status || "pending"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={artifact.simulation_ready ? "completed" : artifact.status === "failed" ? "error" : artifact.status === "running" ? "processing" : "idle"}>
                                {artifact.simulation_ready ? "Simulation-ready" : artifact.status}
                              </StatusBadge>
                              <button
                                className={workspaceActions.secondary}
                                onClick={() => void handleSelectArtifact(artifact.artifact_id)}
                                disabled={!artifact.simulation_ready}
                              >
                                Use for simulation
                              </button>
                            </div>
                          </div>
                          {(artifact.status === "queued" || artifact.status === "running") ? (
                            <div className="mt-2 text-xs text-amber-200">Queued artifact is not executable yet. Wait until it becomes Completed.</div>
                          ) : null}
                          {artifact.error ? <div className="mt-2 text-xs text-rose-300">{artifact.error}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Validation Result" description="Artifacts are executable for simulation only after generation, and download is gated by validation or explicit override.">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <span>Current state</span>
                  <StatusBadge status={artifactForDownload?.validation_result?.validated_at || validationResult?.valid ? "completed" : allowOverride ? "warning" : "idle"}>
                    {artifactForDownload?.validation_result?.validated_at || validationResult?.valid ? "Validated" : allowOverride ? "Override armed" : "Awaiting validation"}
                  </StatusBadge>
                </div>
                {storedArtifacts.length ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
                    Stored artifacts: {storedArtifacts.length}. Latest generation status: {storedArtifacts[0]?.status || "idle"}.
                  </div>
                ) : null}
                {validationResult?.warnings?.length ? validationResult.warnings.map((warning) => <div key={warning} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-100">{warning}</div>) : null}
                {validationResult?.blocking_issues?.length ? validationResult.blocking_issues.map((issue) => <div key={issue} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">{issue}</div>) : null}
                {!validationResult && <div className="text-slate-500">Generate and store an artifact first, then validate it before download. Simulation only requires the stored artifact; download remains gated by validation or explicit override.</div>}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

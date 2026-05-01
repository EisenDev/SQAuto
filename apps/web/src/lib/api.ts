// apps/web/src/lib/api.ts
/**
 * Minimal API utility layer for calling the SQAuto backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const message =
        typeof detail === "string"
          ? detail
          : detail?.message || data.message || `API error: ${res.status}`;
      const error = new Error(message);
      (error as any).error_type = typeof detail === "object" ? detail?.error_type : data.error_type;
      (error as any).detail = detail;
      (error as any).hint = typeof detail === "object" ? detail?.hint : data.hint;
      (error as any).target = typeof detail === "object" ? detail?.target : data.target;
      (error as any).technical_details = typeof detail === "object" ? detail?.technical_details : data.technical_details;
      throw error;
    }
    return data;
  } else {
    // Non-JSON error (likely 500 HTML)
    const text = await res.text();
    const shortText = text.substring(0, 100).replace(/<[^>]*>?/gm, '');
    throw new Error(`Server returned non-JSON response (${res.status}). ${shortText ? `Snippet: "${shortText}..."` : "Check API logs."}`);
  }
}

export type JobStatus = 'uploaded' | 'restoring' | 'analyzing' | 'failed' | 'completed';

export interface Job {
  id: string;
  job_id?: string; // Some endpoints return job_id instead of id
  status: JobStatus;
  filename: string;
  original_filename?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  log?: string;
  profile?: Record<string, any>;
  file_size?: number;
}

export interface ProjectSourceStatus {
  project_id: string;
  active_job_id: string | null;
  status: JobStatus | null;
  filename: string | null;
  file_size: number;
  dialect: string | null;
  metrics: {
    tables: number;
    rows: number;
    data_size_mb: number;
  };
  updated_at: string | null;
}

export interface ProjectLogsResponse {
  project_id: string;
  active_job_id: string | null;
  page: number;
  limit: number;
  total_lines: number;
  lines: string[];
}

export interface JobProfileSummary {
  job_id: string;
  project_id: string;
  table_count: number;
  row_count: number;
  data_size_mb: number;
  dialect: string | null;
  extraction_duration?: number | null;
  created_at: string | null;
  updated_at: string | null;
  filename: string;
  status: string;
  profile: Record<string, any>;
}

export interface JobLogsResponse {
  job_id: string;
  project_id: string;
  page: number;
  limit: number;
  total_lines: number;
  lines: string[];
}

export interface WorkspaceTableSummary {
  name: string;
  row_count: number;
  column_count: number;
  primary_key: string | null;
}

export interface WorkspaceColumn {
  name: string;
  type: string;
  nullable?: boolean;
  primary?: boolean;
  foreign?: string | null;
}

export interface TableRowsResponse {
  table: string;
  columns: WorkspaceColumn[];
  rows: Record<string, unknown>[];
  limit: number;
  offset: number;
  total_estimate: number;
}

export interface SchemaGraphResponse {
  nodes: Array<{
    id: string;
    label: string;
    columns?: WorkspaceColumn[];
    primary_keys?: string[];
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    label: string;
    relation_type?: string;
    status?: string;
  }>;
}

export interface DiagnosticsResponse {
  job_id: string;
  project_id: string;
  pipeline_steps: Array<{ name: string; status: string; duration: string }>;
  row_processing_timeline: Array<{ label: string; rows: number; duration: number }>;
  largest_tables: Array<{ name: string; rows: number; size_mb: number }>;
  warnings: string[];
  errors: string[];
}

export interface QualityIssue {
  table: string;
  issue_type: string;
  severity: string;
  affected_rows: number;
  detail: string;
}

export interface QualityReportResponse {
  job_id: string;
  project_id: string;
  duplicate_count: number;
  null_risk_count: number;
  orphan_fk_count: number;
  type_mismatch_count: number;
  issues: QualityIssue[];
  raw_report?: Record<string, any> | null;
}

export interface MappingStateResponse {
  job_id: string;
  project_id: string;
  tables: Array<{
    table: string;
    columns: WorkspaceColumn[];
    saved_mappings: Record<string, string>;
    type_compatibility: Record<string, string>;
  }>;
}

export interface ExportStatusResponse {
  job_id: string;
  project_id: string;
  clean_sql_ready: boolean;
  translated_sql_ready: boolean;
  can_generate_clean_sql?: boolean;
  can_generate_translated_sql?: boolean;
  clean_sql_artifact_stored?: boolean;
  translated_sql_artifact_stored?: boolean;
  manual_sql_artifact_stored?: boolean;
  simulation_ready?: boolean;
  excel_ready: boolean;
  artifact_sizes: Record<string, number | null>;
  preview_available: boolean;
  dialect?: string | null;
  filename?: string | null;
  validation?: {
    blocked: boolean;
    warnings: string[];
    blocking_issues: string[];
    unmapped_columns: string[];
  };
  artifacts?: {
    original_source_sql_reference?: Record<string, any> | null;
    cleaned_sql_version?: Record<string, any> | null;
    translated_sql_version?: Record<string, any> | null;
    manual_edits_version?: Record<string, any> | null;
    validation_result?: Record<string, any> | null;
    created_at?: string | null;
  };
  export_variants?: {
    clean_sql?: {
      can_generate: boolean;
      artifact_stored: boolean;
      requires_generation: boolean;
      latest_artifact?: Record<string, any> | null;
    };
    translated_sql?: {
      can_generate: boolean;
      artifact_stored: boolean;
      requires_generation: boolean;
      latest_artifact?: Record<string, any> | null;
    };
    manual_sql?: {
      can_generate: boolean;
      artifact_stored: boolean;
      requires_generation: boolean;
      latest_artifact?: Record<string, any> | null;
    };
  };
  quality_summary?: Record<string, number>;
}

export interface ExportPreviewResponse {
  job_id: string;
  project_id: string;
  kind: string;
  preview: string;
  target_dialect?: string;
  export_mode?: string;
  warnings?: string[];
  blocking_issues?: string[];
  auto_fixes_applied?: string[];
  cleaning_suggestions?: string[];
  blocked?: boolean;
  unmapped_columns?: string[];
}

export interface ExportValidateResponse {
  job_id: string;
  project_id: string;
  kind: string;
  target_dialect: string;
  export_mode: string;
  valid: boolean;
  blocked: boolean;
  warnings: string[];
  blocking_issues: string[];
  unmapped_columns: string[];
  created_at: string;
  artifact_id?: string;
}

export interface ExportGenerateResponse {
  artifact_id: string;
  status: "queued" | "running" | "completed" | "failed";
}

export interface ExportArtifactRecord {
  id?: string;
  artifact_id: string;
  kind: "clean" | "translated" | "manual";
  target_dialect: string;
  export_mode: string;
  file_path?: string | null;
  size_bytes: number;
  statement_count: number;
  row_count: number;
  status: "queued" | "running" | "completed" | "failed";
  warnings?: string[];
  blocking_issues?: string[];
  unmapped_columns?: string[];
  auto_fixes_applied?: string[];
  validation_result?: {
    blocked: boolean;
    warnings: string[];
    blocking_issues: string[];
    unmapped_columns: string[];
    validated_at?: string | null;
  } | null;
  sample_rows_per_table?: number | null;
  sample_table_limit?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  error?: string | null;
  file_path_exists?: boolean;
  validation_status?: string;
  simulation_ready?: boolean;
}

export interface ExportArtifactsResponse {
  job_id: string;
  project_id: string;
  artifacts: ExportArtifactRecord[];
}

export interface MigrationTarget {
  id: string;
  project_id?: string | null;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  db_type?: string;
  ssl_mode?: string | null;
  is_active?: boolean;
  deleted_at?: string | null;
  has_history?: boolean;
  is_application_db?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ConnectionHintsResponse {
  backend_runtime: string;
  recommended_hosts: string[];
}

export interface MigrationRun {
  id: string;
  project_id?: string | null;
  source_job_id: string;
  target_id: string;
  mode: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  summary?: Record<string, any> | null;
}

export interface SimulationRunSummary {
  status: string;
  error_type?: string;
  message?: string | null;
  hint?: string | null;
  sql_source?: string | null;
  tables_total: number;
  tables_success: number;
  tables_failed: number;
  rows_expected: number;
  rows_inserted: number;
  diff: {
    missing_rows: number;
    extra_rows: number;
  };
  errors: string[];
  warnings: string[];
  execution_time: string;
  table_results: Array<{
    table: string;
    expected_rows: number;
    inserted_rows: number;
    status: string;
    errors: string[];
  }>;
  target?: {
    id?: string;
    name?: string;
    host?: string;
    port?: number;
    database_name?: string;
    db_type?: string;
    ssl_mode?: string;
  };
}

export interface SimulationRunResponse {
  id: string | null;
  project_id?: string | null;
  source_job_id: string;
  target_id: string | null;
  mode: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  summary: SimulationRunSummary | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TargetConnectionTestResponse {
  success: boolean;
  db_type: string | null;
  db_version: string | null;
  error: string | null;
  error_type?: string;
  message?: string | null;
  hint?: string | null;
  fields?: string[];
  settings?: Record<string, any> | null;
}

export interface SimulationLogEntry {
  id: string;
  level: string;
  table_name?: string | null;
  message: string;
  created_at?: string | null;
}

/** 
 * Upload a SQL dump file with real-time progress tracking.
 * Uses chunked uploads to bypass Cloudflare/Proxy limits.
 */
export async function uploadDump(
  file: File, 
  projectId: string,
  onProgress?: (progress: { loaded: number; total: number }) => void
): Promise<Job> {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = Math.random().toString(36).substring(7); // Temporary tracking ID

  let loadedTotal = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("filename", file.name);
    formData.append("chunkIndex", i.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("uploadId", uploadId);

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/upload/chunk`);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const currentLoaded = loadedTotal + event.loaded;
          onProgress({ loaded: currentLoaded, total: file.size });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`Chunk ${i} failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error(`Network Error on chunk ${i}`));
      xhr.send(formData);
    });

    loadedTotal += chunk.size;
  }

  // Finalize upload - trigger assembly and job creation
  return apiFetch<Job>(`/upload/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadId,
      filename: file.name,
      totalChunks,
      fileSize: file.size,
      projectId: projectId
    })
  });
}

/** List all jobs */
export async function listJobs(): Promise<Job[]> {
  return apiFetch<Job[]>("/jobs");
}

/** List jobs for a specific project */
export async function getProjectJobs(projectId: string): Promise<Job[]> {
  return apiFetch<Job[]>(`/projects/${projectId}/jobs`);
}

export async function getProjectSourceStatus(projectId: string): Promise<ProjectSourceStatus> {
  return apiFetch<ProjectSourceStatus>(`/projects/${projectId}/source-status`);
}

export async function getProjectActiveJob(projectId: string): Promise<Job | null> {
  return apiFetch<Job | null>(`/projects/${projectId}/active-job`);
}

export async function getProjectLogs(projectId: string, limit = 10, page = 1): Promise<ProjectLogsResponse> {
  return apiFetch<ProjectLogsResponse>(`/projects/${projectId}/logs?limit=${limit}&page=${page}`);
}

/** Get job details */
export async function getJob(jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}`);
}

export async function getJobProfile(jobId: string): Promise<JobProfileSummary> {
  return apiFetch<JobProfileSummary>(`/jobs/${jobId}/profile`);
}

export async function getJobLogs(jobId: string, limit = 10, page = 1): Promise<JobLogsResponse> {
  return apiFetch<JobLogsResponse>(`/jobs/${jobId}/logs?limit=${limit}&page=${page}`);
}

export async function getJobTables(jobId: string): Promise<WorkspaceTableSummary[]> {
  return apiFetch<WorkspaceTableSummary[]>(`/jobs/${jobId}/tables`);
}

export async function getJobTableRows(jobId: string, tableName: string, limit = 50, offset = 0, q = ""): Promise<TableRowsResponse> {
  const search = q ? `&q=${encodeURIComponent(q)}` : "";
  return apiFetch<TableRowsResponse>(`/jobs/${jobId}/tables/${encodeURIComponent(tableName)}/rows?limit=${limit}&offset=${offset}${search}`);
}

export async function getJobTableColumns(jobId: string, tableName: string): Promise<WorkspaceColumn[]> {
  return apiFetch<WorkspaceColumn[]>(`/jobs/${jobId}/tables/${encodeURIComponent(tableName)}/columns`);
}

export async function getJobSchemaGraph(jobId: string): Promise<SchemaGraphResponse> {
  return apiFetch<SchemaGraphResponse>(`/jobs/${jobId}/schema-graph`);
}

export async function getJobDiagnostics(jobId: string): Promise<DiagnosticsResponse> {
  return apiFetch<DiagnosticsResponse>(`/jobs/${jobId}/diagnostics`);
}

export async function getJobQualityReport(jobId: string): Promise<QualityReportResponse> {
  return apiFetch<QualityReportResponse>(`/jobs/${jobId}/quality-report`);
}

export async function getJobMappingState(jobId: string): Promise<MappingStateResponse> {
  return apiFetch<MappingStateResponse>(`/jobs/${jobId}/mapping-state`);
}

export async function getJobExportStatus(jobId: string): Promise<ExportStatusResponse> {
  return apiFetch<ExportStatusResponse>(`/jobs/${jobId}/exports/status`);
}

export async function getJobExportPreview(
  jobId: string,
  options: { kind: string; target?: string; exportMode?: string; overrideValidation?: boolean },
): Promise<ExportPreviewResponse> {
  const params = new URLSearchParams({
    kind: options.kind,
    target: options.target || "postgresql",
    export_mode: options.exportMode || "full",
    override_validation: String(Boolean(options.overrideValidation)),
  });
  return apiFetch<ExportPreviewResponse>(`/jobs/${jobId}/exports/preview?${params.toString()}`);
}

export async function validateJobExport(
  jobId: string,
  payload: { kind: string; target?: string; exportMode?: string; overrideValidation?: boolean; manualSql?: string },
): Promise<ExportValidateResponse> {
  return apiFetch<ExportValidateResponse>(`/jobs/${jobId}/exports/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: payload.kind,
      target: payload.target || "postgresql",
      export_mode: payload.exportMode || "full",
      override_validation: Boolean(payload.overrideValidation),
      manual_sql: payload.manualSql ?? null,
    }),
  });
}

export async function generateJobExportArtifact(
  jobId: string,
  payload: {
    kind: "clean" | "translated";
    target?: string;
    exportMode?: string;
    overrideValidation?: boolean;
    sampleRowsPerTable?: number | null;
    sampleTableLimit?: number | null;
  },
): Promise<ExportGenerateResponse> {
  return apiFetch<ExportGenerateResponse>(`/jobs/${jobId}/exports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: payload.kind,
      target: payload.target || "postgresql",
      export_mode: payload.exportMode || "full",
      override_validation: Boolean(payload.overrideValidation),
      sample_rows_per_table: payload.sampleRowsPerTable ?? null,
      sample_table_limit: payload.sampleTableLimit ?? null,
    }),
  });
}

export async function listJobExportArtifacts(jobId: string): Promise<ExportArtifactsResponse> {
  return apiFetch<ExportArtifactsResponse>(`/jobs/${jobId}/exports/artifacts`);
}

export async function validateStoredJobExportArtifact(jobId: string, artifactId: string): Promise<ExportArtifactRecord> {
  return apiFetch<ExportArtifactRecord>(`/jobs/${jobId}/exports/artifacts/${artifactId}/validate`, {
    method: "POST",
  });
}

export async function selectStoredJobExportArtifact(jobId: string, artifactId: string): Promise<ExportArtifactRecord> {
  return apiFetch<ExportArtifactRecord>(`/jobs/${jobId}/exports/artifacts/${artifactId}/select`, {
    method: "POST",
  });
}

export async function listMigrationTargets(projectId: string): Promise<MigrationTarget[]> {
  return apiFetch<MigrationTarget[]>(`/migration/targets?project_id=${projectId}`);
}

export async function createMigrationTarget(projectId: string, payload: Record<string, any>): Promise<MigrationTarget> {
  return apiFetch<MigrationTarget>(`/migration/targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, project_id: projectId }),
  });
}

export async function testMigrationTargetConnection(payload: Record<string, any>): Promise<TargetConnectionTestResponse> {
  return apiFetch<TargetConnectionTestResponse>(`/migration/targets/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function testSavedMigrationTarget(projectId: string, targetId: string): Promise<TargetConnectionTestResponse> {
  return apiFetch<TargetConnectionTestResponse>(`/migration/targets/${targetId}/test?project_id=${projectId}`, {
    method: "POST",
  });
}

export async function deleteMigrationTarget(projectId: string, targetId: string): Promise<{ success: boolean; status: string; id: string; error_type?: string; message?: string }> {
  return apiFetch<{ success: boolean; status: string; id: string; error_type?: string; message?: string }>(`/migration/targets/${targetId}?project_id=${projectId}`, { method: "DELETE" });
}

export async function getConnectionHints(): Promise<ConnectionHintsResponse> {
  return apiFetch<ConnectionHintsResponse>(`/migration/system/connection-hints`);
}

export async function listMigrationRuns(sourceJobId: string): Promise<MigrationRun[]> {
  return apiFetch<MigrationRun[]>(`/migration/runs?source_job_id=${sourceJobId}`);
}

export async function startDryRun(sourceJobId: string, targetId: string): Promise<MigrationRun> {
  return apiFetch<MigrationRun>(`/migration/runs/dry-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_job_id: sourceJobId, target_id: targetId }),
  });
}

export async function startJobSimulation(
  jobId: string,
  payload: { targetId: string; mode?: string; debugKeepSchema?: boolean },
): Promise<SimulationRunResponse> {
  return apiFetch<SimulationRunResponse>(`/jobs/${jobId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_id: payload.targetId,
      mode: payload.mode || "dry-run",
      debug_keep_schema: Boolean(payload.debugKeepSchema),
    }),
  });
}

export async function getJobSimulationResult(jobId: string): Promise<SimulationRunResponse> {
  return apiFetch<SimulationRunResponse>(`/jobs/${jobId}/simulation/result`);
}

export async function getJobSimulationLogs(jobId: string, limit = 20): Promise<SimulationLogEntry[]> {
  return apiFetch<SimulationLogEntry[]>(`/jobs/${jobId}/simulation/logs?limit=${limit}`);
}

/** Set a job as active */
export async function activateJob(jobId: string): Promise<void> {
  await apiFetch(`/jobs/${jobId}/activate`, { method: "POST" });
}

/** Reset all project data */
export async function resetProject(projectId: string): Promise<void> {
  await apiFetch(`/projects/${projectId}/reset`, { method: "POST" });
}

/** Trigger dump restore for a job */
export async function restoreJob(jobId: string): Promise<{ job_id: string; status: JobStatus }> {
  return apiFetch(`/jobs/${jobId}/restore`, { method: "POST" });
}

/** Trigger profiling results for a job */
export async function profileJob(jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}/profile`);
}

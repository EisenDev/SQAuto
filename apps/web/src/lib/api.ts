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
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export type JobStatus = 'uploaded' | 'restoring' | 'analyzing' | 'failed' | 'completed';

export interface Job {
  id: string;
  job_id?: string; // Some endpoints return job_id instead of id
  status: JobStatus;
  filename: string;
  created_at?: string;
  updated_at?: string;
  log?: string;
  profile?: Record<string, any>;
}

/** Upload a SQL dump file */
export async function uploadDump(file: File): Promise<Job> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<Job>("/upload", { method: "POST", body: formData });
}

/** List all jobs */
export async function listJobs(): Promise<Job[]> {
  return apiFetch<Job[]>("/jobs");
}

/** Get job details */
export async function getJob(jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}`);
}

/** Trigger dump restore for a job */
export async function restoreJob(jobId: string): Promise<{ job_id: string; status: JobStatus }> {
  return apiFetch(`/jobs/${jobId}/restore`, { method: "POST" });
}

/** Trigger profiling results for a job */
export async function profileJob(jobId: string): Promise<Job> {
  return apiFetch<Job>(`/jobs/${jobId}/profile`);
}

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
      throw new Error(data.detail || data.message || `API error: ${res.status}`);
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
  created_at?: string;
  updated_at?: string;
  log?: string;
  profile?: Record<string, any>;
  file_size?: number;
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

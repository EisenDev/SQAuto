"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getProjectSourceStatus, Job, JobStatus, ProjectSourceStatus } from "@/lib/api";

const ACTIVE_POLL_STATUSES: JobStatus[] = ["uploaded", "restoring", "analyzing"];
const STOPPED_STATUSES: JobStatus[] = ["completed", "failed"];
const BASE_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 60000;

function toJobSummary(status: ProjectSourceStatus | null): Job | null {
  if (!status?.active_job_id || !status.status) {
    return null;
  }

  return {
    id: status.active_job_id,
    job_id: status.active_job_id,
    status: status.status,
    filename: status.filename || "",
    original_filename: status.filename || undefined,
    is_active: true,
    file_size: status.file_size,
    updated_at: status.updated_at || undefined,
    profile: {
      metadata: {
        flavor: status.dialect,
        table_count: status.metrics.tables,
        total_rows: status.metrics.rows,
        data_size_mb: status.metrics.data_size_mb,
      },
    },
  };
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function debugLog(message: string, payload?: Record<string, unknown>) {
  if (!isDev()) return;
  if (payload) {
    console.debug(`[useActiveJobStatus] ${message}`, payload);
    return;
  }
  console.debug(`[useActiveJobStatus] ${message}`);
}

export function useActiveJobStatus(projectId?: string) {
  const [sourceStatus, setSourceStatus] = useState<ProjectSourceStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestInFlightRef = useRef(false);
  const cancelledRef = useRef(false);
  const failureCountRef = useRef(0);
  const sourceStatusRef = useRef<ProjectSourceStatus | null>(null);

  const clearScheduledPoll = useCallback((reason: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      debugLog("polling stopped", { reason });
    }
  }, []);

  const scheduleNextPoll = useCallback((delayMs: number, reason: string, runner: () => void) => {
    clearScheduledPoll(reason);
    debugLog("polling started", {
      endpoint: `/projects/${projectId}/source-status`,
      interval_ms: delayMs,
      reason,
    });
    timerRef.current = setTimeout(runner, Math.max(delayMs, BASE_INTERVAL_MS));
  }, [clearScheduledPoll, projectId]);

  const fetchStatus = useCallback(async (): Promise<ProjectSourceStatus | null> => {
    if (!projectId || requestInFlightRef.current || cancelledRef.current) {
      return null;
    }
    if (typeof document !== "undefined" && document.hidden) {
      clearScheduledPoll("document_hidden");
      return null;
    }

    requestInFlightRef.current = true;
    debugLog("endpoint called", { endpoint: `/projects/${projectId}/source-status` });

    try {
      const nextStatus = await getProjectSourceStatus(projectId);
      if (cancelledRef.current) return null;

      failureCountRef.current = 0;
      setConsecutiveFailures(0);
      setWarning(null);
      setError(null);
      setSourceStatus(nextStatus);
      sourceStatusRef.current = nextStatus;
      setLoading(false);
      return nextStatus;
    } catch (err) {
      if (cancelledRef.current) return null;

      failureCountRef.current += 1;
      const nextFailures = failureCountRef.current;
      setConsecutiveFailures(nextFailures);
      setLoading(false);

      const message = err instanceof Error ? err.message : "Unable to retrieve project source status.";
      if (nextFailures >= 3) {
        setError(message);
      } else {
        setWarning("Temporary sync issue. Retrying...");
      }
      return null;
    } finally {
      requestInFlightRef.current = false;
    }
  }, [clearScheduledPoll, projectId]);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    cancelledRef.current = false;
    failureCountRef.current = 0;
    setConsecutiveFailures(0);
    setWarning(null);
    setError(null);
    setSourceStatus(null);
    sourceStatusRef.current = null;
    setLoading(Boolean(projectId));

    if (!projectId) {
      clearScheduledPoll("missing_project");
      return () => {
        cancelledRef.current = true;
      };
    }

    const run = async () => {
      const latestStatus = await fetchStatus();

      if (cancelledRef.current) return;

      const currentStatus = latestStatus?.status ?? sourceStatusRef.current?.status ?? null;
      const shouldPoll =
        currentStatus ? ACTIVE_POLL_STATUSES.includes(currentStatus) : failureCountRef.current > 0;

      if (currentStatus && STOPPED_STATUSES.includes(currentStatus)) {
        clearScheduledPoll(`status_${currentStatus}`);
        return;
      }

      if (shouldPoll) {
        const failureDelay = Math.min(BASE_INTERVAL_MS * 2 ** Math.max(failureCountRef.current - 1, 0), MAX_BACKOFF_MS);
        scheduleNextPoll(failureDelay, "active_status", run);
      } else {
        clearScheduledPoll("idle");
      }
    };

    run();

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearScheduledPoll("visibility_hidden");
        return;
      }
      void fetchStatus();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelledRef.current = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearScheduledPoll("cleanup");
    };
  }, [clearScheduledPoll, fetchStatus, projectId, scheduleNextPoll]);

  const activeJob = useMemo(() => toJobSummary(sourceStatus), [sourceStatus]);
  const updateSourceStatus = useCallback((nextStatus: ProjectSourceStatus | null) => {
    sourceStatusRef.current = nextStatus;
    setSourceStatus(nextStatus);
  }, []);

  return {
    activeJob,
    sourceStatus,
    loading,
    warning,
    error,
    consecutiveFailures,
    refresh,
    setSourceStatus: updateSourceStatus,
  };
}

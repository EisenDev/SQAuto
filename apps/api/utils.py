import logging
import time
from typing import Any, Optional

from fastapi import HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger("sqauto.api")

RESOURCE_EXHAUSTION_PATTERNS = (
    "connection refused",
    "max connections",
    "too many clients",
    "not accepting connections",
    "hot standby is disabled",
    "timeout",
    "connection timed out",
    "connection refused",
    "remaining connection slots",
)


def is_database_resource_exhausted_message(message: str) -> bool:
    lowered = (message or "").lower()
    return any(pattern in lowered for pattern in RESOURCE_EXHAUSTION_PATTERNS)


def database_resource_exhausted_response(status_code: int = 503) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error_type": "database_resource_exhausted",
            "message": "Database resources are currently exhausted. SQAuto will retry with backoff. Heavy staging should not run on Supabase free tier.",
        },
    )


def raise_if_database_resource_exhausted(exc: Exception) -> None:
    if is_database_resource_exhausted_message(str(exc)):
        raise HTTPException(
            status_code=503,
            detail="Database resources are currently exhausted. SQAuto will retry with backoff. Heavy staging should not run on Supabase free tier.",
        )


def summarize_job_metrics(job: Any) -> dict[str, float | int]:
    metadata = ((getattr(job, "profile", None) or {}).get("metadata") or {})
    return {
        "tables": int(metadata.get("table_count") or 0),
        "rows": int(metadata.get("total_rows") or 0),
        "data_size_mb": float(metadata.get("data_size_mb") or metadata.get("extracted_size_mb") or 0),
    }


def build_source_status(project_id: str, job: Any | None) -> dict[str, Any]:
    if not job:
        return {
            "project_id": project_id,
            "active_job_id": None,
            "status": None,
            "filename": None,
            "file_size": 0,
            "dialect": None,
            "metrics": {
                "tables": 0,
                "rows": 0,
                "data_size_mb": 0,
            },
            "updated_at": None,
        }

    metadata = ((getattr(job, "profile", None) or {}).get("metadata") or {})
    return {
        "project_id": project_id,
        "active_job_id": str(job.id),
        "status": job.status.value if hasattr(job.status, "value") else job.status,
        "filename": job.original_filename or job.filename,
        "file_size": job.file_size or 0,
        "dialect": metadata.get("flavor") or metadata.get("dialect"),
        "metrics": summarize_job_metrics(job),
        "updated_at": job.updated_at.isoformat() if getattr(job, "updated_at", None) else None,
    }


def paginate_log_text(log_text: Optional[str], *, limit: int, page: int) -> tuple[list[str], int]:
    lines = [line for line in (log_text or "").splitlines() if line.strip()]
    total_lines = len(lines)
    offset = max(page - 1, 0) * limit
    return lines[offset:offset + limit], total_lines


def log_endpoint_audit(
    *,
    path: str,
    project_id: Optional[str],
    job_id: Optional[str],
    started_at: float,
    row_count: int,
) -> None:
    execution_time_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "endpoint_audit path=%s project_id=%s job_id=%s timestamp=%s execution_time_ms=%s row_count=%s",
        path,
        project_id or "-",
        job_id or "-",
        time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        execution_time_ms,
        row_count,
    )

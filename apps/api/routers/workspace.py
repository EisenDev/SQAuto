import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from apps.api.database import get_db, staging_engine
from apps.api.models import Job, JobStatus
from apps.api.utils import (
    build_source_status,
    log_endpoint_audit,
    paginate_log_text,
    raise_if_database_resource_exhausted,
)

router = APIRouter()

ACTIVE_STAGING_STATUSES = {
    JobStatus.UPLOADED.value,
    JobStatus.RESTORING.value,
    JobStatus.ANALYZING.value,
    JobStatus.COMPLETED.value,
}


def _job_status_value(job: Job) -> str:
    return job.status.value if hasattr(job.status, "value") else str(job.status)


def _get_job_or_404(job_id: str, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _ensure_job_has_live_staging(job: Job, db: Session) -> None:
    active_staging_job = (
        db.query(Job)
        .filter(Job.project_id == job.project_id)
        .order_by(Job.is_active.desc(), Job.updated_at.desc(), Job.created_at.desc())
        .first()
    )
    if active_staging_job and str(active_staging_job.id) != str(job.id):
        raise HTTPException(status_code=410, detail="DATA_RETIRED")


def _metadata(job: Job) -> dict:
    return ((job.profile or {}).get("metadata") or {}) if job.profile else {}


def _profile_tables(job: Job) -> dict:
    return ((job.profile or {}).get("tables") or {}) if job.profile else {}


def _table_names(job: Job) -> list[str]:
    profiled = list(_profile_tables(job).keys())
    if profiled:
        return profiled
    inspector = inspect(staging_engine)
    return inspector.get_table_names(schema="staging")


def _safe_parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _format_duration(seconds: float | int | None) -> str:
    if not seconds or seconds <= 0:
        return "--"
    seconds = int(seconds)
    mins, secs = divmod(seconds, 60)
    return f"{mins}m {secs}s" if mins else f"{secs}s"


def _build_pipeline(job: Job) -> list[dict]:
    status = _job_status_value(job)
    meta = _metadata(job)
    created_at = job.created_at
    updated_at = job.updated_at or created_at
    restore_start = _safe_parse_dt(job.profile.get("restore_start_time")) if job.profile else None
    total_duration = max(0, int((updated_at - created_at).total_seconds())) if created_at and updated_at else 0
    restore_duration = max(0, int((updated_at - restore_start).total_seconds())) if restore_start and updated_at else None

    def step_status(index: int) -> str:
        order = ["uploaded", "restoring", "analyzing", "completed"]
        current_index = order.index(status) if status in order else -1
        if status == "failed":
            if index <= 1:
                return "completed"
            if index == 2 and restore_start:
                return "failed"
            return "failed"
        if current_index >= index:
            return "completed" if index < current_index or status == "completed" else "processing"
        return "idle"

    return [
        {"name": "Upload", "status": "completed" if status else "idle", "duration": _format_duration(5)},
        {"name": "Decompression", "status": step_status(1), "duration": _format_duration(8 if job.is_compressed else 0)},
        {"name": "Restore", "status": step_status(1 if status == "restoring" else 2), "duration": _format_duration(restore_duration or total_duration)},
        {"name": "Parsing", "status": "processing" if status == "analyzing" else ("completed" if status == "completed" else "idle"), "duration": _format_duration(total_duration // 2 if total_duration else None)},
        {"name": "Analysis", "status": "completed" if status == "completed" else ("failed" if status == "failed" else "idle"), "duration": _format_duration(total_duration)},
    ]


def _list_tables(job: Job) -> list[dict]:
    inspector = inspect(staging_engine)
    profile_tables = _profile_tables(job)
    tables: list[dict] = []
    with staging_engine.connect() as conn:
        for table_name in _table_names(job):
            try:
                columns = inspector.get_columns(table_name, schema="staging")
                pk = inspector.get_pk_constraint(table_name, schema="staging").get("constrained_columns", [])
                row_count = conn.execute(text(f'SELECT COUNT(*) FROM staging."{table_name}"')).scalar() or 0
                tables.append(
                    {
                        "name": table_name,
                        "row_count": int(row_count),
                        "column_count": len(columns),
                        "primary_key": (profile_tables.get(table_name, {}) or {}).get("primary_keys", pk or [None])[0],
                    }
                )
            except Exception:
                continue
    return tables


def _get_table_columns(job: Job, table_name: str) -> list[dict]:
    inspector = inspect(staging_engine)
    profile_table = (_profile_tables(job).get(table_name) or {})
    profile_columns = {col.get("name"): col for col in profile_table.get("columns", []) if isinstance(col, dict)}
    primary_keys = set(profile_table.get("primary_keys") or inspector.get_pk_constraint(table_name, schema="staging").get("constrained_columns", []))
    foreign_keys = {fk.get("constrained_columns", [None])[0]: fk for fk in inspector.get_foreign_keys(table_name, schema="staging")}
    columns = []
    for col in inspector.get_columns(table_name, schema="staging"):
        fk = foreign_keys.get(col["name"])
        columns.append(
            {
                "name": col["name"],
                "type": str(profile_columns.get(col["name"], {}).get("type") or col["type"]),
                "nullable": bool(col.get("nullable", True)),
                "primary": col["name"] in primary_keys,
                "foreign": f"{fk.get('referred_table')}.{(fk.get('referred_columns') or [None])[0]}" if fk else None,
            }
        )
    return columns


@router.get("/projects/{project_id}/active-job")
def get_project_active_job(project_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = (
            db.query(Job)
            .filter(Job.project_id == project_id)
            .order_by(Job.is_active.desc(), Job.updated_at.desc(), Job.created_at.desc())
            .first()
        )
        if not job:
            return None
        payload = {
            "id": str(job.id),
            "projectId": str(job.project_id),
            "filename": job.filename,
            "original_filename": job.original_filename,
            "status": _job_status_value(job),
            "file_size": job.file_size,
            "is_active": job.is_active,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "log": job.log,
            "profile": job.profile,
        }
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(job.project_id),
            job_id=str(job.id),
            started_at=started_at,
            row_count=1,
        )
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/profile")
def get_job_profile_summary(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        meta = _metadata(job)
        payload = {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "table_count": int(meta.get("table_count") or len(_profile_tables(job))),
            "row_count": int(meta.get("total_rows") or 0),
            "data_size_mb": float(meta.get("data_size_mb") or meta.get("extracted_size_mb") or 0),
            "dialect": meta.get("flavor") or meta.get("dialect"),
            "extraction_duration": meta.get("duration_sec"),
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            "filename": job.original_filename or job.filename,
            "status": _job_status_value(job),
            "profile": job.profile or {},
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/logs")
def get_job_logs(job_id: str, request: Request, limit: int = 10, page: int = 1, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    limit = max(1, min(limit, 100))
    page = max(1, page)
    try:
        job = _get_job_or_404(job_id, db)
        lines, total_lines = paginate_log_text(job.log or "", limit=limit, page=page)
        payload = {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "page": page,
            "limit": limit,
            "total_lines": total_lines,
            "lines": lines,
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(lines))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/tables")
def get_job_tables(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        _ensure_job_has_live_staging(job, db)
        payload = _list_tables(job)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/tables/{table_name}/rows")
def get_job_table_rows(
    job_id: str,
    table_name: str,
    request: Request,
    limit: int = Query(default=50, le=50, ge=1),
    offset: int = Query(default=0, ge=0),
    q: str | None = None,
    db: Session = Depends(get_db),
):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        _ensure_job_has_live_staging(job, db)
        columns = _get_table_columns(job, table_name)
        column_names = [col["name"] for col in columns]
        where_clause = ""
        params: dict[str, object] = {"limit": limit, "offset": offset}
        if q:
            search_terms = []
            for idx, column in enumerate(column_names):
                name = f"q_{idx}"
                search_terms.append(f'"{column}"::text ILIKE :{name}')
                params[name] = f"%{q}%"
            where_clause = f"WHERE {' OR '.join(search_terms)}"

        with staging_engine.connect() as conn:
            total = conn.execute(text(f'SELECT COUNT(*) FROM staging."{table_name}" {where_clause}'), params).scalar() or 0
            result = conn.execute(
                text(f'SELECT * FROM staging."{table_name}" {where_clause} LIMIT :limit OFFSET :offset'),
                params,
            )
            rows = [dict(zip(result.keys(), row)) for row in result.fetchall()]

        payload = {
            "table": table_name,
            "columns": columns,
            "rows": rows,
            "limit": limit,
            "offset": offset,
            "total_estimate": int(total),
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(rows))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/tables/{table_name}/columns")
def get_job_table_columns(job_id: str, table_name: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        _ensure_job_has_live_staging(job, db)
        payload = _get_table_columns(job, table_name)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/schema-graph")
def get_job_schema_graph(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        graph = ((job.profile or {}).get("graph") or {}) if job.profile else {}
        payload = {
            "nodes": graph.get("nodes") or [],
            "edges": graph.get("edges") or [],
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload["nodes"]) + len(payload["edges"]))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/diagnostics")
def get_job_diagnostics(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        if _job_status_value(job) in ACTIVE_STAGING_STATUSES:
            _ensure_job_has_live_staging(job, db)
        tables = _list_tables(job) if _job_status_value(job) in ACTIVE_STAGING_STATUSES else []
        meta = _metadata(job)
        total_rows = int(meta.get("total_rows") or sum(item["row_count"] for item in tables))
        updated_at = job.updated_at or job.created_at
        elapsed = max(1, int((updated_at - job.created_at).total_seconds())) if updated_at and job.created_at else 1
        timeline = [
            {"label": "start", "rows": 0, "duration": 0},
            {"label": "mid", "rows": total_rows // 2, "duration": max(1, elapsed // 2)},
            {"label": "end", "rows": total_rows, "duration": elapsed},
        ] if total_rows > 0 else []
        warnings = [line for line in (job.log or "").splitlines() if "warn" in line.lower()]
        errors = [line for line in (job.log or "").splitlines() if any(token in line.lower() for token in ("error", "failed", "exception"))]
        payload = {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "pipeline_steps": _build_pipeline(job),
            "row_processing_timeline": timeline,
            "largest_tables": sorted(
                [{"name": item["name"], "rows": item["row_count"], "size_mb": round((item["row_count"] * 0.0005), 2)} for item in tables],
                key=lambda item: item["rows"],
                reverse=True,
            )[:10],
            "warnings": warnings[:20],
            "errors": errors[:20],
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload["largest_tables"]))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/quality-report")
def get_job_quality_report(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        profile = job.profile or {}
        cached = profile.get("quality_report")
        if not cached and _job_status_value(job) == "completed":
            from services.data_intelligence.integrity_checker import run_integrity_checks

            report = run_integrity_checks(db, str(job.id))
            issues = []
            for item in report.get("duplicate_keys", []):
                issues.append(
                    {
                        "table": item["table"],
                        "issue_type": "Duplicate Rows",
                        "severity": "high",
                        "affected_rows": int(item.get("count") or 0),
                        "detail": f"Duplicate primary key groups on {', '.join(item.get('pk_columns') or [])}",
                    }
                )
            for item in report.get("null_risks", []):
                issues.append(
                    {
                        "table": item["table"],
                        "issue_type": "Null Violations",
                        "severity": "medium",
                        "affected_rows": int(item.get("null_count") or 0),
                        "detail": f"{item.get('column')} is {item.get('null_percentage')}% null in sampled rows",
                    }
                )
            for item in report.get("orphan_foreign_keys", []):
                issues.append(
                    {
                        "table": item["table"],
                        "issue_type": "Orphan Records",
                        "severity": "high",
                        "affected_rows": int(item.get("count") or 0),
                        "detail": f"{item.get('column')} references missing {item.get('references')}",
                    }
                )
            cached = {
                "job_id": str(job.id),
                "project_id": str(job.project_id),
                "duplicate_count": len(report.get("duplicate_keys", [])),
                "null_risk_count": len(report.get("null_risks", [])),
                "orphan_fk_count": len(report.get("orphan_foreign_keys", [])),
                "type_mismatch_count": 0,
                "issues": issues,
                "raw_report": report,
            }
            profile["quality_report"] = cached
            job.profile = profile
            flag_modified(job, "profile")
            db.commit()
        payload = cached or {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "duplicate_count": 0,
            "null_risk_count": 0,
            "orphan_fk_count": 0,
            "type_mismatch_count": 0,
            "issues": [],
            "raw_report": None,
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload.get("issues") or []))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/mapping-state")
def get_job_mapping_state(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        _ensure_job_has_live_staging(job, db)
        tables = []
        saved_mappings = ((job.profile or {}).get("mapping_state") or {}) if job.profile else {}
        for table_name in _table_names(job):
            columns = _get_table_columns(job, table_name)
            tables.append(
                {
                    "table": table_name,
                    "columns": columns,
                    "saved_mappings": saved_mappings.get(table_name, {}),
                    "type_compatibility": {
                        column["name"]: "unknown" for column in columns
                    },
                }
            )
        payload = {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "tables": tables,
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(tables))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/exports/status")
def get_job_export_status(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        meta = _metadata(job)
        completed = _job_status_value(job) == "completed"
        payload = {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "clean_sql_ready": completed,
            "translated_sql_ready": False,
            "excel_ready": completed,
            "artifact_sizes": {
                "clean_sql_bytes": None,
                "translated_sql_bytes": None,
                "excel_bytes": None,
            },
            "preview_available": completed,
            "dialect": meta.get("flavor") or meta.get("dialect"),
            "filename": job.original_filename or job.filename,
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/exports/preview")
def get_job_export_preview(job_id: str, request: Request, kind: str = "clean-sql", db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        table_map = _profile_tables(job)
        if kind == "clean-sql":
            statements = []
            for table_name, info in table_map.items():
                column_defs = []
                for column in info.get("columns", [])[:20]:
                    col_name = column.get("name", "column")
                    col_type = column.get("type", "text")
                    column_defs.append(f'  "{col_name}" {col_type}')
                if info.get("primary_keys"):
                    pk = ", ".join(f'"{col}"' for col in info["primary_keys"])
                    column_defs.append(f"  PRIMARY KEY ({pk})")
                if column_defs:
                    statements.append(f'CREATE TABLE public."{table_name}" (\n' + ",\n".join(column_defs) + "\n);")
            preview = "\n\n".join(statements[:8]) or "-- Generate export first"
        elif kind == "excel":
            meta = _metadata(job)
            preview = (
                f"Workbook Preview\n"
                f"- Source file: {job.original_filename or job.filename}\n"
                f"- Tables: {meta.get('table_count') or len(table_map)}\n"
                f"- Rows: {meta.get('total_rows') or 0}\n"
                f"- Sheets: 00_Summary, one per table, AI_Summary"
            )
        else:
            preview = "Generate export first"
        payload = {"job_id": str(job.id), "project_id": str(job.project_id), "kind": kind, "preview": preview}
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise

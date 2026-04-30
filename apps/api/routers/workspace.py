import time
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from apps.api.database import SessionLocal, get_db, staging_engine
from apps.api.models import Job, JobStatus, MigrationLog, MigrationRun, MigrationRunMode, MigrationRunStatus, MigrationTarget
from apps.api.utils import (
    build_source_status,
    log_endpoint_audit,
    paginate_log_text,
    raise_if_database_resource_exhausted,
)
from services.export_engine.service import ExportEngineService
from services.migration_simulator.service import SimulationEngineService

router = APIRouter()
export_engine = ExportEngineService()
simulation_engine = SimulationEngineService()


class ExportValidateRequest(BaseModel):
    kind: str = "clean-sql"
    target: str = "postgresql"
    export_mode: str = "full"
    override_validation: bool = False
    manual_sql: str | None = None


class SimulationRequest(BaseModel):
    target_id: str
    mode: str = "dry-run"
    debug_keep_schema: bool = False

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


def _serialize_run(run: MigrationRun) -> dict:
    return {
        "id": str(run.id),
        "project_id": str(run.project_id) if run.project_id else None,
        "source_job_id": str(run.source_job_id),
        "target_id": str(run.target_id),
        "mode": run.mode.value if hasattr(run.mode, "value") else str(run.mode),
        "status": run.status.value if hasattr(run.status, "value") else str(run.status),
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "summary": run.summary,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "updated_at": run.updated_at.isoformat() if run.updated_at else None,
    }


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


def _build_graph_from_tables(job: Job) -> dict:
    inspector = inspect(staging_engine)
    profile_tables = _profile_tables(job)
    table_names = _table_names(job)
    table_name_set = set(table_names)
    nodes = []
    edges = []

    def infer_target(column_name: str) -> str | None:
        if not column_name.endswith("_id"):
            return None
        base = column_name[:-3]
        candidates = [
            base,
            f"{base}s",
            f"{base}es",
            base.replace("_", ""),
            f"{base}_list",
            f"{base}_types",
        ]
        for candidate in candidates:
            if candidate in table_name_set:
                return candidate
        return None

    for index, table_name in enumerate(table_names):
        table_info = profile_tables.get(table_name) or {}
        columns = _get_table_columns(job, table_name)
        primary_keys = table_info.get("primary_keys") or inspector.get_pk_constraint(table_name, schema="staging").get("constrained_columns", [])
        nodes.append(
            {
                "id": table_name,
                "label": table_name,
                "columns": columns,
                "primary_keys": primary_keys,
                "position": {
                    "x": 220 + (index % 4) * 280,
                    "y": 80 + (index // 4) * 220,
                },
            }
        )
        foreign_keys = table_info.get("foreign_keys") or inspector.get_foreign_keys(table_name, schema="staging")
        for fk_index, fk in enumerate(foreign_keys):
            target = fk.get("referred_table")
            source_cols = fk.get("constrained_columns") or []
            target_cols = fk.get("referred_columns") or []
            if not target:
                continue
            edges.append(
                {
                    "id": f"{table_name}-{target}-{fk_index}",
                    "source": table_name,
                    "target": target,
                    "label": f"{', '.join(source_cols)} -> {', '.join(target_cols)}",
                    "relation_type": "deterministic",
                    "status": "valid",
                }
            )
        if not foreign_keys:
            for column in columns:
                target = infer_target(column["name"])
                if not target or target == table_name:
                    continue
                edges.append(
                    {
                        "id": f"{table_name}-{target}-inferred-{column['name']}",
                        "source": table_name,
                        "target": target,
                        "label": f"{column['name']} -> id",
                        "relation_type": "inferred",
                        "status": "inferred",
                    }
                )
    return {"nodes": nodes, "edges": edges}


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
        _ensure_job_has_live_staging(job, db)
        graph = ((job.profile or {}).get("graph") or {}) if job.profile else {}
        if not graph.get("nodes"):
            graph = _build_graph_from_tables(job)
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
        payload = export_engine.build_status_payload(job, db)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/exports/preview")
def get_job_export_preview(
    job_id: str,
    request: Request,
    kind: str = "clean-sql",
    target: str = "postgresql",
    export_mode: str = "full",
    override_validation: bool = False,
    db: Session = Depends(get_db),
):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        if kind == "excel":
            meta = _metadata(job)
            payload = {
                "job_id": str(job.id),
                "project_id": str(job.project_id),
                "kind": kind,
                "preview": (
                    f"Workbook Preview\n"
                    f"- Source file: {job.original_filename or job.filename}\n"
                    f"- Tables: {meta.get('table_count') or len(_profile_tables(job))}\n"
                    f"- Rows: {meta.get('total_rows') or 0}\n"
                    f"- Sheets: 00_Summary, one per table, AI_Summary"
                ),
                "warnings": [],
                "blocking_issues": [],
                "auto_fixes_applied": [],
                "blocked": False,
                "unmapped_columns": [],
            }
        else:
            payload = export_engine.build_preview_payload(
                job=job,
                db_session=db,
                target_dialect="postgresql" if kind == "clean-sql" else target,
                export_mode=export_mode,
                override_validation=override_validation,
                kind=kind,
            )
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return payload
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.post("/jobs/{job_id}/exports/validate")
def validate_job_export(job_id: str, payload: ExportValidateRequest, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        result = export_engine.validate_export(
            job=job,
            db_session=db,
            kind=payload.kind,
            target_dialect=payload.target,
            export_mode=payload.export_mode,
            override_validation=payload.override_validation,
            manual_sql=payload.manual_sql,
        )
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


def _run_simulation_task(run_id: str, job_id: str, target_id: str, debug_keep_schema: bool = False):
    db = SessionLocal()
    try:
        simulation_engine.run_simulation(
            run_id=uuid.UUID(run_id),
            job_id=uuid.UUID(job_id),
            target_id=uuid.UUID(target_id),
            db_session=db,
            debug_keep_schema=debug_keep_schema,
        )
    finally:
        db.close()


@router.post("/jobs/{job_id}/simulate")
def start_job_simulation(job_id: str, payload: SimulationRequest, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        if payload.mode != "dry-run":
            raise HTTPException(status_code=400, detail="Simulation mode must be dry-run")
        job = _get_job_or_404(job_id, db)
        target = db.query(MigrationTarget).filter(MigrationTarget.id == payload.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail={"error_type": "connection_failed", "message": "Target connection not found"})
        if target.project_id and job.project_id and str(target.project_id) != str(job.project_id):
            raise HTTPException(status_code=400, detail="Target does not belong to the same project")

        run = MigrationRun(
            project_id=job.project_id,
            source_job_id=job.id,
            target_id=target.id,
            mode=MigrationRunMode.DRY_RUN,
            status=MigrationRunStatus.PENDING,
            summary={
                "status": "pending",
                "sql_source": None,
                "tables_total": 0,
                "tables_success": 0,
                "tables_failed": 0,
                "rows_expected": 0,
                "rows_inserted": 0,
                "diff": {"missing_rows": 0, "extra_rows": 0},
                "errors": [],
                "warnings": [],
                "execution_time": "0s",
                "table_results": [],
            },
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        background_tasks.add_task(_run_simulation_task, str(run.id), str(job.id), str(target.id), payload.debug_keep_schema)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return _serialize_run(run)
    except HTTPException:
        raise
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/simulation/result")
def get_job_simulation_result(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job_or_404(job_id, db)
        run = (
            db.query(MigrationRun)
            .filter(MigrationRun.source_job_id == job.id, MigrationRun.mode == MigrationRunMode.DRY_RUN)
            .order_by(MigrationRun.created_at.desc())
            .first()
        )
        payload = _serialize_run(run) if run else {
            "id": None,
            "project_id": str(job.project_id) if job.project_id else None,
            "source_job_id": str(job.id),
            "target_id": None,
            "mode": "dry_run",
            "status": "idle",
            "started_at": None,
            "finished_at": None,
            "summary": None,
            "created_at": None,
            "updated_at": None,
        }
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1 if run else 0)
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/jobs/{job_id}/simulation/logs")
def get_job_simulation_logs(job_id: str, request: Request, limit: int = 20, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    limit = max(1, min(limit, 100))
    try:
        job = _get_job_or_404(job_id, db)
        run = (
            db.query(MigrationRun)
            .filter(MigrationRun.source_job_id == job.id, MigrationRun.mode == MigrationRunMode.DRY_RUN)
            .order_by(MigrationRun.created_at.desc())
            .first()
        )
        if not run:
            return []
        logs = (
            db.query(MigrationLog)
            .filter(MigrationLog.migration_run_id == run.id)
            .order_by(MigrationLog.created_at.desc())
            .limit(limit)
            .all()
        )
        payload = [
            {
                "id": str(log.id),
                "level": log.level.value if hasattr(log.level, "value") else str(log.level),
                "table_name": log.table_name,
                "message": log.message,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(payload))
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise

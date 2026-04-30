import os
import tempfile
import time

import polars as pl
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from apps.api.database import get_db, staging_engine
from apps.api.models import Job
from apps.api.utils import log_endpoint_audit, raise_if_database_resource_exhausted
from services.export_engine.service import ExportEngineService

router = APIRouter()
export_engine = ExportEngineService()


def _get_job(job_id: str, db: Session) -> Job:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.profile:
        raise HTTPException(status_code=400, detail="Job profile is not available for export.")
    return job


@router.get("/{job_id}/export/excel", summary="Export Job output to Excel format")
def export_excel(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db)
        tmp_dir = tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, f"{job_id}_export.xlsx")

        try:
            import xlsxwriter

            tables = job.profile.get("tables", {}) if job.profile else {}

            with xlsxwriter.Workbook(tmp_path) as workbook:
                summary_ws = workbook.add_worksheet("00_Summary")
                summary_ws.write(0, 0, "Job ID")
                summary_ws.write(0, 1, str(job.id))
                summary_ws.write(1, 0, "Source Dialect")
                summary_ws.write(1, 1, job.profile.get("metadata", {}).get("flavor", "postgres"))
                summary_ws.write(2, 0, "Total Tables")
                summary_ws.write(2, 1, job.profile.get("metadata", {}).get("table_count", len(tables)))
                summary_ws.write(3, 0, "Readiness Status")
                summary_ws.write(3, 1, "Export generated from validated staging data.")

                db_conn = staging_engine.connect()
                for table_name in tables:
                    sheet_name = table_name[:31]
                    try:
                        df = pl.read_database(query=f'SELECT * FROM staging."{table_name}" LIMIT 10000', connection=db_conn)
                        df.write_excel(workbook=workbook, worksheet=sheet_name)
                    except Exception:
                        continue
                ai_ws = workbook.add_worksheet("AI_Summary")
                ai_ws.write(0, 0, "AI Generated Schema Insights")
                for idx, insight in enumerate(job.profile.get("ai_insights", [])):
                    ai_ws.write(idx + 1, 0, insight)
                db_conn.close()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Excel generation failed: {exc}")

        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(job.profile.get("tables", {})))
        return FileResponse(tmp_path, filename=f"{job_id}_clean_export.xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/{job_id}/export/clean-sql", summary="Export validated staging data as migration-ready PostgreSQL")
def export_clean_sql(
    job_id: str,
    request: Request,
    export_mode: str = Query(default="full"),
    override_validation: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db)
        try:
            artifact = export_engine.build_export(
                job=job,
                db_session=db,
                target_dialect="postgresql",
                export_mode=export_mode,
                override_validation=override_validation,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

        tmp_path = os.path.join(tempfile.gettempdir(), f"{job_id}_{export_mode}_clean.sql")
        with open(tmp_path, "w", encoding="utf-8") as handle:
            handle.write(artifact.sql)
        export_engine._store_artifact(
            job,
            db,
            artifact_kind="clean-sql",
            target_dialect=artifact.target_dialect,
            export_mode=artifact.mode,
            sql=artifact.sql,
            validation=artifact.validation,
            warnings=artifact.warnings,
            auto_fixes=artifact.auto_fixes_applied,
        )

        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(artifact.table_order))
        return FileResponse(tmp_path, filename=f"{job_id}_{export_mode}_clean.sql", content_type="application/sql")
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/{job_id}/export/translated-sql", summary="Export validated staging data translated for target SQL dialect")
def export_translated_sql(
    job_id: str,
    request: Request,
    target: str = Query(default="mysql"),
    export_mode: str = Query(default="full"),
    override_validation: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db)
        try:
            artifact = export_engine.build_export(
                job=job,
                db_session=db,
                target_dialect=target,
                export_mode=export_mode,
                override_validation=override_validation,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc))

        tmp_path = os.path.join(tempfile.gettempdir(), f"{job_id}_{export_mode}_{target}.sql")
        with open(tmp_path, "w", encoding="utf-8") as handle:
            handle.write(artifact.sql)
        export_engine._store_artifact(
            job,
            db,
            artifact_kind="translated-sql",
            target_dialect=artifact.target_dialect,
            export_mode=artifact.mode,
            sql=artifact.sql,
            validation=artifact.validation,
            warnings=artifact.warnings,
            auto_fixes=artifact.auto_fixes_applied,
        )

        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=len(artifact.table_order))
        return FileResponse(tmp_path, filename=f"{job_id}_{export_mode}_{target}.sql", content_type="application/sql")
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/{job_id}/export/manual-sql", summary="Export stored manual SQL override")
def export_manual_sql(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db)
        store = ((job.profile or {}).get("export_artifacts") or {}) if job.profile else {}
        manual = store.get("manual_edits_version") or {}
        sql = manual.get("sql")
        if not sql:
            raise HTTPException(status_code=404, detail="Manual SQL version not found.")
        target = manual.get("target_dialect") or "postgresql"
        tmp_path = os.path.join(tempfile.gettempdir(), f"{job_id}_manual_{target}.sql")
        with open(tmp_path, "w", encoding="utf-8") as handle:
            handle.write(sql)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return FileResponse(tmp_path, filename=f"{job_id}_manual_{target}.sql", content_type="application/sql")
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise

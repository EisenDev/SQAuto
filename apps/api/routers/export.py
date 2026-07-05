import os
import tempfile
import time
from typing import Optional
from uuid import UUID

import polars as pl
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from apps.api.database import get_db, staging_engine
from apps.api.models import Job
from apps.api.utils import log_endpoint_audit, raise_if_database_resource_exhausted
from services.export_engine.service import ExportEngineService

router = APIRouter()
export_engine = ExportEngineService()


def _get_job(job_id: str, db: Session, x_user_id: Optional[str] = None) -> Job:
    try:
        job_uuid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    job = db.query(Job).filter(Job.id == job_uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if x_user_id and job.project_id:
        from apps.api.deps import verify_project_owner
        verify_project_owner(job.project_id, db, x_user_id)
        
    if not job.profile:
        raise HTTPException(status_code=400, detail="Job profile is not available for export.")
    return job


@router.get("/{job_id}/export/excel", summary="Export Job output to Excel format")
def export_excel(
    job_id: str, 
    request: Request, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db, x_user_id)
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
    x_user_id: Optional[str] = Header(None)
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db, x_user_id)
        artifact = export_engine.resolve_download_artifact(job, kind="clean")
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return FileResponse(artifact["file_path"], filename=f"{job_id}_{export_mode}_clean.sql", content_type="application/sql")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
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
    x_user_id: Optional[str] = Header(None)
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db, x_user_id)
        artifact = export_engine.resolve_download_artifact(job, kind="translated", target_dialect=target)
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return FileResponse(artifact["file_path"], filename=f"{job_id}_{export_mode}_{target}.sql", content_type="application/sql")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/{job_id}/export/manual-sql", summary="Export stored manual SQL override")
def export_manual_sql(
    job_id: str, 
    request: Request, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    started_at = time.perf_counter()
    try:
        job = _get_job(job_id, db, x_user_id)
        manual = export_engine.resolve_download_artifact(job, kind="manual")
        target = manual.get("target_dialect") or "postgresql"
        log_endpoint_audit(path=str(request.url.path), project_id=str(job.project_id), job_id=str(job.id), started_at=started_at, row_count=1)
        return FileResponse(manual["file_path"], filename=f"{job_id}_manual_{target}.sql", content_type="application/sql")
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


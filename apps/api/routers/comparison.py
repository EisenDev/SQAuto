import os
import shutil
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Header
from sqlalchemy.orm import Session

from apps.api import models, schemas
from apps.api.database import get_db
from apps.api.deps import verify_project_owner
from services.comparison.service import SqlDumpComparisonService

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads", "comparisons"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _validate_sql_dump(file: UploadFile) -> bool:
    """Accept SQL dumps and Progress OpenEdge exports for comparison."""
    filename = (file.filename or "").lower()
    return (
        filename.endswith(".sql")
        or filename.endswith(".sql.gz")
        or filename.endswith(".bak")
        or filename.endswith(".zip")   # Progress .df + .d archive
        or filename.endswith(".df")    # Progress schema file
    )


def _save_upload(project_id: uuid.UUID, run_id: uuid.UUID, label: str, file: UploadFile) -> str:
    project_dir = os.path.join(UPLOAD_DIR, str(project_id), str(run_id))
    os.makedirs(project_dir, exist_ok=True)
    unique_name = f"{label}_{uuid.uuid4()}_{file.filename}"
    path = os.path.join(project_dir, unique_name)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path


@router.post("/projects/{project_id}/comparison/upload", response_model=schemas.ComparisonRun)
async def upload_comparison_sources(
    project_id: uuid.UUID,
    source_a: UploadFile = File(...),
    source_b: UploadFile = File(...),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    project = verify_project_owner(project_id, db, x_user_id)
    if not _validate_sql_dump(source_a) or not _validate_sql_dump(source_b):
        raise HTTPException(status_code=400, detail="Only .sql, .sql.gz, and .bak files are allowed.")

    run_id = uuid.uuid4()
    path_a = _save_upload(project_id, run_id, "source_a", source_a)
    path_b = _save_upload(project_id, run_id, "source_b", source_b)

    db_run = models.ComparisonRun(
        id=run_id,
        project_id=project_id,
        source_a_filename=path_a,
        source_a_original_filename=source_a.filename or "source_a.sql",
        source_b_filename=path_b,
        source_b_original_filename=source_b.filename or "source_b.sql",
        status="scanning",
    )
    db.add(db_run)
    db.commit()
    db.refresh(db_run)

    try:
        result = SqlDumpComparisonService().compare(path_a, path_b)
        db_run.status = "completed"
        db_run.result = result
    except Exception as exc:
        db_run.status = "failed"
        db_run.log = str(exc)
    db.commit()
    db.refresh(db_run)
    return db_run


@router.get("/projects/{project_id}/comparison/runs", response_model=List[schemas.ComparisonRun])
def list_comparison_runs(
    project_id: uuid.UUID, 
    limit: int = 10, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    verify_project_owner(project_id, db, x_user_id)
    return (
        db.query(models.ComparisonRun)
        .filter(models.ComparisonRun.project_id == project_id)
        .order_by(models.ComparisonRun.created_at.desc())
        .limit(max(1, min(limit, 50)))
        .all()
    )


@router.get("/projects/{project_id}/comparison/latest", response_model=schemas.ComparisonRun | None)
def get_latest_comparison_run(
    project_id: uuid.UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    verify_project_owner(project_id, db, x_user_id)
    return (
        db.query(models.ComparisonRun)
        .filter(models.ComparisonRun.project_id == project_id)
        .order_by(models.ComparisonRun.created_at.desc())
        .first()
    )


@router.get("/projects/{project_id}/comparison/mismatches")
def get_latest_comparison_mismatches(
    project_id: uuid.UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    verify_project_owner(project_id, db, x_user_id)
    run = (
        db.query(models.ComparisonRun)
        .filter(models.ComparisonRun.project_id == project_id)
        .order_by(models.ComparisonRun.created_at.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No comparison run found for this project.")
    result = run.result or {}
    differences = result.get("differences") or {}
    return {
        "run_id": str(run.id),
        "project_id": str(project_id),
        "status": run.status,
        "summary": result.get("summary") or {},
        "tables": differences.get("tables") or {},
        "columns": differences.get("columns") or [],
        "types": differences.get("types") or [],
        "primary_keys": differences.get("primary_keys") or [],
        "row_counts": differences.get("row_counts") or [],
        "missing_rows": differences.get("missing_rows") or [],
        "cells": differences.get("cells") or [],
        "validation": result.get("validation") or {},
    }


# apps/api/routers/analysis.py
"""Data Intelligence API Router — Phase 2.

Endpoints for running data integrity checks, detecting SQL dialects,
and retrieving enhanced reconciliation results.

SAFETY: All operations are READ-ONLY. No writes to staging or target.
"""

import os
import logging
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from apps.api.database import get_db, SessionLocal
from apps.api.models import Job, MigrationTarget, MigrationRun

router = APIRouter()
logger = logging.getLogger("sqauto.analysis_router")


# ============================================================
# Pydantic Schemas
# ============================================================

class IntegrityRequest(BaseModel):
    source_job_id: str


class DialectDetectRequest(BaseModel):
    sql_text: Optional[str] = None
    job_id: Optional[str] = None


class EnhancedReconRequest(BaseModel):
    target_id: str
    table_name: str


# ============================================================
# Integrity Check Endpoints
# ============================================================

@router.post("/integrity", summary="Run data integrity checks on staging")
def run_integrity(request: IntegrityRequest, db: Session = Depends(get_db)):
    """Run data integrity checks against the staging database.

    Detects: duplicate PKs, missing PKs, orphan FKs, high-NULL columns.
    All queries are SELECT-only with LIMIT clauses.
    """
    job = db.query(Job).filter(Job.id == request.source_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status.value != "completed":
        raise HTTPException(status_code=400, detail="Job must be completed before integrity check")

    from services.data_intelligence.integrity_checker import run_integrity_checks
    try:
        result = run_integrity_checks(db, request.source_job_id)
        return result
    except Exception as e:
        logger.error(f"Integrity check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Integrity check failed: {str(e)}")


# ============================================================
# SQL Dialect Detection Endpoints
# ============================================================

@router.post("/dialect", summary="Detect SQL dialect from text or job file")
def detect_dialect(request: DialectDetectRequest, db: Session = Depends(get_db)):
    """Detect the SQL dialect of uploaded content.

    Either provide raw sql_text, or a job_id to analyze the uploaded file.
    """
    from services.data_intelligence.dialect_detector import detect_sql_dialect, detect_dialect_from_file

    if request.sql_text:
        return detect_sql_dialect(request.sql_text)

    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Locate the uploaded file
        upload_dir = os.path.abspath(os.path.join(os.getcwd(), "uploads"))
        file_path = os.path.join(upload_dir, job.filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Upload file not found on disk")

        return detect_dialect_from_file(file_path)

    raise HTTPException(status_code=400, detail="Provide either sql_text or job_id")


# ============================================================
# Enhanced Reconciliation Endpoints
# ============================================================

@router.post("/reconciliation/enhanced", summary="Run enhanced reconciliation for a single table")
def run_enhanced_recon(request: EnhancedReconRequest, db: Session = Depends(get_db)):
    """Run enhanced reconciliation against a target for a specific table.

    Detects missing IDs, extra IDs, and sample mismatches.
    READ-ONLY against target database.
    """
    target = db.query(MigrationTarget).filter(MigrationTarget.id == request.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target connection not found")

    from services.data_intelligence.reconciliation_engine import run_enhanced_reconciliation

    target_config = {
        "host": target.host,
        "port": target.port,
        "database_name": target.database_name,
        "username": target.username,
        "password": target.password,
        "ssl_mode": target.ssl_mode,
    }

    try:
        result = run_enhanced_reconciliation(target_config, request.table_name)
        return result
    except Exception as e:
        err = str(e)
        if target.password:
            err = err.replace(target.password, "***")
        logger.error(f"Enhanced reconciliation failed: {err}")
        raise HTTPException(status_code=500, detail=f"Reconciliation failed: {err}")

# apps/api/routers/migration.py
"""Migration Control Center API Router — Phase 1: Dry-Run Only.

Endpoints for managing target database connections, executing dry-run
migration validations, and viewing reconciliation results and logs.

SAFETY: Passwords are NEVER returned in any API response.
"""

import logging
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from apps.api.database import get_db, SessionLocal
from apps.api.models import (
    Job, MigrationTarget, MigrationRun, MigrationRunMode, 
    MigrationRunStatus, MigrationLog, MigrationLogLevel
)
from services.migration_engine.service import MigrationEngineService

router = APIRouter()
logger = logging.getLogger("sqauto.migration_router")
engine_service = MigrationEngineService()


# ============================================================
# Pydantic Schemas
# ============================================================

class TargetCreateRequest(BaseModel):
    name: str
    host: str
    port: int = 5432
    database_name: str
    username: str
    password: str
    db_type: str = "postgresql"
    ssl_mode: Optional[str] = "prefer"


class TargetTestRequest(BaseModel):
    host: str
    port: int = 5432
    database_name: str
    username: str
    password: str
    ssl_mode: Optional[str] = "prefer"


class DryRunRequest(BaseModel):
    source_job_id: str
    target_id: str


# ============================================================
# Helper: Serialize target WITHOUT password
# ============================================================

def serialize_target(t: MigrationTarget) -> dict:
    """Convert a MigrationTarget to a dict, excluding the password."""
    return {
        "id": str(t.id),
        "name": t.name,
        "host": t.host,
        "port": t.port,
        "database_name": t.database_name,
        "username": t.username,
        "db_type": t.db_type,
        "ssl_mode": t.ssl_mode,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def serialize_run(r: MigrationRun) -> dict:
    """Convert a MigrationRun to a dict."""
    return {
        "id": str(r.id),
        "source_job_id": str(r.source_job_id),
        "target_id": str(r.target_id),
        "mode": r.mode.value if r.mode else None,
        "status": r.status.value if r.status else None,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        "summary": r.summary,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def serialize_log(l: MigrationLog) -> dict:
    """Convert a MigrationLog to a dict."""
    return {
        "id": str(l.id),
        "migration_run_id": str(l.migration_run_id),
        "level": l.level.value if l.level else None,
        "table_name": l.table_name,
        "row_identifier": l.row_identifier,
        "message": l.message,
        "context": l.context,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


# ============================================================
# Target Connection Endpoints
# ============================================================

@router.post("/targets", summary="Register a target database connection")
def create_target(request: TargetCreateRequest, db: Session = Depends(get_db)):
    """Save a target database connection configuration.
    Password is stored but NEVER returned in responses.
    """
    target = MigrationTarget(
        name=request.name,
        host=request.host,
        port=request.port,
        database_name=request.database_name,
        username=request.username,
        password=request.password,
        db_type=request.db_type,
        ssl_mode=request.ssl_mode,
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    
    logger.info(f"Target registered: {target.name} ({target.host}:{target.port})")
    return serialize_target(target)


@router.post("/targets/test", summary="Test a database connection without saving")
def test_target_connection(request: TargetTestRequest):
    """Test connectivity to a target PostgreSQL database.
    Does not persist anything. Only executes SELECT version().
    """
    result = engine_service.test_connection({
        "host": request.host,
        "port": request.port,
        "database_name": request.database_name,
        "username": request.username,
        "password": request.password,
        "ssl_mode": request.ssl_mode,
    })
    return result


@router.get("/targets", summary="List saved target connections")
def list_targets(db: Session = Depends(get_db)):
    """List all saved target connections. Passwords are excluded."""
    targets = db.query(MigrationTarget).order_by(MigrationTarget.created_at.desc()).all()
    return [serialize_target(t) for t in targets]


@router.delete("/targets/{target_id}", summary="Delete a saved target connection")
def delete_target(target_id: str, db: Session = Depends(get_db)):
    """Delete a saved target connection by ID."""
    target = db.query(MigrationTarget).filter(MigrationTarget.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    db.delete(target)
    db.commit()
    logger.info(f"Target deleted: {target_id}")
    return {"status": "deleted", "id": target_id}


# ============================================================
# Dry-Run Migration Endpoints
# ============================================================

def _execute_dry_run(run_id, target_config):
    """Background task for dry-run execution."""
    db = SessionLocal()
    try:
        run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if not run:
            return
        engine_service.run_dry_run(
            run_id=run_id,
            source_job_id=run.source_job_id,
            target_config=target_config,
            db_session=db,
        )
    except Exception as e:
        logger.error(f"Background dry-run failed: {e}")
        db.rollback()
        run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if run:
            run.status = MigrationRunStatus.FAILED
            run.finished_at = datetime.utcnow()
            run.summary = {"status": "failed", "error": str(e)}
            db.commit()
    finally:
        db.close()


@router.post("/runs/dry-run", summary="Start a dry-run migration validation")
def start_dry_run(request: DryRunRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Start a dry-run migration validation.
    Compares staging schema against target schema. READ-ONLY against target.
    """
    # Validate source job exists
    job = db.query(Job).filter(Job.id == request.source_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Source job not found")
    if job.status.value != "completed":
        raise HTTPException(status_code=400, detail="Source job must be completed before dry-run")
    
    # Validate target exists
    target = db.query(MigrationTarget).filter(MigrationTarget.id == request.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target connection not found")
    
    # Create migration run record
    run = MigrationRun(
        source_job_id=request.source_job_id,
        target_id=request.target_id,
        mode=MigrationRunMode.DRY_RUN,
        status=MigrationRunStatus.PENDING,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # Build target config for background task (password needed for connection)
    target_config = {
        "host": target.host,
        "port": target.port,
        "database_name": target.database_name,
        "username": target.username,
        "password": target.password,
        "ssl_mode": target.ssl_mode,
    }
    
    background_tasks.add_task(_execute_dry_run, run.id, target_config)
    
    logger.info(f"Dry-run {run.id} queued for job {request.source_job_id} -> target {request.target_id}")
    return serialize_run(run)


@router.get("/runs", summary="List migration runs")
def list_runs(db: Session = Depends(get_db)):
    """List all migration runs, ordered by most recent first."""
    runs = db.query(MigrationRun).order_by(MigrationRun.created_at.desc()).all()
    return [serialize_run(r) for r in runs]


@router.get("/runs/{run_id}", summary="Get migration run details")
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Get a single migration run with its summary."""
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Migration run not found")
    return serialize_run(run)


@router.get("/runs/{run_id}/logs", summary="Get logs for a migration run")
def get_run_logs(run_id: str, db: Session = Depends(get_db)):
    """Get all log entries for a specific migration run."""
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Migration run not found")
    
    logs = (
        db.query(MigrationLog)
        .filter(MigrationLog.migration_run_id == run_id)
        .order_by(MigrationLog.created_at.asc())
        .all()
    )
    return [serialize_log(l) for l in logs]

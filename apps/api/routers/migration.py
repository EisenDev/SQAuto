# apps/api/routers/migration.py
"""Migration Control Center API Router — Phase 1: Dry-Run Only.

Endpoints for managing target database connections, executing dry-run
migration validations, and viewing reconciliation results and logs.

SAFETY: Passwords are NEVER returned in any API response.
"""

import logging
import os
import time
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from apps.api.database import get_db, SessionLocal
from apps.api.models import (
    Job, MigrationTarget, MigrationRun, MigrationRunMode, 
    MigrationRunStatus, MigrationLog, MigrationLogLevel,
    MigrationPlan
)
from services.migration_engine.service import MigrationEngineService
from services.migration_engine.execution_engine import ExecutionEngineService
from services.migration_engine.target_connection import backend_runs_in_container, is_metadata_database_target
from apps.api.utils import log_endpoint_audit, raise_if_database_resource_exhausted

router = APIRouter()
logger = logging.getLogger("sqauto.migration_router")
engine_service = MigrationEngineService()
execution_service = ExecutionEngineService()


# ============================================================
# Pydantic Schemas
# ============================================================

class TargetCreateRequest(BaseModel):
    project_id: Optional[str] = None
    name: str
    host: str
    port: int = 5432
    database_name: str
    username: str
    password: str
    db_type: str = "postgresql"
    ssl_mode: Optional[str] = "prefer"


class TargetUpdateRequest(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    db_type: Optional[str] = None
    ssl_mode: Optional[str] = None


class TargetTestRequest(BaseModel):
    host: str
    port: int = 5432
    database_name: str
    username: str
    password: str
    db_type: str = "postgresql"
    ssl_mode: Optional[str] = "prefer"


class DryRunRequest(BaseModel):
    source_job_id: str
    target_id: str

class MigrationPlanRequest(BaseModel):
    source_job_id: str
    target_id: str

class MigrationExecuteRequest(BaseModel):
    source_job_id: str
    target_id: str
    mode: str = Field(..., description="Must be 'preview' or 'execute'")


# ============================================================
# Helper: Serialize target WITHOUT password
# ============================================================

def serialize_target(t: MigrationTarget) -> dict:
    """Convert a MigrationTarget to a dict, excluding the password."""
    return {
        "id": str(t.id),
        "project_id": str(t.project_id) if t.project_id else None,
        "name": t.name,
        "host": t.host,
        "port": t.port,
        "database_name": t.database_name,
        "username": t.username,
        "db_type": t.db_type,
        "ssl_mode": t.ssl_mode,
        "is_active": t.is_active,
        "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def serialize_run(r: MigrationRun) -> dict:
    """Convert a MigrationRun to a dict."""
    return {
        "id": str(r.id),
        "project_id": str(r.project_id) if r.project_id else None,
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
    if not request.name.strip():
        raise HTTPException(status_code=400, detail={"error_type": "invalid_target_configuration", "message": "Target connection name is required.", "fields": ["name"]})
    try:
        settings = engine_service.get_target_connection_settings(request.dict(), caller="save_target")
    except ValueError as exc:
        detail = exc.args[0] if exc.args else {"error_type": "invalid_target_configuration", "message": "Invalid target configuration"}
        raise HTTPException(status_code=400, detail=detail)
    target = MigrationTarget(
        project_id=uuid.UUID(request.project_id) if request.project_id else None,
        name=request.name.strip(),
        host=settings["host"],
        port=settings["port"],
        database_name=settings["database_name"],
        username=settings["username"],
        password=settings["password"],
        db_type=settings["db_type"],
        ssl_mode=settings["ssl_mode"],
        is_active=True,
        deleted_at=None,
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
    result = engine_service.precheck_connection({
        "host": request.host,
        "port": request.port,
        "database_name": request.database_name,
        "username": request.username,
        "password": request.password,
        "db_type": request.db_type,
        "ssl_mode": request.ssl_mode,
    }, caller="test_connection")
    return result


@router.post("/targets/{target_id}/test", summary="Test a saved target connection")
def test_saved_target_connection(target_id: str, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MigrationTarget).filter(MigrationTarget.id == target_id)
    if project_id:
        query = query.filter(MigrationTarget.project_id == project_id)
    target = query.first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return engine_service.precheck_connection(target, caller="test_connection", target_id=str(target.id))


@router.get("/system/connection-hints", summary="Connection hints for destination testing")
def get_connection_hints():
    backend_runtime = "docker" if backend_runs_in_container() else "local"
    docker_host = os.getenv("HOST_DOCKER_INTERNAL", "host.docker.internal")
    recommended_hosts = [docker_host, "db_staging", "postgres", "database.internal"]
    return {
        "backend_runtime": backend_runtime,
        "recommended_hosts": recommended_hosts,
    }


@router.get("/targets", summary="List saved target connections")
def list_targets(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List all saved target connections. Passwords are excluded."""
    query = db.query(MigrationTarget).filter(MigrationTarget.is_active == True, MigrationTarget.deleted_at.is_(None))
    if project_id:
        query = query.filter(MigrationTarget.project_id == project_id)
    targets = query.order_by(MigrationTarget.created_at.desc()).all()
    target_ids = [t.id for t in targets]
    history_counts = {}
    if target_ids:
        history_counts = {
            str(target_id): count
            for target_id, count in (
                db.query(MigrationRun.target_id, func.count(MigrationRun.id))
                .filter(MigrationRun.target_id.in_(target_ids))
                .group_by(MigrationRun.target_id)
                .all()
            )
        }
    return [
        {
            **serialize_target(t),
            "has_history": bool(history_counts.get(str(t.id), 0)),
            "is_application_db": is_metadata_database_target(
                {
                    "host": t.host,
                    "port": t.port,
                    "database_name": t.database_name,
                    "username": t.username,
                }
            ),
        }
        for t in targets
    ]


@router.patch("/targets/{target_id}", summary="Update a saved target connection")
def update_target(target_id: str, request: TargetUpdateRequest, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Update a saved target connection.
    If password is empty or not provided, it keeps the existing password.
    """
    query = db.query(MigrationTarget).filter(MigrationTarget.id == target_id)
    if project_id:
        query = query.filter(MigrationTarget.project_id == project_id)
    target = query.first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
        
    update_data = request.dict(exclude_unset=True)
    if "password" in update_data:
        if not update_data["password"]:
            del update_data["password"]  # Do not overwrite with empty strings
    merged = {
        "name": update_data.get("name", target.name),
        "host": update_data.get("host", target.host),
        "port": update_data.get("port", target.port),
        "database_name": update_data.get("database_name", target.database_name),
        "username": update_data.get("username", target.username),
        "password": update_data.get("password", target.password),
        "db_type": update_data.get("db_type", target.db_type),
        "ssl_mode": update_data.get("ssl_mode", target.ssl_mode),
    }
    if not str(merged["name"] or "").strip():
        raise HTTPException(status_code=400, detail={"error_type": "invalid_target_configuration", "message": "Target connection name is required.", "fields": ["name"]})
    try:
        settings = engine_service.get_target_connection_settings(merged, caller="update_target", target_id=str(target.id))
    except ValueError as exc:
        detail = exc.args[0] if exc.args else {"error_type": "invalid_target_configuration", "message": "Invalid target configuration"}
        raise HTTPException(status_code=400, detail=detail)
            
    for key, value in update_data.items():
        setattr(target, key, value)
    target.host = settings["host"]
    target.port = settings["port"]
    target.database_name = settings["database_name"]
    target.username = settings["username"]
    target.password = settings["password"]
    target.db_type = settings["db_type"]
    target.ssl_mode = settings["ssl_mode"]
        
    target.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(target)
    
    logger.info(f"Target updated: {target.name} ({target.host}:{target.port})")
    return serialize_target(target)


@router.delete("/targets/{target_id}", summary="Delete a saved target connection")
def delete_target(target_id: str, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Delete a saved target connection by ID."""
    query = db.query(MigrationTarget).filter(MigrationTarget.id == target_id)
    if project_id:
        query = query.filter(MigrationTarget.project_id == project_id)
    target = query.first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    history_count = db.query(func.count(MigrationRun.id)).filter(MigrationRun.target_id == target.id).scalar() or 0
    if history_count > 0:
        target.is_active = False
        target.deleted_at = datetime.utcnow()
        target.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"Target archived: {target_id}")
        return {
            "success": False,
            "error_type": "target_has_history",
            "message": "This destination has simulation or migration history and was archived instead of deleted.",
            "status": "archived",
            "id": target_id,
        }

    db.delete(target)
    db.commit()
    logger.info(f"Target deleted: {target_id}")
    return {"success": True, "status": "deleted", "id": target_id}


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
    if target.project_id and job.project_id and str(target.project_id) != str(job.project_id):
        raise HTTPException(status_code=400, detail="Target does not belong to the same project")
    
    # Create migration run record
    run = MigrationRun(
        project_id=job.project_id,
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


@router.get("/runs", summary="List migration runs for a specific job")
def list_runs(source_job_id: str, request: Request, db: Session = Depends(get_db)):
    """List all migration runs for a specific job, ordered by most recent first."""
    if not source_job_id:
        return []
    started_at = time.perf_counter()
    try:
        runs = db.query(MigrationRun).filter(MigrationRun.source_job_id == source_job_id).order_by(MigrationRun.created_at.desc()).all()
        payload = [serialize_run(r) for r in runs]
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=payload[0]["project_id"] if payload else None,
            job_id=source_job_id,
            started_at=started_at,
            row_count=len(payload),
        )
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/runs/{run_id}", summary="Get migration run details")
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Get a single migration run with its summary."""
    run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Migration run not found")
    return serialize_run(run)


@router.get("/runs/{run_id}/logs", summary="Get logs for a migration run")
def get_run_logs(run_id: str, request: Request, limit: int = 10, page: int = 1, db: Session = Depends(get_db)):
    """Get paginated log entries for a specific migration run."""
    started_at = time.perf_counter()
    limit = max(1, min(limit, 100))
    page = max(1, page)
    try:
        run = db.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if not run:
            raise HTTPException(status_code=404, detail="Migration run not found")

        logs = (
            db.query(MigrationLog)
            .filter(MigrationLog.migration_run_id == run_id)
            .order_by(MigrationLog.created_at.asc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        payload = [serialize_log(l) for l in logs]
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(run.project_id) if run.project_id else None,
            job_id=str(run.source_job_id),
            started_at=started_at,
            row_count=len(payload),
        )
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


# ============================================================
# Phase 3: Controlled Execution Endpoints
# ============================================================

@router.post("/plan", summary="Generate a migration plan")
def generate_migration_plan(request: MigrationPlanRequest, db: Session = Depends(get_db)):
    """Generate a data intelligence backed migration plan."""
    target = db.query(MigrationTarget).filter(MigrationTarget.id == request.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target connection not found")
        
    plan_data = execution_service.generate_migration_plan(db, request.source_job_id, request.target_id)
    return plan_data


@router.get("/plan/{plan_id}", summary="Get saved migration plan")
def get_migration_plan(plan_id: str, db: Session = Depends(get_db)):
    """Fetch an existing migration plan artifact."""
    plan = db.query(MigrationPlan).filter(MigrationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Migration plan not found")
        
    return {
        "id": str(plan.id),
        "source_job_id": str(plan.source_job_id),
        "target_id": str(plan.target_id),
        "plan": plan.plan,
        "risk_level": plan.risk_level,
        "blocked": plan.blocked,
        "blocking_reasons": plan.blocking_reasons,
        "created_at": plan.created_at.isoformat() if plan.created_at else None
    }


def _execute_migration_bg(run_id, target_config, mode):
    """Background task for safe execution."""
    db = SessionLocal()
    try:
        execution_service.execute_migration(
            db_session=db,
            run_id=run_id,
            target_config=target_config,
            mode=mode
        )
    except Exception as e:
        logger.error(f"Background execution failed: {e}")
    finally:
        db.close()


@router.post("/execute", summary="Execute controlled migration (preview or commit)")
def start_execution(request: MigrationExecuteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Start either a transaction-backed preview or actual commit execution."""
    if request.mode not in ["preview", "execute"]:
        raise HTTPException(status_code=400, detail="Mode must be 'preview' or 'execute'")
        
    job = db.query(Job).filter(Job.id == request.source_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Source job not found")
        
    target = db.query(MigrationTarget).filter(MigrationTarget.id == request.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target connection not found")
        
    run_mode = MigrationRunMode.PREVIEW if request.mode == "preview" else MigrationRunMode.EXECUTE
    
    run = MigrationRun(
        project_id=job.project_id,
        source_job_id=request.source_job_id,
        target_id=request.target_id,
        mode=run_mode,
        status=MigrationRunStatus.PENDING,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    target_config = {
        "host": target.host,
        "port": target.port,
        "database_name": target.database_name,
        "username": target.username,
        "password": target.password,
        "ssl_mode": target.ssl_mode,
    }
    
    background_tasks.add_task(_execute_migration_bg, run.id, target_config, request.mode)
    logger.info(f"Execution {run.id} queued for mode: {request.mode.upper()}")
    
    return serialize_run(run)


class MappingSuggestRequest(BaseModel):
    source_job_id: str
    target_id: str


@router.post("/mapping/suggest", summary="Suggest Schema Mappings")
def suggest_mappings(request: MappingSuggestRequest, db: Session = Depends(get_db)):
    """
    Generates intelligent mapping suggestions linking source columns to destination structure.
    Currently returns dummy schema data to the mapping suggester engine for the MVP.
    """
    from services.smart_fix.mapping_suggester import suggest_schema_mappings
    
    job = db.query(Job).filter(Job.id == request.source_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Source job not found")

    target = db.query(MigrationTarget).filter(MigrationTarget.id == request.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target connection not found")

    # In a full implementation, you'd pull actual schema definitions here:
    # source_schema = extract_source_schema(job)
    # target_schema = inspect_target_schema(target)
    
    # We provide an example set showing fuzzy compatibility finding.
    source_mock = {
        "users": [{"name": "usr_nm", "type": "varchar"}, {"name": "UserEmail", "type": "varchar"}],
        "documents": [{"name": "doc_description", "type": "varchar"}]
    }
    
    target_mock = {
        "users": [{"name": "user_name", "type": "varchar"}, {"name": "user_email", "type": "varchar"}],
        "documents": [{"name": "description", "type": "varchar"}]
    }

    results = suggest_schema_mappings(source_mock, target_mock)
    return {"suggestions": results}

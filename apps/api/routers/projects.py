# apps/api/routers/projects.py
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from apps.api.database import get_db
from apps.api import models, schemas
from apps.api.deps import verify_org_owner, verify_project_owner
from apps.api.utils import (
    build_source_status,
    log_endpoint_audit,
    paginate_log_text,
    raise_if_database_resource_exhausted,
)

router = APIRouter()

# Projects are tied to an organization
@router.post("/organizations/{org_id}/projects", response_model=schemas.Project)
def create_project(
    org_id: UUID, 
    project: schemas.ProjectCreate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify org exists and is owned by the user
    verify_org_owner(org_id, db, x_user_id)
    
    db_project = models.Project(**project.model_dump(), organization_id=org_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/organizations/{org_id}/projects", response_model=List[schemas.Project])
def list_org_projects(
    org_id: UUID, 
    limit: int = 20, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify org exists and is owned by the user
    verify_org_owner(org_id, db, x_user_id)
    return db.query(models.Project).filter(models.Project.organization_id == org_id).offset(offset).limit(limit).all()

@router.get("/projects/{project_id}", response_model=schemas.Project)
def get_project(
    project_id: UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    project = verify_project_owner(project_id, db, x_user_id)
    return project

@router.patch("/projects/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: UUID, 
    project_update: schemas.ProjectUpdate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    db_project = verify_project_owner(project_id, db, x_user_id)
    
    obj_data = project_update.model_dump(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    db_project = verify_project_owner(project_id, db, x_user_id)
    db.delete(db_project)
    db.commit()
    return {"status": "success"}

@router.get("/projects/{project_id}/jobs", response_model=List[schemas.JobMinimal])
def list_project_jobs(
    project_id: UUID, 
    request: Request, 
    limit: int = 20, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    verify_project_owner(project_id, db, x_user_id)
    started_at = time.perf_counter()
    try:
        jobs = (
            db.query(models.Job)
            .filter(models.Job.project_id == project_id)
            .order_by(models.Job.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(project_id),
            job_id=None,
            started_at=started_at,
            row_count=len(jobs),
        )
        return jobs
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/projects/{project_id}/source-status", response_model=schemas.ProjectSourceStatus)
def get_project_source_status(
    project_id: UUID, 
    request: Request, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    verify_project_owner(project_id, db, x_user_id)
    started_at = time.perf_counter()
    try:
        job = (
            db.query(models.Job)
            .filter(models.Job.project_id == project_id)
            .order_by(models.Job.is_active.desc(), models.Job.updated_at.desc(), models.Job.created_at.desc())
            .first()
        )
        payload = build_source_status(str(project_id), job)
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(project_id),
            job_id=str(job.id) if job else None,
            started_at=started_at,
            row_count=1 if job else 0,
        )
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


@router.get("/projects/{project_id}/logs", response_model=schemas.ProjectLogResponse)
def get_project_logs(
    project_id: UUID,
    request: Request,
    limit: int = 10,
    page: int = 1,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    # Verify project exists and is owned by the user
    verify_project_owner(project_id, db, x_user_id)
    started_at = time.perf_counter()
    limit = max(1, min(limit, 100))
    page = max(1, page)
    try:
        job = (
            db.query(models.Job)
            .filter(models.Job.project_id == project_id)
            .order_by(models.Job.is_active.desc(), models.Job.updated_at.desc(), models.Job.created_at.desc())
            .first()
        )
        lines, total_lines = paginate_log_text(job.log if job else "", limit=limit, page=page)
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(project_id),
            job_id=str(job.id) if job else None,
            started_at=started_at,
            row_count=len(lines),
        )
        return {
            "project_id": project_id,
            "active_job_id": job.id if job else None,
            "page": page,
            "limit": limit,
            "total_lines": total_lines,
            "lines": lines,
        }
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise


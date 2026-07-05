# apps/api/deps.py
"""Dependency utilities for FastAPI.
Provides DB session dependency and a logger.
"""

import logging
import contextvars
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from apps.api.database import get_db
from apps.api import models

# Basic logger configuration – can be extended later
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sqauto")

# ContextVar to store the current user ID
x_user_id_ctx = contextvars.ContextVar("x_user_id", default=None)

# FastAPI dependency that yields a DB session
def get_db_dep():
    """Dependency that provides a DB session for FastAPI routes."""
    return get_db()

def verify_org_owner(
    org_id: UUID, 
    db: Session = Depends(get_db), 
    x_user_id: Optional[str] = None
) -> models.Organization:
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    # Fallback to ContextVar if not passed explicitly
    if x_user_id is None:
        x_user_id = x_user_id_ctx.get()
        
    if x_user_id and org.owner_id:
        try:
            if org.owner_id != UUID(x_user_id):
                raise HTTPException(status_code=403, detail="Not authorized to access this organization")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
    return org

def verify_project_owner(
    project_id: UUID, 
    db: Session = Depends(get_db), 
    x_user_id: Optional[str] = None
) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Fallback to ContextVar if not passed explicitly
    if x_user_id is None:
        x_user_id = x_user_id_ctx.get()
        
    # Verify ownership of the project's parent organization
    verify_org_owner(project.organization_id, db, x_user_id)
    return project

def verify_job_owner(
    job_id: UUID, 
    db: Session = Depends(get_db), 
    x_user_id: Optional[str] = None
) -> models.Job:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Fallback to ContextVar if not passed explicitly
    if x_user_id is None:
        x_user_id = x_user_id_ctx.get()
        
    if job.project_id:
        verify_project_owner(job.project_id, db, x_user_id)
    return job



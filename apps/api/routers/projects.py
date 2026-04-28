# apps/api/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from apps.api.database import get_db
from apps.api import models, schemas

router = APIRouter()

# Projects are tied to an organization
@router.post("/organizations/{org_id}/projects", response_model=schemas.Project)
def create_project(org_id: UUID, project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    # Verify org exists
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    db_project = models.Project(**project.model_dump(), organization_id=org_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/organizations/{org_id}/projects", response_model=List[schemas.Project])
def list_org_projects(org_id: UUID, db: Session = Depends(get_db)):
    return db.query(models.Project).filter(models.Project.organization_id == org_id).all()

@router.get("/projects/{project_id}", response_model=schemas.Project)
def get_project(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.patch("/projects/{project_id}", response_model=schemas.Project)
def update_project(project_id: UUID, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    obj_data = project_update.model_dump(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(db_project, key, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/projects/{project_id}")
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(db_project)
    db.commit()
    return {"status": "success"}

@router.get("/projects/{project_id}/jobs", response_model=List[schemas.JobMinimal])
def list_project_jobs(project_id: UUID, db: Session = Depends(get_db)):
    jobs = db.query(models.Job).filter(models.Job.project_id == project_id).order_by(models.Job.created_at.desc()).all()
    return jobs

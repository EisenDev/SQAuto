# apps/api/routers/organizations.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from apps.api.database import get_db
from apps.api import models, schemas

router = APIRouter()

@router.post("/", response_model=schemas.Organization)
def create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    db_org = models.Organization(**org.model_dump())
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@router.get("/", response_model=List[schemas.Organization])
def list_organizations(db: Session = Depends(get_db)):
    return db.query(models.Organization).all()

@router.get("/{org_id}", response_model=schemas.Organization)
def get_organization(org_id: UUID, db: Session = Depends(get_db)):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return db_org

@router.patch("/{org_id}", response_model=schemas.Organization)
def update_organization(org_id: UUID, org_update: schemas.OrganizationUpdate, db: Session = Depends(get_db)):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    obj_data = org_update.model_dump(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(db_org, key, value)
    
    db.commit()
    db.refresh(db_org)
    return db_org

@router.delete("/{org_id}")
def delete_organization(org_id: UUID, db: Session = Depends(get_db)):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(db_org)
    db.commit()
    return {"status": "success"}

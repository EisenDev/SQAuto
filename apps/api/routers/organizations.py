# apps/api/routers/organizations.py
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from apps.api.database import get_db
from apps.api import models, schemas

router = APIRouter()

@router.post("/", response_model=schemas.Organization)
def create_organization(
    org: schemas.OrganizationCreate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    org_data = org.model_dump()
    if x_user_id:
        try:
            org_data["owner_id"] = UUID(x_user_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
            
    db_org = models.Organization(**org_data)
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@router.get("/", response_model=List[schemas.Organization])
def list_organizations(
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    if x_user_id:
        try:
            user_uuid = UUID(x_user_id)
            orgs = db.query(models.Organization).filter(models.Organization.owner_id == user_uuid).all()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
    else:
        orgs = db.query(models.Organization).all()

    # Annotate each org with its project count
    for org in orgs:
        count = db.query(models.Project).filter(models.Project.organization_id == org.id).count()
        org.project_count = count

    return orgs

@router.get("/{org_id}", response_model=schemas.Organization)
def get_organization(
    org_id: UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if x_user_id and db_org.owner_id:
        try:
            if db_org.owner_id != UUID(x_user_id):
                raise HTTPException(status_code=403, detail="Not authorized to access this organization")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
            
    return db_org

@router.patch("/{org_id}", response_model=schemas.Organization)
def update_organization(
    org_id: UUID, 
    org_update: schemas.OrganizationUpdate, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if x_user_id and db_org.owner_id:
        try:
            if db_org.owner_id != UUID(x_user_id):
                raise HTTPException(status_code=403, detail="Not authorized to update this organization")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
            
    obj_data = org_update.model_dump(exclude_unset=True)
    for key, value in obj_data.items():
        setattr(db_org, key, value)
    
    db.commit()
    db.refresh(db_org)
    return db_org

@router.delete("/{org_id}")
def delete_organization(
    org_id: UUID, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    if x_user_id and db_org.owner_id:
        try:
            if db_org.owner_id != UUID(x_user_id):
                raise HTTPException(status_code=403, detail="Not authorized to delete this organization")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user ID format in X-User-Id header")
            
    db.delete(db_org)
    db.commit()
    return {"status": "success"}

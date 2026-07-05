import logging
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from uuid import UUID

from apps.api.database import get_db
from apps.api.models import Job
from apps.api.deps import verify_job_owner
from services.smart_fix.fix_suggester import generate_fix_suggestions
from services.smart_fix.fix_preview import preview_fix
from services.smart_fix.fix_pipeline import FixPipelineService

router = APIRouter()
logger = logging.getLogger("sqauto.fixes_router")
pipeline_service = FixPipelineService()

class FixSuggestionsRequest(BaseModel):
    source_job_id: str

class FixPreviewRequest(BaseModel):
    source_job_id: str
    suggestion_id: str
    selected_action: str
    options: Optional[Dict[str, Any]] = None

class FixPlanRequest(BaseModel):
    source_job_id: str
    selected_suggestions: List[Dict[str, Any]]


@router.post("/suggestions", summary="Generate smart fix suggestions")
def get_fix_suggestions(
    request: FixSuggestionsRequest, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    try:
        job_uuid = UUID(request.source_job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source job ID format")

    job = verify_job_owner(job_uuid, db, x_user_id)
        
    # Get profile data which contains integrity metrics
    profile_data = job.profile or {}
    
    suggestions = generate_fix_suggestions(request.source_job_id, profile_data)
    return suggestions


@router.post("/preview", summary="Preview a specific fix action")
def get_fix_preview(
    request: FixPreviewRequest,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    try:
        job_uuid = UUID(request.source_job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source job ID format")

    verify_job_owner(job_uuid, db, x_user_id)
    preview = preview_fix(
        source_job_id=request.source_job_id,
        suggestion_id=request.suggestion_id,
        selected_action=request.selected_action,
        options=request.options
    )
    return preview


@router.post("/plan", summary="Create a fix plan")
def create_plan(
    request: FixPlanRequest,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    try:
        job_uuid = UUID(request.source_job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source job ID format")

    verify_job_owner(job_uuid, db, x_user_id)
    plan = pipeline_service.create_fix_plan(request.source_job_id, request.selected_suggestions)
    return plan


@router.get("/plan/{plan_id}", summary="Get a fix plan details")
def get_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    plan = pipeline_service._mock_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if plan and "source_job_id" in plan:
        try:
            job_uuid = UUID(plan["source_job_id"])
            verify_job_owner(job_uuid, db, x_user_id)
        except ValueError:
            pass
            
    return plan


@router.post("/plan/{plan_id}/preview", summary="Generate full preview for a fix plan")
def preview_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    plan = pipeline_service._mock_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if plan and "source_job_id" in plan:
        try:
            job_uuid = UUID(plan["source_job_id"])
            verify_job_owner(job_uuid, db, x_user_id)
        except ValueError:
            pass
            
    return pipeline_service.preview_fix_plan(plan_id)


@router.post("/plan/{plan_id}/apply", summary="Apply fix plan to staging")
def apply_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    plan = pipeline_service._mock_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if plan and "source_job_id" in plan:
        try:
            job_uuid = UUID(plan["source_job_id"])
            verify_job_owner(job_uuid, db, x_user_id)
        except ValueError:
            pass
            
    return pipeline_service.apply_fix_plan_to_staging_copy(plan_id)


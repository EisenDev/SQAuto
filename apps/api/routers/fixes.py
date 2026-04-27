import logging
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.models import Job
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
def get_fix_suggestions(request: FixSuggestionsRequest, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == request.source_job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Source job not found")
        
    # Get profile data which contains integrity metrics
    profile_data = job.profile or {}
    integrity_report = profile_data.get("validation_results", {})
    
    # In SQAuto, profile might store metrics natively or nested. We pass it appropriately.
    # We'll pass the full profile data and let the suggester pull what it needs.
    # For Phase 4, we assume profile_data has missing_primary_keys etc. built from Phase 2 validations.
    
    suggestions = generate_fix_suggestions(request.source_job_id, profile_data)
    return suggestions


@router.post("/preview", summary="Preview a specific fix action")
def get_fix_preview(request: FixPreviewRequest):
    preview = preview_fix(
        source_job_id=request.source_job_id,
        suggestion_id=request.suggestion_id,
        selected_action=request.selected_action,
        options=request.options
    )
    return preview


@router.post("/plan", summary="Create a fix plan")
def create_plan(request: FixPlanRequest):
    plan = pipeline_service.create_fix_plan(request.source_job_id, request.selected_suggestions)
    return plan


@router.get("/plan/{plan_id}", summary="Get a fix plan details")
def get_plan(plan_id: str):
    plan = pipeline_service._mock_plans.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/plan/{plan_id}/preview", summary="Generate full preview for a fix plan")
def preview_plan(plan_id: str):
    return pipeline_service.preview_fix_plan(plan_id)


@router.post("/plan/{plan_id}/apply", summary="Apply fix plan to staging")
def apply_plan(plan_id: str):
    return pipeline_service.apply_fix_plan_to_staging_copy(plan_id)

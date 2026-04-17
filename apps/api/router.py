# apps/api/router.py
"""API router with real implementations for core pipeline.
Provides upload handling, job management, dump restore, and profiling.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import shutil
import uuid

from apps.api.database import get_db
from apps.api.models import Job, JobStatus
from apps.api.deps import logger
from configs.settings import settings
from services.dump_restore.service import DumpRestoreService
from services.schema_profiler.service import SchemaProfilerService

api_router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@api_router.post("/upload", tags=["upload"], summary="Upload SQL dump and create job")
async def upload_dump(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Validate extension
    if not file.filename.lower().endswith('.sql'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .sql files are allowed")
    # Save file with unique name
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Create Job record
    job = Job(filename=unique_name, status=JobStatus.UPLOADED)
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Created job {job.id} for uploaded file {unique_name}")
    return {"job_id": str(job.id), "status": job.status.value, "filename": job.filename}

@api_router.get("/jobs", tags=["jobs"], summary="List all jobs")
async def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()
    return [{"id": str(j.id), "filename": j.filename, "status": j.status.value, "created_at": j.created_at} for j in jobs]

@api_router.get("/jobs/{job_id}", tags=["jobs"], summary="Get job details")
async def job_detail(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": str(job.id),
        "filename": job.filename,
        "status": job.status.value,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "log": job.log,
        "profile": job.profile,
    }

@api_router.post("/jobs/{job_id}/restore", tags=["jobs"], summary="Restore dump into staging database")
async def restore_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.UPLOADED:
        raise HTTPException(status_code=400, detail="Job not in uploaded state")
    file_path = os.path.join(UPLOAD_DIR, job.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Uploaded file missing on server")
    # Update status to RESTORING
    job.status = JobStatus.RESTORING
    db.commit()
    service = DumpRestoreService()
    try:
        service.restore(job_id=job.id, file_path=file_path, db_session=db)
        # After successful restore, move to ANALYZING
        job.status = JobStatus.ANALYZING
        db.commit()
    except Exception as e:
        logger.error(f"Restore failed for job {job.id}: {e}")
        job.status = JobStatus.FAILED
        job.log = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail="Restore failed")
    return {"job_id": str(job.id), "status": job.status.value}

@api_router.get("/jobs/{job_id}/profile", tags=["jobs"], summary="Profile schema after restore")
async def profile_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.ANALYZING:
        raise HTTPException(status_code=400, detail="Job not ready for profiling")
    profiler = SchemaProfilerService()
    try:
        profile_data = profiler.profile(job_id=job.id, db_session=db)
        job.profile = profile_data
        job.status = JobStatus.COMPLETED
        db.commit()
    except Exception as e:
        logger.error(f"Profiling failed for job {job.id}: {e}")
        job.status = JobStatus.FAILED
        job.log = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail="Profiling failed")
    return {"job_id": str(job.id), "status": job.status.value, "profile": job.profile}

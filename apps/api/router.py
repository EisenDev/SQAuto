# apps/api/router.py
"""API router with real implementations for core pipeline.
Provides upload handling, job management, dump restore, and profiling.
Updated to support project-scoped operations.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, BackgroundTasks, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import shutil
import uuid
import logging
import time

from apps.api.database import get_db, SessionLocal
from apps.api.models import Job, JobStatus, Project
from apps.api.deps import logger
from configs.settings import settings
from services.dump_restore.service import DumpRestoreService
from services.schema_profiler.service import SchemaProfilerService
from apps.api.routers import debug, organizations, projects, workspace
from apps.api.utils import log_endpoint_audit, raise_if_database_resource_exhausted

api_router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads"))
CHUNK_DIR = os.path.join(UPLOAD_DIR, "temp_chunks")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHUNK_DIR, exist_ok=True)

class FinalizeRequest(BaseModel):
    uploadId: str
    filename: str
    totalChunks: int
    fileSize: int
    projectId: uuid.UUID # Mandatory for new uploads

def run_restore_task(job_id: uuid.UUID, file_path: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job: return
        
        service = DumpRestoreService()
        service.restore(job_id=job.id, file_path=file_path, db_session=db)
        
        job.status = JobStatus.ANALYZING
        db.commit()
        
        run_profile_task(job_id, db)
    except Exception as e:
        logger.error(f"Background Restore failed for job {job_id}: {e}")
        db.rollback()
        job_err = db.query(Job).filter(Job.id == job_id).first()
        if job_err:
            job_err.status = JobStatus.FAILED
            job_err.log = str(e)
            db.commit()
    finally:
        db.close()

def run_profile_task(job_id: uuid.UUID, db: Session):
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job: return
        
        profiler = SchemaProfilerService()
        profiler.profile(job_id=job.id, db_session=db)
        
        job.status = JobStatus.COMPLETED
        db.commit()
    except Exception as e:
        logger.error(f"Background Profiling failed for job {job_id}: {e}")
        db.rollback()
        job.status = JobStatus.FAILED
        job.log = str(e)
        db.commit()

@api_router.post("/upload/chunk", tags=["upload"], summary="Upload a file chunk")
async def upload_chunk(
    chunk: UploadFile = File(...),
    uploadId: str = Form(...),
    chunkIndex: int = Form(...),
    filename: str = Form(...),
):
    upload_path = os.path.join(CHUNK_DIR, uploadId)
    os.makedirs(upload_path, exist_ok=True)
    
    chunk_file = os.path.join(upload_path, f"chunk_{chunkIndex}")
    try:
        with open(chunk_file, "wb") as buffer:
            shutil.copyfileobj(chunk.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save chunk {chunkIndex} for {uploadId}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save chunk {chunkIndex}")
    
    return {"status": "success", "chunkIndex": chunkIndex}

@api_router.post("/upload/finalize", tags=["upload"], summary="Finalize chunked upload and create job")
async def finalize_upload(request: FinalizeRequest, db: Session = Depends(get_db)):
    # Verify project exists
    project = db.query(Project).filter(Project.id == request.projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    upload_path = os.path.join(CHUNK_DIR, request.uploadId)
    if not os.path.exists(upload_path):
        raise HTTPException(status_code=400, detail="Upload session not found")
    
    filename_lower = request.filename.lower()
    is_compressed = filename_lower.endswith('.sql.gz')
    
    if not (filename_lower.endswith('.sql') or is_compressed):
        shutil.rmtree(upload_path, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Only .sql and .sql.gz files are allowed")

    unique_name = f"{uuid.uuid4()}_{request.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    
    try:
        with open(file_path, "wb") as outfile:
            for i in range(request.totalChunks):
                chunk_file = os.path.join(upload_path, f"chunk_{i}")
                if not os.path.exists(chunk_file):
                    raise Exception(f"Missing chunk {i}")
                with open(chunk_file, "rb") as infile:
                    shutil.copyfileobj(infile, outfile)
        
        shutil.rmtree(upload_path)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Failed to finalize upload {request.uploadId}: {e}")
        if os.path.exists(file_path): os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to assemble chunks: {str(e)}")

    job = Job(
        project_id=request.projectId,
        filename=unique_name, 
        original_filename=request.filename,
        is_compressed=is_compressed,
        file_size=file_size,
        status=JobStatus.UPLOADED,
        is_active=(db.query(Job).filter(Job.project_id == request.projectId, Job.is_active == True).count() == 0)
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    logger.info(f"Created job {job.id} for project {request.projectId}")
    return {
        "id": str(job.id), 
        "status": job.status.value, 
        "filename": job.filename, 
        "is_active": job.is_active,
        "is_compressed": is_compressed,
        "file_size": file_size
    }

@api_router.post("/upload", tags=["upload"], summary="Upload SQL dump and create job (Traditional)")
async def upload_dump(
    file: UploadFile = File(...), 
    projectId: uuid.UUID = Form(...),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == projectId).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    filename_lower = file.filename.lower()
    is_compressed = filename_lower.endswith('.sql.gz')
    
    if not (filename_lower.endswith('.sql') or is_compressed):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .sql and .sql.gz files are allowed")
    
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Failed to save upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    job = Job(
        project_id=projectId,
        filename=unique_name, 
        original_filename=file.filename,
        is_compressed=is_compressed,
        file_size=file_size,
        status=JobStatus.UPLOADED,
        is_active=(db.query(Job).filter(Job.project_id == projectId, Job.is_active == True).count() == 0)
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {
        "id": str(job.id), 
        "status": job.status.value, 
        "filename": job.filename, 
        "is_active": job.is_active,
        "is_compressed": is_compressed,
        "file_size": file_size
    }

@api_router.get("/jobs/{job_id}", tags=["jobs"], summary="Get job details")
async def job_detail(job_id: str, request: Request, db: Session = Depends(get_db)):
    started_at = time.perf_counter()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        payload = {
            "id": str(job.id),
            "projectId": str(job.project_id),
            "filename": job.filename,
            "original_filename": job.original_filename,
            "status": job.status.value,
            "file_size": job.file_size,
            "is_active": job.is_active,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "log": job.log,
            "profile": job.profile,
        }
        log_endpoint_audit(
            path=str(request.url.path),
            project_id=str(job.project_id) if job.project_id else None,
            job_id=str(job.id),
            started_at=started_at,
            row_count=1,
        )
        return payload
    except Exception as exc:
        raise_if_database_resource_exhausted(exc)
        raise

@api_router.post("/jobs/{job_id}/activate", tags=["jobs"], summary="Set a job as the active source of truth")
async def activate_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Deactivate all other jobs for this project
    db.query(Job).filter(Job.project_id == job.project_id).update({"is_active": False})
    
    # Activate target job
    job.is_active = True
    db.commit()
    return {"status": "success", "message": f"Job {job_id} is now the active source."}

@api_router.post("/projects/{project_id}/reset", tags=["projects"], summary="Reset project data (Clear all jobs)")
async def reset_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all jobs for this project
    db.query(Job).filter(Job.project_id == project.id).delete()
    db.commit()
    return {"status": "success", "message": "Project data reset. All jobs cleared."}

@api_router.post("/jobs/{job_id}/restore", tags=["jobs"], summary="Restore dump into staging database (Background)")
async def restore_job(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    file_path = os.path.join(UPLOAD_DIR, job.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=500, detail="Uploaded file missing on server")
    
    job.status = JobStatus.RESTORING
    db.commit()
    
    background_tasks.add_task(run_restore_task, job.id, file_path)
    return {"id": str(job.id), "status": "processing", "message": "Restore started in background"}

@api_router.post("/jobs/{job_id}/profile", tags=["jobs"], summary="Profile schema after restore (Background)")
async def profile_job(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    background_tasks.add_task(run_profile_task, job.id, db)
    return {"id": str(job.id), "status": "processing", "message": "Profiling started in background"}

# Hierarchy routes
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(projects.router, tags=["projects"])

# Register remaining routers
from apps.api.routers import export, explorer, migration, analysis, fixes

api_router.include_router(debug.router, prefix="/debug", tags=["debug"])
api_router.include_router(export.router, prefix="/jobs", tags=["jobs", "export"])
api_router.include_router(explorer.router, prefix="/explorer", tags=["jobs", "explorer"])
api_router.include_router(workspace.router, tags=["workspace"])
api_router.include_router(migration.router, prefix="/migration", tags=["migration"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(fixes.router, prefix="/fixes", tags=["fixes", "smart_fix"])

@api_router.post("/jobs/{job_id}/layout", tags=["jobs"], summary="Save schema visualizer layout positions")
async def save_layout(job_id: str, request: dict, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.profile or "graph" not in job.profile:
        raise HTTPException(status_code=400, detail="Job has no profiling graph to layout")

    for pos_data in request.get("positions", []):
        for node in job.profile["graph"]["nodes"]:
            if node["id"] == pos_data["id"]:
                node["position"] = pos_data["position"]

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(job, "profile")
    db.commit()
    return {"status": "success", "message": "Layout saved."}

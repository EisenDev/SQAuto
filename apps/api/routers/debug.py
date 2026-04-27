# apps/api/routers/debug.py
import os
import subprocess
from fastapi import APIRouter, HTTPException
from configs.settings import settings

router = APIRouter()

@router.get("/restoration-log")
async def get_restoration_log():
    """Returns the last 100 lines of the industrial restoration log."""
    log_path = os.path.join("uploads", "restoration.log")
    if not os.path.exists(log_path):
        return {"log": "No restoration log found yet. Start a restoration to see activity."}
    
    try:
        # Get last 100 lines using tail to be efficient with memory
        result = subprocess.run(["tail", "-n", "100", log_path], capture_output=True, text=True)
        return {
            "log": result.stdout,
            "path": log_path,
            "size": os.path.getsize(log_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipe-trace")
async def get_pipe_trace():
    """Returns the last 100 lines of the industrial trace log."""
    log_path = os.path.join("uploads", "industrial_trace.log")
    if not os.path.exists(log_path):
        return {"log": "No trace log found. Extraction may not have started."}
    
    try:
        result = subprocess.run(["tail", "-n", "100", log_path], capture_output=True, text=True)
        return {
            "log": result.stdout,
            "path": log_path,
            "size": os.path.getsize(log_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

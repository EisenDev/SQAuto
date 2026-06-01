# apps/api/main.py
"""FastAPI application entry point.
Provides health check and includes API router.
All heavy logic is delegated to service modules.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from apps.api.database import Base, engine
from apps.api.router import api_router
from apps.api.utils import database_resource_exhausted_response, is_database_resource_exhausted_message

app = FastAPI(title="SQAuto API", version="0.1.0")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure JSON is always returned."""
    print(f"[!] Uncaught Exception: {str(exc)}")
    if is_database_resource_exhausted_message(str(exc)):
        return database_resource_exhausted_response()
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_type": "internal_server_error",
            "message": "Internal Server Error. Check API logs.",
            "detail": str(exc)
        },
    )

# Allow frontend to call the API (CORS)
# Broaden origins to handle port-jumping on Ubuntu (3000-3010)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sqauto.zeraynce.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS project_type VARCHAR NOT NULL DEFAULT 'individual'"))
            conn.execute(text("ALTER TABLE IF EXISTS public.migration_targets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
            conn.execute(text("ALTER TABLE IF EXISTS public.migration_targets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_project_id_status ON public.jobs (project_id, status)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_project_id_created_at ON public.jobs (project_id, created_at DESC)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_runs_project_id ON public.migration_runs (project_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_logs_project_id ON public.migration_logs (project_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_logs_project_id_created_at ON public.migration_logs (project_id, created_at DESC)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_targets_project_id ON public.migration_targets (project_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_comparison_runs_project_id_created_at ON public.comparison_runs (project_id, created_at DESC)"))
        print("[+] PostgreSQL connected and tables verified.")
    except Exception as e:
        print(f"[!] Database connection failed on startup: {e}")
        print("[!] Backend is running in LIMITED MODE (DB operations will fail).")

@app.get("/health", tags=["health"])
async def health_check():
    """Simple health endpoint used by monitoring tools."""
    return {"status": "ok"}

# Include the main API router
app.include_router(api_router, prefix="/api")

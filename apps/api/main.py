# apps/api/main.py
"""FastAPI application entry point.
Provides health check and includes API router.
All heavy logic is delegated to service modules.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.database import Base, engine
from apps.api.router import api_router

app = FastAPI(title="SQAuto API", version="0.1.0")

# Allow frontend to call the API (CORS)
# Broaden origins to handle port-jumping on Ubuntu (3000-3010)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
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

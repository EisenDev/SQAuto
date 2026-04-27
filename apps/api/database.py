# apps/api/database.py
"""Database connection and session management for FastAPI.
Uses SQLAlchemy 2.0 with Pydantic settings.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from configs.settings import settings

# Create engine; echo can be turned off for production
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={
        "connect_timeout": 10,
        "prepare_threshold": None  # CRITICAL for PgBouncer/Supabase compatibility
    },
    echo=False,
    future=True
)

# SessionLocal class for dependency injection
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

# Base class for models
Base = declarative_base()

def get_db():
    """FastAPI dependency that provides a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

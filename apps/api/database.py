from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from configs.settings import settings

# Metadata Engine (Supabase - lightweight)
metadata_url = settings.METADATA_DATABASE_URL or settings.DATABASE_URL
metadata_engine = create_engine(
    metadata_url,
    connect_args={
        "connect_timeout": 10,
        "prepare_threshold": None
    },
    echo=False,
    future=True
)

# Staging Engine (Local Postgres - heavy)
staging_engine = create_engine(
    settings.STAGING_DATABASE_URL,
    connect_args={
        "connect_timeout": 5
    },
    echo=False,
    future=True
)

# Session factories
MetadataSession = sessionmaker(bind=metadata_engine, autocommit=False, autoflush=False, future=True)
StagingSession = sessionmaker(bind=staging_engine, autocommit=False, autoflush=False, future=True)

# Compatibility: Default SessionLocal points to Metadata
SessionLocal = MetadataSession

# Base class for models (Metadata DB)
Base = declarative_base()

def get_db():
    """Default metadata DB dependency."""
    db = MetadataSession()
    try:
        yield db
    finally:
        db.close()

def get_metadata_db():
    """Explicit metadata DB dependency."""
    db = MetadataSession()
    try:
        yield db
    finally:
        db.close()

def get_staging_db():
    """Explicit staging DB dependency."""
    db = StagingSession()
    try:
        yield db
    finally:
        db.close()

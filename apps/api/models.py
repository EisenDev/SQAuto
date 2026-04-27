# apps/api/models.py
"""SQLAlchemy models for the SQAuto API.
Includes Job model with status tracking and optional profiling data.
Includes Migration models for target connections, runs, and logs.
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, Enum, JSON, Text, Boolean, BigInteger, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from apps.api.database import Base

class JobStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    RESTORING = "restoring"
    ANALYZING = "analyzing"
    FAILED = "failed"
    COMPLETED = "completed"

class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    is_compressed = Column(Boolean, default=False, nullable=False)
    file_size = Column(BigInteger, nullable=True) 
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.UPLOADED)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # Optional JSON field to store profiling results
    profile = Column(JSON, nullable=True)
    # Optional text field for logs / error messages
    log = Column(Text, nullable=True)


# ============================================================
# Migration Control Center Models (Phase 1)
# ============================================================

class MigrationTarget(Base):
    """Stores target database connection metadata.
    Passwords are stored in DB but NEVER returned in API responses.
    Future: implement encrypted storage for credentials.
    """
    __tablename__ = "migration_targets"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False, default=5432)
    database_name = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)  # TODO: encrypt in future phase
    db_type = Column(String, nullable=False, default="postgresql")
    ssl_mode = Column(String, nullable=True, default="prefer")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MigrationRunMode(str, enum.Enum):
    DRY_RUN = "dry_run"


class MigrationRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class MigrationRun(Base):
    """Tracks each migration run (dry-run or future execution)."""
    __tablename__ = "migration_runs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    source_job_id = Column(UUID(as_uuid=True), ForeignKey("public.jobs.id"), nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("public.migration_targets.id"), nullable=False)
    mode = Column(Enum(MigrationRunMode), nullable=False, default=MigrationRunMode.DRY_RUN)
    status = Column(Enum(MigrationRunStatus), nullable=False, default=MigrationRunStatus.PENDING)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MigrationLogLevel(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class MigrationLog(Base):
    """Individual log entries per migration run."""
    __tablename__ = "migration_logs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    migration_run_id = Column(UUID(as_uuid=True), ForeignKey("public.migration_runs.id"), nullable=False)
    level = Column(Enum(MigrationLogLevel), nullable=False, default=MigrationLogLevel.INFO)
    table_name = Column(String, nullable=True)
    row_identifier = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    context = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


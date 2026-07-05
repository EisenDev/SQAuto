# apps/api/models.py
"""SQLAlchemy models for the SQAuto API.
Includes Organization and Project models for the new product structure.
Includes Job model with status tracking and optional profiling data.
Includes Migration models for target connections, runs, logs, and plans.
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, Enum, JSON, Text, Boolean, BigInteger, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from apps.api.database import Base

# ============================================================
# Product Hierarchy Models
# ============================================================

class Organization(Base):
    """Top-level container for multiple projects."""
    __tablename__ = "organizations"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    owner_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Project(Base):
    """Specific migration initiative belonging to an organization."""
    __tablename__ = "projects"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(String, nullable=False, default="individual")
    optional_password_hash = Column(String, nullable=True)  # Future: project-level security
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ============================================================
# Core Pipeline Models
# ============================================================

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
    # Scoping to project
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=True, index=True) 
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    is_compressed = Column(Boolean, default=False, nullable=False)
    file_size = Column(BigInteger, nullable=True) 
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.UPLOADED)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    # Tracks the source database format. Values: "sql", "progress_openedge", future formats.
    source_type = Column(String, nullable=False, default="sql")
    profile = Column(JSON, nullable=True)
    log = Column(Text, nullable=True)


class ComparisonRun(Base):
    """Read-only comparison scan between two SQL dump files in a project."""
    __tablename__ = "comparison_runs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=False, index=True)
    source_a_filename = Column(String, nullable=False)
    source_a_original_filename = Column(String, nullable=False)
    source_b_filename = Column(String, nullable=False)
    source_b_original_filename = Column(String, nullable=False)
    status = Column(String, nullable=False, default="completed")
    result = Column(JSON, nullable=True)
    log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ============================================================
# Migration Control Center Models
# ============================================================

class MigrationTarget(Base):
    __tablename__ = "migration_targets"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False, default=5432)
    database_name = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)
    db_type = Column(String, nullable=False, default="postgresql")
    ssl_mode = Column(String, nullable=True, default="prefer")
    is_active = Column(Boolean, nullable=False, default=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MigrationRunMode(str, enum.Enum):
    DRY_RUN = "dry_run"
    PREVIEW = "preview"
    EXECUTE = "execute"


class MigrationRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    BLOCKED = "blocked"


class MigrationRun(Base):
    __tablename__ = "migration_runs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=True, index=True)
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
    __tablename__ = "migration_logs"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=True, index=True)
    migration_run_id = Column(UUID(as_uuid=True), ForeignKey("public.migration_runs.id"), nullable=False)
    level = Column(Enum(MigrationLogLevel), nullable=False, default=MigrationLogLevel.INFO)
    table_name = Column(String, nullable=True)
    row_identifier = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    context = Column(JSON, nullable=True)
    rows_affected = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    transaction_status = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MigrationPlan(Base):
    __tablename__ = "migration_plans"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("public.projects.id"), nullable=True, index=True)
    source_job_id = Column(UUID(as_uuid=True), ForeignKey("public.jobs.id"), nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey("public.migration_targets.id"), nullable=False)
    plan = Column(JSON, nullable=False)
    risk_level = Column(String, nullable=False, default="LOW")
    blocked = Column(Boolean, default=False, nullable=False)
    blocking_reasons = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

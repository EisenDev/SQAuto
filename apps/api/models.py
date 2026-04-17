# apps/api/models.py
"""SQLAlchemy models for the SQAuto API.
Includes Job model with status tracking and optional profiling data.
"""

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, Enum, JSON, Text
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    filename = Column(String, nullable=False)
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.UPLOADED)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # Optional JSON field to store profiling results
    profile = Column(JSON, nullable=True)
    # Optional text field for logs / error messages
    log = Column(Text, nullable=True)

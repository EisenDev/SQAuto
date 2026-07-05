# apps/api/schemas.py
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Literal, Optional, List

class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(OrganizationBase):
    name: Optional[str] = None

class Organization(OrganizationBase):
    id: UUID
    owner_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    project_count: Optional[int] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: Literal["individual", "comparison"] = Field("individual", description="individual for one SQL dump, comparison for two SQL dumps")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None

class Project(ProjectBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class JobMinimal(BaseModel):
    id: UUID
    filename: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    is_active: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class JobMetrics(BaseModel):
    tables: int = 0
    rows: int = 0
    data_size_mb: float = 0


class ProjectSourceStatus(BaseModel):
    project_id: UUID
    active_job_id: Optional[UUID] = None
    status: Optional[str] = None
    filename: Optional[str] = None
    file_size: int = 0
    dialect: Optional[str] = None
    metrics: JobMetrics
    updated_at: Optional[str] = None


class ProjectLogResponse(BaseModel):
    project_id: UUID
    active_job_id: Optional[UUID] = None
    page: int
    limit: int
    total_lines: int
    lines: List[str]


class ComparisonRun(BaseModel):
    id: UUID
    project_id: UUID
    source_a_original_filename: str
    source_b_original_filename: str
    status: str
    result: Optional[dict] = None
    log: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

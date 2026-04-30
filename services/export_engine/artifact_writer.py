from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


DEFAULT_EXPORT_ARTIFACT_DIR = os.getenv("EXPORT_ARTIFACTS_DIR", "/app/uploads/export_artifacts")


@dataclass
class ArtifactWriteStats:
    artifact_id: str
    file_path: str
    size_bytes: int
    statement_count: int
    row_count: int
    created_at: str


class ArtifactWriter:
    def __init__(self, job_id: str, suffix: str = ".sql") -> None:
        self.artifact_id = str(uuid.uuid4())
        self.created_at = datetime.utcnow().isoformat()
        job_dir = Path(DEFAULT_EXPORT_ARTIFACT_DIR) / str(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        self.file_path = str(job_dir / f"{self.artifact_id}{suffix}")
        self._handle = open(self.file_path, "w", encoding="utf-8")
        self.statement_count = 0
        self.row_count = 0

    def write_statement(self, statement: str, *, row_count: int = 0) -> None:
        payload = (statement or "").strip()
        if not payload:
            return
        if not payload.endswith(";"):
            payload = f"{payload};"
        self._handle.write(payload)
        self._handle.write("\n\n")
        self.statement_count += 1
        self.row_count += row_count
        if self.statement_count % 250 == 0:
            self._handle.flush()

    def write_text(self, payload: str) -> None:
        if not payload:
            return
        self._handle.write(payload)
        self._handle.flush()

    def finalize(self) -> ArtifactWriteStats:
        self._handle.flush()
        self._handle.close()
        size_bytes = os.path.getsize(self.file_path)
        return ArtifactWriteStats(
            artifact_id=self.artifact_id,
            file_path=self.file_path,
            size_bytes=size_bytes,
            statement_count=self.statement_count,
            row_count=self.row_count,
            created_at=self.created_at,
        )

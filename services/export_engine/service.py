from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
import uuid

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from apps.api.database import staging_engine
from apps.api.models import Job
from services.data_intelligence.integrity_checker import run_integrity_checks
from services.export_engine.artifact_writer import ArtifactWriter


SUPPORTED_DIALECTS = {"postgresql", "mysql", "sqlite"}
SUPPORTED_EXPORT_MODES = {"full", "schema-only", "data-only"}
DEFAULT_PREVIEW_ROWS_PER_TABLE = 10
DEFAULT_PREVIEW_TABLE_LIMIT = 3
DEFAULT_SAMPLE_ROWS_PER_TABLE = 1000
DEFAULT_SAMPLE_TABLE_LIMIT = 10
DEFAULT_EXPORT_CHUNK_ROWS = 250
MAX_EXPORT_CHUNK_ROWS = 1000


@dataclass
class ExportValidationResult:
    blocked: bool
    warnings: list[str]
    blocking_issues: list[str]
    unmapped_columns: list[str]
    auto_fixes_applied: list[str]


@dataclass
class ExportArtifact:
    sql: str
    warnings: list[str]
    blocking_issues: list[str]
    auto_fixes_applied: list[str]
    mode: str
    target_dialect: str
    validation: ExportValidationResult
    table_order: list[str]


class ExportEngineService:
    def build_export(
        self,
        *,
        job: Job,
        db_session: Session,
        target_dialect: str = "postgresql",
        export_mode: str = "full",
        override_validation: bool = False,
        row_limit_per_table: int | None = None,
        table_limit: int | None = None,
    ) -> ExportArtifact:
        target = self._normalize_dialect(target_dialect)
        mode = self._normalize_mode(export_mode)
        context = self._load_context(
            job,
            include_rows=True,
            row_limit_per_table=row_limit_per_table,
            table_limit=table_limit,
        )
        validation = self._validate(job, db_session, self._load_status_context(job, table_limit=table_limit), target)
        if validation.blocked and not override_validation:
            raise ValueError("Export blocked by validation gate")

        ordered_tables = self._order_tables(context["tables"])
        statements: list[str] = []
        warnings = list(validation.warnings)
        auto_fixes = list(validation.auto_fixes_applied)

        if validation.blocked and override_validation:
            warnings.append("Validation override enabled. Export contains blocking issues flagged for operator review.")

        if mode in {"full", "schema-only"}:
            for table_name in ordered_tables:
                statements.append(self._ensure_statement_terminated(self._generate_create_table_sql(table_name, context, target, warnings)))

        if mode in {"full", "data-only"}:
            for table_name in ordered_tables:
                insert_sql, insert_warnings = self._generate_insert_sql(table_name, context, target)
                warnings.extend(insert_warnings)
                if insert_sql:
                    statements.append(insert_sql)

        sql = "\n\n".join(statement for statement in statements if statement.strip())
        return ExportArtifact(
            sql=sql,
            warnings=self._dedupe(warnings),
            blocking_issues=self._dedupe(validation.blocking_issues),
            auto_fixes_applied=self._dedupe(auto_fixes),
            mode=mode,
            target_dialect=target,
            validation=validation,
            table_order=ordered_tables,
        )

    def build_preview_payload(
        self,
        *,
        job: Job,
        db_session: Session,
        target_dialect: str = "postgresql",
        export_mode: str = "full",
        override_validation: bool = False,
        kind: str = "clean-sql",
    ) -> dict[str, Any]:
        artifact = self.build_export(
            job=job,
            db_session=db_session,
            target_dialect=target_dialect,
            export_mode=export_mode,
            override_validation=override_validation,
            row_limit_per_table=DEFAULT_PREVIEW_ROWS_PER_TABLE,
            table_limit=DEFAULT_PREVIEW_TABLE_LIMIT,
        )
        return {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "kind": kind,
            "target_dialect": artifact.target_dialect,
            "export_mode": artifact.mode,
            "preview": artifact.sql[:50000],
            "warnings": artifact.warnings,
            "blocking_issues": artifact.blocking_issues,
            "auto_fixes_applied": artifact.auto_fixes_applied,
            "cleaning_suggestions": self._build_cleaning_suggestions(artifact.sql, artifact.target_dialect, artifact.warnings),
            "table_order": artifact.table_order,
            "blocked": artifact.validation.blocked,
            "unmapped_columns": artifact.validation.unmapped_columns,
        }

    def build_status_payload(self, job: Job, db_session: Session) -> dict[str, Any]:
        quality_report = self._ensure_quality_report(job, db_session)
        validation = self._validate(job, db_session, self._load_status_context(job), "postgresql")
        metadata = ((job.profile or {}).get("metadata") or {}) if job.profile else {}
        artifact_status = self._artifact_status(job)

        clean_stored = bool(artifact_status["cleaned_sql_version"])
        translated_stored = bool(artifact_status["translated_sql_version"])
        manual_stored = bool(artifact_status["manual_edits_version"])

        return {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "clean_sql_ready": clean_stored,
            "translated_sql_ready": translated_stored,
            "excel_ready": True,
            "preview_available": True,
            "dialect": metadata.get("flavor") or metadata.get("dialect"),
            "filename": job.original_filename or job.filename,
            "validation": {
                "blocked": validation.blocked,
                "warnings": validation.warnings,
                "blocking_issues": validation.blocking_issues,
                "unmapped_columns": validation.unmapped_columns,
            },
            "can_generate_clean_sql": not validation.blocked,
            "can_generate_translated_sql": not validation.blocked,
            "clean_sql_artifact_stored": clean_stored,
            "translated_sql_artifact_stored": translated_stored,
            "manual_sql_artifact_stored": manual_stored,
            "simulation_ready": clean_stored or translated_stored or manual_stored,
            "artifact_sizes": {
                "clean_sql_bytes": (artifact_status["cleaned_sql_version"] or {}).get("size_bytes"),
                "translated_sql_bytes": max(
                    [entry.get("size_bytes") or 0 for entry in (artifact_status["translated_sql_version"] or {}).values()],
                    default=None,
                ),
                "excel_bytes": None,
            },
            "export_variants": {
                "clean_sql": {
                    "can_generate": not validation.blocked,
                    "artifact_stored": clean_stored,
                    "requires_generation": not clean_stored,
                    "latest_artifact": artifact_status["cleaned_sql_version"],
                },
                "translated_sql": {
                    "can_generate": not validation.blocked,
                    "artifact_stored": translated_stored,
                    "requires_generation": not translated_stored,
                    "latest_artifact": artifact_status["translated_sql_version"],
                },
                "manual_sql": {
                    "can_generate": True,
                    "artifact_stored": manual_stored,
                    "requires_generation": not manual_stored,
                    "latest_artifact": artifact_status["manual_edits_version"],
                },
            },
            "artifacts": artifact_status,
            "quality_summary": {
                "duplicate_count": quality_report.get("duplicate_count", 0),
                "null_risk_count": quality_report.get("null_risk_count", 0),
                "orphan_fk_count": quality_report.get("orphan_fk_count", 0),
                "type_mismatch_count": quality_report.get("type_mismatch_count", 0),
            },
        }

    def validate_export(
        self,
        *,
        job: Job,
        db_session: Session,
        kind: str = "clean-sql",
        target_dialect: str = "postgresql",
        export_mode: str = "full",
        override_validation: bool = False,
        manual_sql: str | None = None,
    ) -> dict[str, Any]:
        kind = (kind or "clean-sql").lower()
        target = self._normalize_dialect(target_dialect if kind != "clean-sql" else "postgresql")
        mode = self._normalize_mode(export_mode)

        if manual_sql is not None and manual_sql.strip():
            validation = self._validate_manual_sql(manual_sql, target)
            artifact_entry = self.store_manual_artifact(
                job=job,
                db_session=db_session,
                sql=manual_sql,
                target_dialect=target,
                export_mode=mode,
                validation=validation,
            )
            return {
                "job_id": str(job.id),
                "project_id": str(job.project_id),
                "kind": "manual-sql",
                "target_dialect": target,
                "export_mode": mode,
                "valid": not validation.blocked,
                "blocked": validation.blocked,
                "warnings": validation.warnings,
                "blocking_issues": validation.blocking_issues,
                "unmapped_columns": validation.unmapped_columns,
                "created_at": artifact_entry["created_at"],
                "artifact_id": artifact_entry["artifact_id"],
            }

        validation = self._validate(job, db_session, self._load_status_context(job), target)
        if validation.blocked and not override_validation:
            raise ValueError("Export blocked by validation gate")
        return {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "kind": "translated-sql" if kind == "translated-sql" else "clean-sql",
            "target_dialect": target,
            "export_mode": mode,
            "valid": not validation.blocked,
            "blocked": validation.blocked,
            "warnings": validation.warnings,
            "blocking_issues": validation.blocking_issues,
            "unmapped_columns": validation.unmapped_columns,
            "created_at": datetime.utcnow().isoformat(),
        }

    def initialize_artifact_generation(
        self,
        *,
        job: Job,
        db_session: Session,
        kind: str,
        target_dialect: str,
        export_mode: str,
        override_validation: bool = False,
        sample_rows_per_table: int | None = None,
        sample_table_limit: int | None = None,
    ) -> dict[str, Any]:
        normalized_kind = self._normalize_generate_kind(kind)
        target = self._normalize_dialect(target_dialect if normalized_kind == "translated" else "postgresql")
        mode = self._normalize_mode(export_mode)
        validation = self._validate(job, db_session, self._load_status_context(job, table_limit=sample_table_limit), target)
        if validation.blocked and not override_validation:
            raise ValueError("Export blocked by validation gate")

        created_at = datetime.utcnow().isoformat()
        artifact_id = self._new_artifact_id()
        artifact_entry = {
            "artifact_id": artifact_id,
            "kind": normalized_kind,
            "target_dialect": target,
            "export_mode": mode,
            "file_path": None,
            "size_bytes": 0,
            "statement_count": 0,
            "row_count": 0,
            "status": "queued",
            "warnings": self._dedupe(validation.warnings),
            "blocking_issues": self._dedupe(validation.blocking_issues),
            "unmapped_columns": self._dedupe(validation.unmapped_columns),
            "auto_fixes_applied": self._dedupe(validation.auto_fixes_applied),
            "validation_result": {
                "blocked": validation.blocked,
                "warnings": self._dedupe(validation.warnings),
                "blocking_issues": self._dedupe(validation.blocking_issues),
                "unmapped_columns": self._dedupe(validation.unmapped_columns),
                "validated_at": None,
            },
            "sample_rows_per_table": sample_rows_per_table,
            "sample_table_limit": sample_table_limit,
            "requires_generation": True,
            "created_at": created_at,
            "updated_at": created_at,
            "error": None,
        }
        self._save_artifact_entry(job, db_session, artifact_entry)
        return artifact_entry

    def generate_artifact(
        self,
        *,
        job: Job,
        db_session: Session,
        artifact_id: str,
        kind: str,
        target_dialect: str,
        export_mode: str,
        override_validation: bool = False,
        sample_rows_per_table: int | None = None,
        sample_table_limit: int | None = None,
        chunk_rows: int = DEFAULT_EXPORT_CHUNK_ROWS,
    ) -> dict[str, Any]:
        normalized_kind = self._normalize_generate_kind(kind)
        target = self._normalize_dialect(target_dialect if normalized_kind == "translated" else "postgresql")
        mode = self._normalize_mode(export_mode)
        row_limit = max(1, sample_rows_per_table) if sample_rows_per_table else None
        table_limit = max(1, sample_table_limit) if sample_table_limit else None
        chunk_size = max(1, min(chunk_rows, MAX_EXPORT_CHUNK_ROWS))

        validation = self._validate(job, db_session, self._load_status_context(job, table_limit=table_limit), target)
        if validation.blocked and not override_validation:
            self.mark_artifact_failed(job=job, db_session=db_session, artifact_id=artifact_id, error="Export blocked by validation gate")
            raise ValueError("Export blocked by validation gate")

        context = self._load_status_context(job, table_limit=table_limit)
        ordered_tables = self._order_tables(context["tables"])
        warnings = list(validation.warnings)
        auto_fixes = list(validation.auto_fixes_applied)
        if validation.blocked and override_validation:
            warnings.append("Validation override enabled. Export contains blocking issues flagged for operator review.")

        self._update_artifact_entry(
            job,
            db_session,
            artifact_id,
            {
                "status": "running",
                "updated_at": datetime.utcnow().isoformat(),
                "error": None,
            },
        )

        writer = ArtifactWriter(str(job.id))
        try:
            if mode in {"full", "schema-only"}:
                for table_name in ordered_tables:
                    writer.write_statement(self._generate_create_table_sql(table_name, context, target, warnings))

            if mode in {"full", "data-only"}:
                for table_name in ordered_tables:
                    table = context["tables"][table_name]
                    columns = [column["name"] for column in table["columns"]]
                    if not columns:
                        continue
                    for rows in self._iter_table_row_chunks(
                        table_name,
                        columns,
                        row_limit_per_table=row_limit,
                        chunk_size=chunk_size,
                    ):
                        statement = self._render_insert_chunk_statement(
                            table_name=table_name,
                            columns=columns,
                            mapping_state=table.get("mapping_state") or {},
                            rows=rows,
                            target_dialect=target,
                        )
                        writer.write_statement(statement, row_count=len(rows))

            stats = writer.finalize()
        except Exception:
            Path(writer.file_path).unlink(missing_ok=True)
            raise

        artifact_entry = {
            "artifact_id": artifact_id,
            "kind": normalized_kind,
            "target_dialect": target,
            "export_mode": mode,
            "file_path": stats.file_path,
            "size_bytes": stats.size_bytes,
            "statement_count": stats.statement_count,
            "row_count": stats.row_count,
            "status": "completed",
            "warnings": self._dedupe(warnings),
            "blocking_issues": self._dedupe(validation.blocking_issues),
            "unmapped_columns": self._dedupe(validation.unmapped_columns),
            "auto_fixes_applied": self._dedupe(auto_fixes),
            "validation_result": {
                "blocked": validation.blocked,
                "warnings": self._dedupe(validation.warnings),
                "blocking_issues": self._dedupe(validation.blocking_issues),
                "unmapped_columns": self._dedupe(validation.unmapped_columns),
                "validated_at": None,
            },
            "sample_rows_per_table": row_limit,
            "sample_table_limit": table_limit,
            "requires_generation": False,
            "created_at": stats.created_at,
            "updated_at": datetime.utcnow().isoformat(),
            "error": None,
        }
        self._save_artifact_entry(job, db_session, artifact_entry)
        return artifact_entry

    def validate_stored_artifact(self, *, job: Job, db_session: Session, artifact_id: str) -> dict[str, Any]:
        artifact_entry = self.get_artifact_entry(job, artifact_id)
        if not artifact_entry:
            raise ValueError("Stored artifact not found.")
        if artifact_entry.get("status") != "completed":
            raise ValueError("Stored artifact is not ready yet.")
        file_path = artifact_entry.get("file_path")
        if not file_path or not Path(file_path).exists():
            raise ValueError("Stored artifact file is missing.")

        validation = self._validate(
            job,
            db_session,
            self._load_status_context(job, table_limit=artifact_entry.get("sample_table_limit")),
            artifact_entry.get("target_dialect") or "postgresql",
        )
        validated_at = datetime.utcnow().isoformat()
        artifact_entry["validation_result"] = {
            "blocked": validation.blocked,
            "warnings": self._dedupe(validation.warnings),
            "blocking_issues": self._dedupe(validation.blocking_issues),
            "unmapped_columns": self._dedupe(validation.unmapped_columns),
            "validated_at": validated_at,
        }
        artifact_entry["warnings"] = self._dedupe(validation.warnings)
        artifact_entry["blocking_issues"] = self._dedupe(validation.blocking_issues)
        artifact_entry["unmapped_columns"] = self._dedupe(validation.unmapped_columns)
        artifact_entry["updated_at"] = validated_at
        self._save_artifact_entry(job, db_session, artifact_entry)
        return artifact_entry

    def store_manual_artifact(
        self,
        *,
        job: Job,
        db_session: Session,
        sql: str,
        target_dialect: str,
        export_mode: str,
        validation: ExportValidationResult | None = None,
    ) -> dict[str, Any]:
        target = self._normalize_dialect(target_dialect)
        mode = self._normalize_mode(export_mode)
        validation = validation or self._validate_manual_sql(sql, target)
        writer = ArtifactWriter(str(job.id))
        writer.write_text(sql.strip())
        stats = writer.finalize()
        artifact_entry = {
            "artifact_id": stats.artifact_id,
            "kind": "manual",
            "target_dialect": target,
            "export_mode": mode,
            "file_path": stats.file_path,
            "size_bytes": stats.size_bytes,
            "statement_count": stats.statement_count,
            "row_count": stats.row_count,
            "status": "completed",
            "warnings": self._dedupe(validation.warnings),
            "blocking_issues": self._dedupe(validation.blocking_issues),
            "unmapped_columns": self._dedupe(validation.unmapped_columns),
            "auto_fixes_applied": [],
            "validation_result": {
                "blocked": validation.blocked,
                "warnings": self._dedupe(validation.warnings),
                "blocking_issues": self._dedupe(validation.blocking_issues),
                "unmapped_columns": self._dedupe(validation.unmapped_columns),
                "validated_at": stats.created_at,
            },
            "sample_rows_per_table": None,
            "sample_table_limit": None,
            "requires_generation": False,
            "created_at": stats.created_at,
            "updated_at": stats.created_at,
            "error": None,
        }
        self._save_artifact_entry(job, db_session, artifact_entry)
        return artifact_entry

    def mark_artifact_failed(self, *, job: Job, db_session: Session, artifact_id: str, error: str) -> None:
        existing = self.get_artifact_entry(job, artifact_id)
        if not existing:
            return
        existing["status"] = "failed"
        existing["error"] = error
        existing["requires_generation"] = True
        existing["updated_at"] = datetime.utcnow().isoformat()
        self._save_artifact_entry(job, db_session, existing)

    def get_artifact_entry(self, job: Job, artifact_id: str) -> dict[str, Any] | None:
        store = ((job.profile or {}).get("export_artifacts") or {}) if job.profile else {}
        catalog = store.get("catalog") or {}
        artifact = catalog.get(artifact_id)
        return dict(artifact) if artifact else None

    def list_artifacts(self, job: Job) -> list[dict[str, Any]]:
        store = ((job.profile or {}).get("export_artifacts") or {}) if job.profile else {}
        catalog = store.get("catalog") or {}
        return sorted((dict(item) for item in catalog.values()), key=lambda item: item.get("created_at") or "", reverse=True)

    def resolve_download_artifact(self, job: Job, *, kind: str, target_dialect: str = "postgresql") -> dict[str, Any]:
        artifact_status = self._artifact_status(job)
        if kind == "manual":
            artifact = artifact_status.get("manual_edits_version")
        elif kind == "translated":
            artifact = (artifact_status.get("translated_sql_version") or {}).get(target_dialect)
        else:
            artifact = artifact_status.get("cleaned_sql_version")
        if not artifact:
            raise ValueError("No stored export artifact is available for download.")
        file_path = artifact.get("file_path")
        if not file_path or not Path(file_path).exists():
            raise ValueError("Stored export artifact file is missing.")
        return artifact

    def _normalize_dialect(self, dialect: str) -> str:
        normalized = (dialect or "postgresql").lower()
        if normalized not in SUPPORTED_DIALECTS:
            raise ValueError(f"Unsupported target dialect: {dialect}")
        return normalized

    def _normalize_mode(self, export_mode: str) -> str:
        normalized = (export_mode or "full").lower()
        if normalized not in SUPPORTED_EXPORT_MODES:
            raise ValueError(f"Unsupported export mode: {export_mode}")
        return normalized

    def _normalize_generate_kind(self, kind: str) -> str:
        normalized = (kind or "clean").lower()
        if normalized not in {"clean", "translated"}:
            raise ValueError(f"Unsupported artifact kind: {kind}")
        return normalized

    def _load_context(
        self,
        job: Job,
        *,
        include_rows: bool,
        row_limit_per_table: int | None = None,
        table_limit: int | None = None,
    ) -> dict[str, Any]:
        inspector = inspect(staging_engine)
        profile = job.profile or {}
        profile_tables = profile.get("tables") or {}
        table_names = list(profile_tables.keys()) or inspector.get_table_names(schema="staging")
        if table_limit:
            table_names = table_names[:table_limit]
        mapping_state = profile.get("mapping_state") or {}
        tables: dict[str, dict[str, Any]] = {}

        with staging_engine.connect() as conn:
            for table_name in table_names:
                table_profile = profile_tables.get(table_name) or {}
                columns = inspector.get_columns(table_name, schema="staging")
                pk_constraint = inspector.get_pk_constraint(table_name, schema="staging")
                foreign_keys = table_profile.get("foreign_keys") or inspector.get_foreign_keys(table_name, schema="staging")
                rows: list[dict[str, Any]] = []
                if include_rows:
                    query = f'SELECT * FROM staging."{table_name}"'
                    if row_limit_per_table:
                        query += f" LIMIT {int(row_limit_per_table)}"
                    rows = [dict(row) for row in conn.execute(text(query)).mappings().all()]
                tables[table_name] = {
                    "name": table_name,
                    "columns": [
                        {
                            "name": column["name"],
                            "type": str(self._lookup_profile_type(table_profile, column["name"]) or column["type"]),
                            "nullable": bool(column.get("nullable", True)),
                            "default": column.get("default"),
                        }
                        for column in columns
                    ],
                    "primary_keys": table_profile.get("primary_keys") or pk_constraint.get("constrained_columns", []),
                    "foreign_keys": foreign_keys,
                    "rows": rows,
                    "mapping_state": mapping_state.get(table_name, {}),
                }
        return {"tables": tables}

    def _load_status_context(self, job: Job, *, table_limit: int | None = None) -> dict[str, Any]:
        return self._load_context(job, include_rows=False, table_limit=table_limit)

    def _artifact_status(self, job: Job) -> dict[str, Any]:
        store = ((job.profile or {}).get("export_artifacts") or {}) if job.profile else {}
        catalog = store.get("catalog") or {}
        cleaned_id = (store.get("latest") or {}).get("clean")
        manual_id = (store.get("latest") or {}).get("manual")
        translated_ids = ((store.get("latest") or {}).get("translated") or {})

        def pick(artifact_id: str | None) -> dict[str, Any] | None:
            artifact = catalog.get(artifact_id) if artifact_id else None
            if not artifact or artifact.get("status") != "completed":
                return None
            return dict(artifact)

        translated = {
            dialect: artifact
            for dialect, artifact_id in translated_ids.items()
            if (artifact := pick(artifact_id))
        }

        return {
            "original_source_sql_reference": store.get("original_source_sql_reference"),
            "cleaned_sql_version": pick(cleaned_id),
            "translated_sql_version": translated,
            "manual_edits_version": pick(manual_id),
            "validation_result": store.get("validation_result"),
            "created_at": store.get("created_at"),
            "catalog": [dict(item) for item in sorted(catalog.values(), key=lambda value: value.get("created_at") or "", reverse=True)],
        }

    def _lookup_profile_type(self, table_profile: dict[str, Any], column_name: str) -> str | None:
        for column in table_profile.get("columns", []):
            if column.get("name") == column_name:
                return column.get("type")
        return None

    def _order_tables(self, tables: dict[str, dict[str, Any]]) -> list[str]:
        graph = defaultdict(set)
        indegree = {name: 0 for name in tables}
        for table_name, table in tables.items():
            for fk in table.get("foreign_keys", []):
                target = fk.get("referred_table")
                if target and target in tables and target != table_name and table_name not in graph[target]:
                    graph[target].add(table_name)
                    indegree[table_name] += 1

        queue = deque(sorted(name for name, degree in indegree.items() if degree == 0))
        ordered = []
        while queue:
            current = queue.popleft()
            ordered.append(current)
            for dependent in sorted(graph[current]):
                indegree[dependent] -= 1
                if indegree[dependent] == 0:
                    queue.append(dependent)

        remaining = [name for name in tables if name not in ordered]
        ordered.extend(sorted(remaining))
        return ordered

    def _validate(self, job: Job, db_session: Session, context: dict[str, Any], target_dialect: str) -> ExportValidationResult:
        warnings: list[str] = []
        blocking_issues: list[str] = []
        unmapped_columns: list[str] = []
        auto_fixes: list[str] = []

        quality = self._ensure_quality_report(job, db_session)
        if quality.get("duplicate_count", 0) > 0:
            blocking_issues.append("Duplicate rows were detected in the active source.")
        if quality.get("orphan_fk_count", 0) > 0:
            blocking_issues.append("Orphan foreign key records were detected in the active source.")

        for table_name, table in context["tables"].items():
            saved = table.get("mapping_state") or {}
            for column in table["columns"]:
                source_name = column["name"]
                target_name = saved.get(source_name, source_name)
                if target_name in ("", None):
                    unmapped_columns.append(f"{table_name}.{source_name}")

        if unmapped_columns:
            blocking_issues.append("One or more columns are explicitly unmapped.")

        if target_dialect != "postgresql":
            warnings.append(f"SQL will be translated from PostgreSQL staging syntax to {target_dialect}.")

        return ExportValidationResult(
            blocked=bool(blocking_issues),
            warnings=self._dedupe(warnings),
            blocking_issues=self._dedupe(blocking_issues),
            unmapped_columns=self._dedupe(unmapped_columns),
            auto_fixes_applied=self._dedupe(auto_fixes),
        )

    def _ensure_quality_report(self, job: Job, db_session: Session) -> dict[str, Any]:
        profile = job.profile or {}
        cached = profile.get("quality_report")
        if cached:
            return cached

        raw = run_integrity_checks(db_session, str(job.id))
        cached = {
            "duplicate_count": len(raw.get("duplicate_keys", [])),
            "null_risk_count": len(raw.get("null_risks", [])),
            "orphan_fk_count": len(raw.get("orphan_foreign_keys", [])),
            "type_mismatch_count": 0,
            "issues": [],
            "raw_report": raw,
        }
        profile["quality_report"] = cached
        job.profile = profile
        db_session.commit()
        return cached

    def _build_cleaning_suggestions(self, sql: str, target_dialect: str, warnings: list[str]) -> list[str]:
        suggestions = [
            "Remove invalid statements before final export.",
            "Normalize identifiers to avoid quoting issues across dialects.",
            "Fix unsupported defaults such as dialect-specific NOW()/BOOLEAN forms.",
            "Detect broken constraints and review inferred foreign keys.",
            "Flag unsupported dialect syntax before running against a live destination.",
        ]
        if target_dialect != "postgresql":
            suggestions.append(f"Review translated {target_dialect} syntax for target-specific type/default adjustments.")
        suggestions.extend(warnings[:3])
        return self._dedupe(suggestions)

    def _validate_manual_sql(self, sql: str, target_dialect: str) -> ExportValidationResult:
        text_sql = (sql or "").strip()
        blocking_issues: list[str] = []
        warnings: list[str] = []
        if not text_sql:
            blocking_issues.append("Manual SQL is empty.")
        if ";" not in text_sql:
            warnings.append("SQL preview does not contain statement terminators.")
        upper_sql = text_sql.upper()
        if not any(keyword in upper_sql for keyword in ("CREATE TABLE", "INSERT INTO", "ALTER TABLE", "COPY ")):
            blocking_issues.append("Manual SQL does not contain recognized schema/data statements.")
        if target_dialect == "sqlite" and "SERIAL" in upper_sql:
            warnings.append("SERIAL is not native to SQLite and should be normalized.")
        if "INVALID" in upper_sql:
            blocking_issues.append("Manual SQL contains invalid placeholder syntax.")
        return ExportValidationResult(
            blocked=bool(blocking_issues),
            warnings=self._dedupe(warnings),
            blocking_issues=self._dedupe(blocking_issues),
            unmapped_columns=[],
            auto_fixes_applied=[],
        )

    def _save_artifact_entry(self, job: Job, db_session: Session, artifact_entry: dict[str, Any]) -> None:
        profile = job.profile or {}
        artifacts = profile.get("export_artifacts") or {}
        catalog = artifacts.get("catalog") or {}
        latest = artifacts.get("latest") or {"translated": {}}
        artifact_id = artifact_entry["artifact_id"]
        catalog[artifact_id] = artifact_entry
        if artifact_entry["kind"] == "clean" and artifact_entry.get("status") == "completed":
            latest["clean"] = artifact_id
        elif artifact_entry["kind"] == "translated" and artifact_entry.get("status") == "completed":
            translated = latest.get("translated") or {}
            translated[artifact_entry["target_dialect"]] = artifact_id
            latest["translated"] = translated
        elif artifact_entry["kind"] == "manual" and artifact_entry.get("status") == "completed":
            latest["manual"] = artifact_id

        artifacts["catalog"] = catalog
        artifacts["latest"] = latest
        artifacts["cleaned_sql_version"] = catalog.get(latest.get("clean")) if latest.get("clean") else None
        artifacts["manual_edits_version"] = catalog.get(latest.get("manual")) if latest.get("manual") else None
        artifacts["translated_sql_version"] = {
            dialect: catalog.get(target_artifact_id)
            for dialect, target_artifact_id in (latest.get("translated") or {}).items()
            if catalog.get(target_artifact_id)
        }
        artifacts["original_source_sql_reference"] = artifacts.get("original_source_sql_reference") or {
            "job_id": str(job.id),
            "filename": job.original_filename or job.filename,
            "created_at": artifact_entry.get("created_at") or datetime.utcnow().isoformat(),
        }
        artifacts["validation_result"] = artifact_entry.get("validation_result")
        artifacts["created_at"] = artifacts.get("created_at") or artifact_entry.get("created_at") or datetime.utcnow().isoformat()
        profile["export_artifacts"] = artifacts
        job.profile = profile
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

    def _update_artifact_entry(self, job: Job, db_session: Session, artifact_id: str, updates: dict[str, Any]) -> None:
        current = self.get_artifact_entry(job, artifact_id)
        if not current:
            return
        current.update(updates)
        self._save_artifact_entry(job, db_session, current)

    def _new_artifact_id(self) -> str:
        return str(uuid.uuid4())

    def _generate_create_table_sql(self, table_name: str, context: dict[str, Any], target_dialect: str, warnings: list[str]) -> str:
        table = context["tables"][table_name]
        column_lines = []
        for column in table["columns"]:
            line = self._render_column_definition(column, target_dialect, warnings)
            column_lines.append(line)
        if table["primary_keys"]:
            pk_cols = ", ".join(self._quote_identifier(col, target_dialect) for col in table["primary_keys"])
            column_lines.append(f"PRIMARY KEY ({pk_cols})")
        for fk in table.get("foreign_keys", []):
            constrained = fk.get("constrained_columns") or []
            referred = fk.get("referred_columns") or []
            target_table = fk.get("referred_table")
            if not constrained or not referred or not target_table:
                continue
            source_cols = ", ".join(self._quote_identifier(col, target_dialect) for col in constrained)
            target_cols = ", ".join(self._quote_identifier(col, target_dialect) for col in referred)
            column_lines.append(
                f"FOREIGN KEY ({source_cols}) REFERENCES {self._qualified_table_name(target_table, target_dialect)} ({target_cols})"
            )
        return f"CREATE TABLE {self._qualified_table_name(table_name, target_dialect)} (\n  " + ",\n  ".join(column_lines) + "\n)"

    def _render_column_definition(self, column: dict[str, Any], target_dialect: str, warnings: list[str]) -> str:
        name = self._quote_identifier(column["name"], target_dialect)
        source_type = column["type"]
        rendered_type, type_warnings = self._translate_type(source_type, target_dialect)
        warnings.extend(type_warnings)
        parts = [name, rendered_type]
        if not column.get("nullable", True):
            parts.append("NOT NULL")
        if column.get("default") is not None:
            default_value, default_warnings = self._translate_default(str(column["default"]), target_dialect)
            warnings.extend(default_warnings)
            parts.append(f"DEFAULT {default_value}")
        return " ".join(parts)

    def _generate_insert_sql(self, table_name: str, context: dict[str, Any], target_dialect: str) -> tuple[str, list[str]]:
        table = context["tables"][table_name]
        rows = table["rows"]
        if not rows:
            return "", []
        columns = [column["name"] for column in table["columns"]]
        return (
            "\n".join(
                self._ensure_statement_terminated(
                    self._render_insert_chunk_statement(
                    table_name=table_name,
                    columns=columns,
                    mapping_state=table.get("mapping_state") or {},
                    rows=[row],
                    target_dialect=target_dialect,
                )
                )
                for row in rows
            ),
            [],
        )

    def _iter_table_row_chunks(
        self,
        table_name: str,
        columns: list[str],
        *,
        row_limit_per_table: int | None,
        chunk_size: int,
    ):
        quoted_columns = ", ".join(f'"{column}"' for column in columns)
        query = f'SELECT {quoted_columns} FROM staging."{table_name}"'
        if row_limit_per_table:
            query += f" LIMIT {int(row_limit_per_table)}"
        with staging_engine.connect().execution_options(stream_results=True) as conn:
            result = conn.execute(text(query)).mappings()
            while True:
                rows = result.fetchmany(chunk_size)
                if not rows:
                    break
                yield [dict(row) for row in rows]

    def _render_insert_chunk_statement(
        self,
        *,
        table_name: str,
        columns: list[str],
        mapping_state: dict[str, str],
        rows: list[dict[str, Any]],
        target_dialect: str,
    ) -> str:
        target_columns = [
            self._quote_identifier(mapping_state.get(column, column) or column, target_dialect) for column in columns
        ]
        values_sql = []
        for row in rows:
            values = [self._render_literal(row.get(column), target_dialect) for column in columns]
            values_sql.append(f"({', '.join(values)})")
        return (
            f"INSERT INTO {self._qualified_table_name(table_name, target_dialect)} "
            f"({', '.join(target_columns)}) VALUES {', '.join(values_sql)}"
        )

    def _translate_type(self, source_type: str, target_dialect: str) -> tuple[str, list[str]]:
        lowered = source_type.lower()
        warnings: list[str] = []
        if target_dialect == "postgresql":
            return source_type, warnings

        type_map = {
            "mysql": {
                "serial": "BIGINT AUTO_INCREMENT",
                "bigserial": "BIGINT AUTO_INCREMENT",
                "boolean": "TINYINT(1)",
                "text": "LONGTEXT",
                "json": "JSON",
                "timestamp with time zone": "DATETIME",
                "timestamp without time zone": "DATETIME",
                "uuid": "CHAR(36)",
            },
            "sqlite": {
                "serial": "INTEGER",
                "bigserial": "INTEGER",
                "boolean": "INTEGER",
                "text": "TEXT",
                "json": "TEXT",
                "timestamp with time zone": "TEXT",
                "timestamp without time zone": "TEXT",
                "uuid": "TEXT",
            },
        }
        for source_fragment, mapped in type_map[target_dialect].items():
            if lowered == source_fragment or lowered.startswith(source_fragment + "("):
                return mapped, warnings
        if lowered.startswith("character varying"):
            return ("VARCHAR" + lowered[len("character varying"):]).upper(), warnings
        if lowered.startswith("varchar"):
            return source_type.upper(), warnings
        if lowered.startswith("numeric"):
            return source_type.upper(), warnings
        warnings.append(f"Type '{source_type}' was passed through without a specialized {target_dialect} transform.")
        return source_type.upper(), warnings

    def _translate_default(self, default_value: str, target_dialect: str) -> tuple[str, list[str]]:
        lowered = default_value.lower()
        warnings: list[str] = []
        if "now()" in lowered or "current_timestamp" in lowered:
            mapped = {
                "postgresql": "CURRENT_TIMESTAMP",
                "mysql": "CURRENT_TIMESTAMP",
                "sqlite": "CURRENT_TIMESTAMP",
            }[target_dialect]
            return mapped, warnings
        if lowered in {"true", "false"}:
            if target_dialect == "postgresql":
                return lowered.upper(), warnings
            return ("1" if lowered == "true" else "0"), warnings
        return default_value, warnings

    def _render_literal(self, value: Any, target_dialect: str) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            if target_dialect == "postgresql":
                return "TRUE" if value else "FALSE"
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        escaped = str(value).replace("'", "''")
        return f"'{escaped}'"

    def _qualified_table_name(self, table_name: str, target_dialect: str) -> str:
        if target_dialect == "postgresql":
            return f'public.{self._quote_identifier(table_name, target_dialect)}'
        return self._quote_identifier(table_name, target_dialect)

    def _quote_identifier(self, identifier: str, target_dialect: str) -> str:
        if target_dialect == "mysql":
            return f"`{identifier}`"
        return f'"{identifier}"'

    def _dedupe(self, values: list[str]) -> list[str]:
        seen = set()
        result = []
        for value in values:
            if value in seen:
                continue
            seen.add(value)
            result.append(value)
        return result

    def _ensure_statement_terminated(self, statement: str) -> str:
        value = (statement or "").strip()
        if not value:
            return value
        return value if value.endswith(";") else f"{value};"

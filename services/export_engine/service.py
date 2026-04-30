from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from apps.api.database import staging_engine
from apps.api.models import Job
from services.data_intelligence.integrity_checker import run_integrity_checks


SUPPORTED_DIALECTS = {"postgresql", "mysql", "sqlite"}
SUPPORTED_EXPORT_MODES = {"full", "schema-only", "data-only"}


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
    ) -> ExportArtifact:
        target = self._normalize_dialect(target_dialect)
        mode = self._normalize_mode(export_mode)
        context = self._load_context(job)
        validation = self._validate(job, db_session, context, target)
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
                statements.append(self._generate_create_table_sql(table_name, context, target, warnings))

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
    ) -> dict[str, Any]:
        artifact = self.build_export(
            job=job,
            db_session=db_session,
            target_dialect=target_dialect,
            export_mode=export_mode,
            override_validation=override_validation,
        )
        return {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "target_dialect": artifact.target_dialect,
            "export_mode": artifact.mode,
            "preview": artifact.sql[:50000],
            "warnings": artifact.warnings,
            "blocking_issues": artifact.blocking_issues,
            "auto_fixes_applied": artifact.auto_fixes_applied,
            "table_order": artifact.table_order,
            "blocked": artifact.validation.blocked,
            "unmapped_columns": artifact.validation.unmapped_columns,
        }

    def build_status_payload(self, job: Job, db_session: Session) -> dict[str, Any]:
        quality_report = self._ensure_quality_report(job, db_session)
        validation = self._validate(job, db_session, self._load_context(job), "postgresql")
        metadata = ((job.profile or {}).get("metadata") or {}) if job.profile else {}
        return {
            "job_id": str(job.id),
            "project_id": str(job.project_id),
            "clean_sql_ready": not validation.blocked,
            "translated_sql_ready": not validation.blocked,
            "excel_ready": True,
            "artifact_sizes": {
                "clean_sql_bytes": None,
                "translated_sql_bytes": None,
                "excel_bytes": None,
            },
            "preview_available": True,
            "dialect": metadata.get("flavor") or metadata.get("dialect"),
            "filename": job.original_filename or job.filename,
            "validation": {
                "blocked": validation.blocked,
                "warnings": validation.warnings,
                "blocking_issues": validation.blocking_issues,
                "unmapped_columns": validation.unmapped_columns,
            },
            "quality_summary": {
                "duplicate_count": quality_report.get("duplicate_count", 0),
                "null_risk_count": quality_report.get("null_risk_count", 0),
                "orphan_fk_count": quality_report.get("orphan_fk_count", 0),
                "type_mismatch_count": quality_report.get("type_mismatch_count", 0),
            },
        }

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

    def _load_context(self, job: Job) -> dict[str, Any]:
        inspector = inspect(staging_engine)
        profile = job.profile or {}
        profile_tables = profile.get("tables") or {}
        table_names = list(profile_tables.keys()) or inspector.get_table_names(schema="staging")
        mapping_state = profile.get("mapping_state") or {}
        tables: dict[str, dict[str, Any]] = {}

        with staging_engine.connect() as conn:
            for table_name in table_names:
                table_profile = profile_tables.get(table_name) or {}
                columns = inspector.get_columns(table_name, schema="staging")
                pk_constraint = inspector.get_pk_constraint(table_name, schema="staging")
                foreign_keys = table_profile.get("foreign_keys") or inspector.get_foreign_keys(table_name, schema="staging")
                rows = conn.execute(text(f'SELECT * FROM staging."{table_name}"')).mappings().all()
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
                    "rows": [dict(row) for row in rows],
                    "mapping_state": mapping_state.get(table_name, {}),
                }
        return {"tables": tables}

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
        return f"CREATE TABLE {self._qualified_table_name(table_name, target_dialect)} (\n  " + ",\n  ".join(column_lines) + "\n);"

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
        warnings: list[str] = []
        columns = [column["name"] for column in table["columns"]]
        target_columns = [
            self._quote_identifier(table.get("mapping_state", {}).get(column, column), target_dialect) for column in columns
        ]
        statements = []
        for row in rows:
            values = [self._render_literal(row.get(column), target_dialect) for column in columns]
            statements.append(
                f"INSERT INTO {self._qualified_table_name(table_name, target_dialect)} ({', '.join(target_columns)}) VALUES ({', '.join(values)});"
            )
        return "\n".join(statements), warnings

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

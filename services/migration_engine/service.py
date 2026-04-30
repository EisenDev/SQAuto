# services/migration_engine/service.py
"""Migration Engine Service — Phase 1: Dry-Run Only.

Provides target database connection testing and dry-run migration validation.
SAFETY: This service NEVER executes INSERT, UPDATE, DELETE, DROP, TRUNCATE,
ALTER, or CREATE against target databases. Only SELECT and metadata queries.
"""

import logging
import uuid
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

from services.migration_engine.target_connection import (
    build_localhost_hint,
    build_target_connection_url,
    is_metadata_database_target,
    sanitize_target_connection_settings,
)

logger = logging.getLogger("sqauto.migration_engine")


class MigrationEngineService:
    """Core migration engine for target DB connectivity and dry-run validation."""

    def get_target_connection_settings(self, source, *, caller: str, target_id: str | None = None) -> dict:
        settings = sanitize_target_connection_settings(source)
        logger.info(
            "target_connection caller=%s target_id=%s connection_name=%s host=%s port=%s database=%s db_type=%s ssl_mode=%s",
            caller,
            target_id,
            settings.get("connection_name") or "<unnamed>",
            settings["host"],
            settings["port"],
            settings["database_name"],
            settings["db_type"],
            settings["ssl_mode"],
        )
        return settings

    def precheck_connection(self, source, *, caller: str, target_id: str | None = None) -> dict:
        try:
            settings = self.get_target_connection_settings(source, caller=caller, target_id=target_id)
        except ValueError as exc:
            detail = exc.args[0] if exc.args else {"error_type": "invalid_target_configuration", "message": "Invalid target configuration"}
            return {
                "success": False,
                "db_type": None,
                "db_version": None,
                "error_type": detail.get("error_type", "invalid_target_configuration"),
                "error": detail.get("message", "Invalid target configuration"),
                "message": detail.get("message", "Invalid target configuration"),
                "hint": None,
                "fields": detail.get("fields", []),
                "settings": {k: v for k, v in settings.items() if k != "password"} if "settings" in locals() else None,
            }

        localhost_hint = build_localhost_hint(settings["host"])
        if localhost_hint:
            return {
                "success": False,
                "db_type": settings["db_type"],
                "db_version": None,
                "error_type": "target_connection_failed",
                "error": "The simulation backend cannot reach this target database.",
                "message": "The simulation backend cannot reach this target database.",
                "hint": localhost_hint,
                "fields": [],
                "settings": {k: v for k, v in settings.items() if k != "password"},
            }
        result = self.test_connection(settings, caller=caller, target_id=target_id, prevalidated=True)
        if result.get("success") and is_metadata_database_target(settings):
            result["warning"] = (
                "You are selecting the SQAuto application database as a simulation destination. "
                "This is allowed only for testing if simulation uses a temporary schema and cleanup is guaranteed. "
                "Do not use this for live migration."
            )
            result["is_application_db"] = True
        else:
            result["warning"] = None
            result["is_application_db"] = False
        return result

    def test_connection(self, config: dict, *, caller: str = "test_connection", target_id: str | None = None, prevalidated: bool = False) -> dict:
        """Test connectivity to a target PostgreSQL database.
        
        Uses only SELECT version() — no schema mutations.
        
        Args:
            config: dict with host, port, database_name, username, password, ssl_mode
            
        Returns:
            dict with success, db_type, db_version, error
        """
        settings = config
        try:
            settings = config if prevalidated else self.get_target_connection_settings(config, caller=caller, target_id=target_id)
            url = build_target_connection_url(settings)
            
            engine = create_engine(
                url,
                connect_args={"connect_timeout": 10},
                echo=False,
            )
            
            with engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version_str = result.scalar()
            
            engine.dispose()
            
            logger.info(f"Connection test PASSED for {settings['host']}:{settings['port']}/{settings['database_name']}")
            return {
                "success": True,
                "db_type": settings["db_type"],
                "db_version": version_str,
                "error": None,
                "message": None,
                "hint": None,
                "settings": {k: v for k, v in settings.items() if k != "password"},
            }
        except Exception as e:
            err_msg = str(e)
            
            # Detect timeouts and provide guidance
            error_type = "connection_failed"
            if "timeout" in err_msg.lower() or "connection timeout" in err_msg.lower():
                error_type = "connection_timeout"
                if any(x in str(settings.get("host", "")) for x in ["127.0.0.1", "localhost", "192.168.", "10."]):
                    err_msg = (
                        "Connection timed out. The SQAuto server cannot reach this database host/port. "
                        "If SQAuto is deployed on Azure, local/LAN IPs like 127.0.0.1 or 192.168.x.x will not work "
                        "unless exposed through VPN/tunnel/firewall."
                    )
                else:
                    err_msg = "Connection timed out. Ensure the database host is reachable and firewall allows traffic from SQAuto server."

            # Scrub password from error messages
            if isinstance(settings, dict) and settings.get("password"):
                err_msg = err_msg.replace(settings["password"], "***")
            localhost_hint = build_localhost_hint(str(settings.get("host", ""))) if isinstance(settings, dict) else None
            
            logger.warning(f"Connection test FAILED for {settings.get('host', '?') if isinstance(settings, dict) else '?'}: {err_msg}")
            return {
                "success": False,
                "db_type": settings.get("db_type", "postgresql") if isinstance(settings, dict) else "postgresql",
                "db_version": None,
                "error": err_msg,
                "error_type": error_type,
                "message": err_msg,
                "hint": localhost_hint,
                "settings": {k: v for k, v in settings.items() if k != "password"} if isinstance(settings, dict) else None,
            }

    def run_dry_run(self, run_id: uuid.UUID, source_job_id: uuid.UUID, target_config: dict, db_session: Session):
        """Execute a dry-run migration validation.
        
        Compares staging schema against target schema.
        Only uses SELECT and metadata inspection queries against the target.
        
        Args:
            run_id: UUID of the MigrationRun record
            source_job_id: UUID of the source Job
            target_config: dict with connection details
            db_session: SQLAlchemy session for system DB updates
        """
        from apps.api.models import MigrationRun, MigrationRunStatus, MigrationLog, MigrationLogLevel
        from apps.api.database import staging_engine
        
        run = db_session.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if not run:
            logger.error(f"Dry-run aborted: MigrationRun {run_id} not found")
            return

        # Mark as running
        run.status = MigrationRunStatus.RUNNING
        run.started_at = datetime.utcnow()
        db_session.commit()
        
        self._log(db_session, run_id, MigrationLogLevel.INFO, None, "Dry-run validation started")
        
        try:
            # Build target engine (read-only usage)
            ssl_mode = target_config.get("ssl_mode", "prefer")
            target_url = (
                f"postgresql+psycopg://{target_config['username']}:{target_config['password']}"
                f"@{target_config['host']}:{target_config['port']}/{target_config['database_name']}"
                f"?sslmode={ssl_mode}"
            )
            target_engine = create_engine(
                target_url,
                connect_args={"connect_timeout": 15},
                echo=False,
            )
            
            # Test target connection
            self._log(db_session, run_id, MigrationLogLevel.INFO, None, "Testing target database connection...")
            with target_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self._log(db_session, run_id, MigrationLogLevel.INFO, None, "Target database connection verified")
            
            # Get staging tables
            staging_inspector = inspect(staging_engine)
            staging_tables = staging_inspector.get_table_names(schema="staging")
            self._log(db_session, run_id, MigrationLogLevel.INFO, None, 
                      f"Found {len(staging_tables)} tables in staging schema")
            
            # Get target tables (public schema)
            target_inspector = inspect(target_engine)
            target_tables = target_inspector.get_table_names(schema="public")
            target_table_set = set(target_tables)
            self._log(db_session, run_id, MigrationLogLevel.INFO, None,
                      f"Found {len(target_tables)} tables in target public schema")
            
            # Compare schemas
            tables_checked = 0
            tables_missing_in_target = []
            row_count_comparison = []
            warnings_count = 0
            errors_count = 0
            
            for table_name in staging_tables:
                tables_checked += 1
                
                if table_name not in target_table_set:
                    tables_missing_in_target.append(table_name)
                    self._log(db_session, run_id, MigrationLogLevel.WARNING, table_name,
                              f"Table '{table_name}' exists in staging but NOT in target database")
                    warnings_count += 1
                    continue
                
                # Compare row counts (SELECT COUNT(*) only)
                try:
                    with staging_engine.connect() as s_conn:
                        source_count = s_conn.execute(
                            text(f'SELECT COUNT(*) FROM staging."{table_name}"')
                        ).scalar() or 0
                    
                    with target_engine.connect() as t_conn:
                        target_count = t_conn.execute(
                            text(f'SELECT COUNT(*) FROM public."{table_name}"')
                        ).scalar() or 0
                    
                    difference = source_count - target_count
                    status = "match" if difference == 0 else "mismatch"
                    
                    row_count_comparison.append({
                        "table": table_name,
                        "source_rows": source_count,
                        "target_rows": target_count,
                        "difference": difference,
                        "status": status
                    })
                    
                    if status == "mismatch":
                        self._log(db_session, run_id, MigrationLogLevel.WARNING, table_name,
                                  f"Row count mismatch: staging={source_count}, target={target_count}, diff={difference}")
                        warnings_count += 1
                    else:
                        self._log(db_session, run_id, MigrationLogLevel.INFO, table_name,
                                  f"Row count match: {source_count} rows verified")
                        
                except Exception as e:
                    err = str(e)
                    if target_config.get("password"):
                        err = err.replace(target_config["password"], "***")
                    self._log(db_session, run_id, MigrationLogLevel.ERROR, table_name,
                              f"Failed to compare row counts: {err}")
                    errors_count += 1
            
            # Determine overall status
            if errors_count > 0:
                overall_status = "completed_with_errors"
            elif warnings_count > 0:
                overall_status = "completed_with_warnings"
            else:
                overall_status = "completed_clean"
            
            # Build summary
            summary = {
                "tables_checked": tables_checked,
                "tables_in_staging": len(staging_tables),
                "tables_in_target": len(target_tables),
                "tables_missing_in_target": tables_missing_in_target,
                "row_count_comparison": row_count_comparison,
                "warnings_count": warnings_count,
                "errors_count": errors_count,
                "status": overall_status
            }
            
            # Update run record
            run.status = MigrationRunStatus.COMPLETED
            run.finished_at = datetime.utcnow()
            run.summary = summary
            db_session.commit()
            
            self._log(db_session, run_id, MigrationLogLevel.INFO, None,
                      f"Dry-run completed: {tables_checked} tables checked, "
                      f"{len(tables_missing_in_target)} missing, "
                      f"{warnings_count} warnings, {errors_count} errors")
            
            # Cleanup target engine
            target_engine.dispose()
            
            logger.info(f"Dry-run {run_id} completed: {overall_status}")
            
        except Exception as e:
            err_msg = str(e)
            
            # Detect timeouts in background task too
            is_local = any(x in target_config.get("host", "") for x in ["127.0.0.1", "localhost", "192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."])
            if "timeout" in err_msg.lower() or "connection timeout" in err_msg.lower() or "can't connect" in err_msg.lower():
                if is_local:
                    err_msg = (
                        "Connection timed out. The SQAuto CLOUD server cannot reach your LOCAL database host. "
                        "Addresses like 192.168.x.x or localhost are private to your home network. "
                        "Please use a public database endpoint (e.g. Supabase, Neon, AWS RDS) or a tunnel."
                    )
                else:
                    err_msg = f"Connection timed out. Ensure the database host {target_config.get('host')} is reachable and accepting connections from the SQAuto server."

            if target_config.get("password"):
                err_msg = err_msg.replace(target_config["password"], "***")
                
            logger.error(f"Dry-run {run_id} FAILED: {err_msg}")
            self._log(db_session, run_id, MigrationLogLevel.ERROR, None, f"Dry-run failed: {err_msg}")
            
            run.status = MigrationRunStatus.FAILED
            run.finished_at = datetime.utcnow()
            run.summary = {"status": "failed", "error": err_msg, "error_type": "connection_timeout" if "timeout" in err_msg.lower() else "execution_error"}
            db_session.commit()

    def _log(self, db_session: Session, run_id: uuid.UUID, level, table_name: str, message: str, context: dict = None):
        """Create a MigrationLog entry."""
        from apps.api.models import MigrationLog
        
        log_entry = MigrationLog(
            migration_run_id=run_id,
            level=level,
            table_name=table_name,
            message=message,
            context=context
        )
        db_session.add(log_entry)
        db_session.commit()

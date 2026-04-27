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

logger = logging.getLogger("sqauto.migration_engine")


class MigrationEngineService:
    """Core migration engine for target DB connectivity and dry-run validation."""

    def test_connection(self, config: dict) -> dict:
        """Test connectivity to a target PostgreSQL database.
        
        Uses only SELECT version() — no schema mutations.
        
        Args:
            config: dict with host, port, database_name, username, password, ssl_mode
            
        Returns:
            dict with success, db_type, db_version, error
        """
        try:
            ssl_mode = config.get("ssl_mode", "prefer")
            url = (
                f"postgresql+psycopg://{config['username']}:{config['password']}"
                f"@{config['host']}:{config['port']}/{config['database_name']}"
                f"?sslmode={ssl_mode}"
            )
            
            engine = create_engine(
                url,
                connect_args={"connect_timeout": 10},
                echo=False,
            )
            
            with engine.connect() as conn:
                result = conn.execute(text("SELECT version()"))
                version_str = result.scalar()
            
            engine.dispose()
            
            logger.info(f"Connection test PASSED for {config['host']}:{config['port']}/{config['database_name']}")
            return {
                "success": True,
                "db_type": "postgresql",
                "db_version": version_str,
                "error": None
            }
        except Exception as e:
            err_msg = str(e)
            
            # Detect timeouts and provide guidance
            error_type = "connection_failed"
            if "timeout" in err_msg.lower() or "connection timeout" in err_msg.lower():
                error_type = "connection_timeout"
                if any(x in config.get("host", "") for x in ["127.0.0.1", "localhost", "192.168.", "10."]):
                    err_msg = (
                        "Connection timed out. The SQAuto server cannot reach this database host/port. "
                        "If SQAuto is deployed on Azure, local/LAN IPs like 127.0.0.1 or 192.168.x.x will not work "
                        "unless exposed through VPN/tunnel/firewall."
                    )
                else:
                    err_msg = "Connection timed out. Ensure the database host is reachable and firewall allows traffic from SQAuto server."

            # Scrub password from error messages
            if config.get("password"):
                err_msg = err_msg.replace(config["password"], "***")
            
            logger.warning(f"Connection test FAILED for {config.get('host', '?')}: {err_msg}")
            return {
                "success": False,
                "db_type": "postgresql",
                "db_version": None,
                "error": err_msg,
                "error_type": error_type
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
        from apps.api.database import engine as staging_engine
        
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
            if "timeout" in err_msg.lower() or "connection timeout" in err_msg.lower():
                if any(x in target_config.get("host", "") for x in ["127.0.0.1", "localhost", "192.168.", "10."]):
                    err_msg = (
                        "Connection timed out. The SQAuto server cannot reach this database host/port. "
                        "If SQAuto is deployed on Azure, local/LAN IPs like 127.0.0.1 or 192.168.x.x will not work "
                        "unless exposed through VPN/tunnel/firewall."
                    )
                else:
                    err_msg = f"Connection timed out. Ensure the database host is reachable from SQAuto server."

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

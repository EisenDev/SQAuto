# services/migration_engine/execution_engine.py
"""Migration Execution Engine — Phase 3: Controlled Execution.

Provides safe, transaction-based execution capabilities to migrate data from
staging to the target database. Supports preview mode (rollback) and 
commit mode (execute). Blocks execution if critical integrity issues exist.
"""

import logging
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from apps.api.database import engine as staging_engine
from services.data_intelligence.integrity_checker import run_integrity_checks
from apps.api.models import MigrationPlan, MigrationRunMode, MigrationRunStatus, MigrationLog, MigrationLogLevel, MigrationTarget, Job

logger = logging.getLogger("sqauto.execution_engine")


class ExecutionEngineService:
    """Core Execution Engine handling safe migrations to target databases."""

    def check_blocking_issues(self, db_session: Session, source_job_id: str) -> dict:
        """Analyze staging database for critical migration blockers."""
        integrity_report = run_integrity_checks(db_session, source_job_id)

        blocking_reasons = []
        if integrity_report.get("duplicate_keys"):
            blocking_reasons.append(f"Duplicate primary keys strictly violate target constraints on {len(integrity_report['duplicate_keys'])} table(s).")
        if integrity_report.get("missing_primary_keys"):
            blocking_reasons.append(f"Missing primary keys on {len(integrity_report['missing_primary_keys'])} table(s) prevents safe identification and reconciliation.")
        if integrity_report.get("orphan_foreign_keys"):
            blocking_reasons.append(f"Orphan foreign keys found on {len(integrity_report['orphan_foreign_keys'])} table(s), representing relationship violations.")

        return {
            "blocked": len(blocking_reasons) > 0,
            "reasons": blocking_reasons,
            "integrity_report": integrity_report
        }

    def generate_migration_plan(self, db_session: Session, source_job_id: str, target_id: str) -> dict:
        """Analyze data and output a structured migration plan representing intended operations."""
        logger.info(f"Generating Migration Plan for Job {source_job_id} -> Target {target_id}")

        # 1. Blocking Analysis
        blocking_report = self.check_blocking_issues(db_session, source_job_id)
        
        # 2. Inspect staging
        inspector = inspect(staging_engine)
        staging_tables = inspector.get_table_names(schema="staging")

        tables_plan = []
        total_rows = 0
        warnings = []

        with staging_engine.connect() as conn:
            for table_name in staging_tables:
                try:
                    count_q = text(f'SELECT COUNT(*) FROM staging."{table_name}"')
                    row_count = conn.execute(count_q).scalar() or 0
                    total_rows += row_count
                    
                    tables_plan.append({
                        "name": table_name,
                        "action": "INSERT",
                        "row_count": row_count,
                        "mapping_applied": False  # To be connected when mapping is persisted
                    })
                except Exception as e:
                    logger.warning(f"Error reading row count for table {table_name}: {e}")

        # Assess Risk
        risk_level = "LOW"
        if total_rows > 1_000_000:
            risk_level = "MEDIUM"
        if blocking_report["blocked"]:
            risk_level = "HIGH"
            warnings.extend(blocking_report["reasons"])

        # Construct Plan payload
        plan_data = {
            "tables": tables_plan,
            "total_rows": total_rows,
            "risk_level": risk_level,
            "blocking_issues": blocking_report["reasons"],
            "warnings": warnings,
            "integrity_report": blocking_report["integrity_report"]
        }

        # Persist Plan history
        plan_record = MigrationPlan(
            source_job_id=uuid.UUID(source_job_id),
            target_id=uuid.UUID(target_id),
            plan=plan_data,
            risk_level=risk_level,
            blocked=blocking_report["blocked"],
            blocking_reasons=blocking_report["reasons"]
        )
        db_session.add(plan_record)
        db_session.commit()
        db_session.refresh(plan_record)

        plan_data["plan_id"] = str(plan_record.id)
        return plan_data

    def execute_migration(self, db_session: Session, run_id: uuid.UUID, target_config: dict, mode: str):
        """Safely execute the migration via single transaction block.
        
        Args:
            db_session: internal SQLite/PostgreSQL system metadata session
            run_id: migration run reference ID
            target_config: Target DB connection settings
            mode: "preview" (ROLLBACK) or "execute" (COMMIT if safe)
        """
        from apps.api.models import MigrationRun
        
        run = db_session.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        if not run:
            logger.error(f"Execution aborted: Target Run {run_id} not found.")
            return

        run.status = MigrationRunStatus.RUNNING
        run.started_at = datetime.utcnow()
        db_session.commit()

        self._log(db_session, run_id, MigrationLogLevel.INFO, None, f"Execution mode defined: {mode.upper()}", {"mode": mode})

        # Pre-Execution Safety Blocks
        blocking_report = self.check_blocking_issues(db_session, str(run.source_job_id))
        if blocking_report["blocked"] and mode == "execute":
            # Safety Gate Triggered
            run.status = MigrationRunStatus.BLOCKED
            run.finished_at = datetime.utcnow()
            run.summary = {
                "status": "blocked",
                "blocking_reasons": blocking_report["reasons"]
            }
            db_session.commit()
            self._log(db_session, run_id, MigrationLogLevel.ERROR, None, "Execution BLOCKED due to integrity issues.")
            return
            
        ssl_mode = target_config.get("ssl_mode", "prefer")
        target_url = (
            f"postgresql+psycopg://{target_config['username']}:{target_config['password']}"
            f"@{target_config['host']}:{target_config['port']}/{target_config['database_name']}"
            f"?sslmode={ssl_mode}"
        )
        
        # Setup specific Target Execution engine
        target_engine = create_engine(target_url, connect_args={"connect_timeout": 30}, echo=False)
        target_inspector = inspect(target_engine)
        target_tables = set(target_inspector.get_table_names(schema="public"))

        staging_inspector = inspect(staging_engine)
        staging_tables = staging_inspector.get_table_names(schema="staging")

        tables_migrated = 0
        total_rows_affected = 0
        execution_errors = 0

        # MIGRATION EXECUTION TRANSACTION ----------------------------------------
        try:
            with target_engine.begin() as transaction:  # Explicit internal BEGIN
                for table_name in staging_tables:
                    if table_name not in target_tables:
                        self._log(db_session, run_id, MigrationLogLevel.WARNING, table_name, f"Table '{table_name}' does not exist in target. Skipping execution.")
                        continue
                        
                    start_time = datetime.utcnow()
                    
                    try:
                        # Extract Rows from Staging -> Target 
                        # Note: We batch process dynamically
                        # For Phase 3, we build parameterized queries explicitly instead of blind dumping.
                        # Using pandas or generic fetchmany. 
                        
                        cols = [c["name"] for c in staging_inspector.get_columns(table_name, schema="staging")]
                        query_fetch = text(f'SELECT * FROM staging."{table_name}" LIMIT 5000') # Phase 3: Restricted limit to ensure strict safety
                        
                        with staging_engine.connect() as s_conn:
                            staging_rows = s_conn.execute(query_fetch).fetchall()
                        
                        if not staging_rows:
                            continue
                            
                        # Build Parameterised Execution Statement
                        col_names_quoted = ", ".join([f'"{c}"' for c in cols])
                        placeholders = ", ".join([f":{c}" for c in cols])
                        
                        insert_query = text(f'INSERT INTO public."{table_name}" ({col_names_quoted}) VALUES ({placeholders})')
                        
                        # Convert explicit tuples to dict payload
                        data_payloads = [dict(zip(cols, row)) for row in staging_rows]
                        
                        # EXECUTE BATCH
                        transaction_status = "simulated" if mode == "preview" else "pending"
                        result = transaction.execute(insert_query, data_payloads)
                        rows_affected = result.rowcount
                        
                        end_time = datetime.utcnow()
                        ms_taken = int((end_time - start_time).total_seconds() * 1000)
                        
                        total_rows_affected += rows_affected
                        tables_migrated += 1
                        
                        self._log(db_session, run_id, MigrationLogLevel.INFO, table_name,
                                  f"{'Simulated' if mode == 'preview' else 'Executed'} INSERT",
                                  rows_affected=rows_affected, execution_time_ms=ms_taken, transaction_status=transaction_status)
                        
                    except Exception as e:
                        err = str(e)
                        if target_config.get("password"):
                            err = err.replace(target_config["password"], "***")
                            
                        self._log(db_session, run_id, MigrationLogLevel.ERROR, table_name, f"Execution failed on table {table_name}: {err}")
                        execution_errors += 1
                        raise Exception(err)  # Throw inner error to instantly hit Outer rollback block!

                # Final Execution Decision
                if mode == "preview":
                    logger.info("PREVIEW MODE: Issuing TRANSACTION ROLLBACK")
                    transaction.rollback()
                    run.status = MigrationRunStatus.ROLLED_BACK
                    transaction_end_state = "rolled_back"
                else: 
                    # Commit mode
                    logger.info("EXECUTION MODE: Issuing TRANSACTION COMMIT")
                    transaction.commit()
                    run.status = MigrationRunStatus.COMPLETED
                    transaction_end_state = "committed"
                    
        except Exception as e:
            # Automatic Rollback if literally any query or structural process failed during batch operations
            err_msg = str(e)
            logger.error(f"Run {run_id} FATAL EXECUTION ERROR -> TRANSACTION ROLLED BACK: {err_msg}")
            
            run.status = MigrationRunStatus.ROLLED_BACK
            run.summary = {
                "status": "rolled_back",
                "error": err_msg,
                "msg": "Safety mechanism triggered due to exception."
            }
            transaction_end_state = "error_rolled_back"
            
            self._log(db_session, run_id, MigrationLogLevel.ERROR, None, 
                      f"FATAL Execution Exception! Transaction forcibly Rolled Back. Cause: {err_msg}",
                      transaction_status="rolled_back")
        
        target_engine.dispose()
        # -------------------------------------------------------------------------
        
        # Final Summary updates
        if run.status != MigrationRunStatus.ROLLED_BACK and run.status != MigrationRunStatus.BLOCKED:
            run.summary = {
                "status": "success" if mode == "execute" else "preview_complete",
                "tables_processed": tables_migrated,
                "total_rows_affected": total_rows_affected,
                "execution_errors": execution_errors,
                "transaction_state": transaction_end_state
            }
            
        run.finished_at = datetime.utcnow()
        db_session.commit()
        
        logger.info(f"Execution {run_id} completed. End State: {run.status.value}")

    def _log(self, db_session: Session, run_id: uuid.UUID, level, table_name: str, message: str, context: dict = None, rows_affected: int = None, execution_time_ms: int = None, transaction_status: str = None):
        """Create a MigrationLog entry."""
        log_entry = MigrationLog(
            migration_run_id=run_id,
            level=level,
            table_name=table_name,
            message=message,
            context=context,
            rows_affected=rows_affected,
            execution_time_ms=execution_time_ms,
            transaction_status=transaction_status
        )
        db_session.add(log_entry)
        db_session.commit()

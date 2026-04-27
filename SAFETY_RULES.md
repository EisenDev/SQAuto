
---

# `SAFETY_RULES.md`

```md
# SAFETY_RULES.md

# Safety & Compliance Rules

These rules govern data preservation, execution safety, review requirements, and auditability across the platform.

## READ-ONLY SOURCE PRINCIPLE

1. The original SQL dump file or legacy data source is the irrefutable **source of truth**.
2. Source files and external legacy databases MUST NEVER be modified, deleted, or written to.
3. Restored raw source data must remain preserved for comparison and rollback purposes.

## STAGING SANDBOX RULE

1. All transformations, normalizations, repairs, and exclusions happen ONLY inside the staging environment.
2. No transformation logic may directly target production systems.
3. Cross-job isolation must be enforced. Data from one migration job must never mix with another.

## RAW DATA PRESERVATION

1. Raw extracted data must always be stored separately from cleaned data.
2. Original keys and source metadata must be preserved whenever possible.
3. Cleaned outputs must remain traceable back to the original source rows.

## AUDIT LOGS & TRANSPARENCY

Every meaningful action must be logged.

Stored audit artifacts must include:
- operator ID or AI trace identifier
- timestamp
- affected table
- affected column(s), if applicable
- before value(s)
- after value(s)
- reason
- inference confidence, if AI-assisted

## DECISION LIMITATIONS

1. Unresolved anomalies MUST halt the current pipeline stage and mark the job as `Needs Review` when required.
2. Dangling references must never be silently dropped.
3. Any exclusion, correction, or relation repair must be visible to operators.
4. AI suggestions must not be treated as final unless validated through approved safe rules or explicit operator review.

## EXPORT SAFETY

1. Exported outputs must represent staging-approved results only.
2. Export generation must not alter source or raw datasets.
3. Validation failures must be surfaced before export approval.

## MANUAL REVIEW REQUIREMENTS

Manual review is required when:
- deterministic logic cannot resolve a relationship
- confidence is below threshold
- validation fails
- data exclusion is being considered
- SQL translation produces unsupported or risky syntax

## NON-NEGOTIABLE RULES

- Never write to production directly
- Never overwrite raw source data
- Never hide destructive or exclusionary actions
- Never ignore unresolved relationships
- Never silently continue after critical validation failure

## TARGET DATABASE SAFETY (Phase 1)

1. During Phase 1, the migration engine operates in **dry-run mode only**.
2. Only `SELECT`, `information_schema`, and `pg_catalog` metadata queries may be executed against the target database.
3. `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, and `CREATE` commands are **strictly prohibited** against the target database.
4. The migration engine creates its own temporary connection to the target database. It must never share or interfere with the staging database engine.
5. All dry-run results must be stored in the system database, not in the target database.
6. Target database connections must be validated before any dry-run operation.

## CREDENTIAL HANDLING

1. Target database passwords must **never** be returned in API responses.
2. Target database passwords must **never** appear in application logs or frontend console output.
3. Target database passwords must **never** be displayed in full in the frontend UI (use masked input fields).
4. If secure credential storage is not implemented, document explicitly that password persistence requires future hardening.

## DATA INTELLIGENCE SAFETY (Phase 2)

1. All integrity checks must run **only against the staging schema**. Source files and target databases must not be directly analyzed for integrity.
2. All analytical queries must use `LIMIT` clauses or sampling to prevent full-table scans on large datasets.
3. NULL risk analysis must be capped at a configurable sample size (default: 10,000 rows per table).
4. Orphan FK detection must not perform cross-database joins — only queries within the staging schema are permitted.
5. SQL dialect detection is **heuristic-only** — it must never alter, transform, or re-interpret source data.
6. Schema mapping configurations are user-controlled and must never be auto-applied without explicit operator confirmation.
7. Enhanced reconciliation queries against the target database are **read-only** (`SELECT` only) and must use sampling (`LIMIT`) to prevent performance degradation.
8. Passwords in reconciliation error messages must be scrubbed before logging or returning to the API.

## CONTROLLED EXECUTION SAFETY (Phase 3)

1. **Transaction Enforcement**: ALL execution actions must be wrapped in an explicit database transaction (`BEGIN; ... COMMIT; / ROLLBACK;`).
2. **Default Rollback**: The default behavior for all execution modes and previews is `ROLLBACK`.
3. **Explicit Confirmation**: `COMMIT` is ONLY executed if the user explicitly clicked "Confirm Execution" AND no runtime errors occurred.
4. **Auto-Rollback**: If ANY error occurs during execution, an automatic `ROLLBACK` must happen immediately.
5. **Execution Blocking**: Execution MUST be blocked if critical integrity issues are detected (duplicate primary keys, complete lack of primary keys on a target table, or orphan foreign keys).
6. **Parameterized Queries Check**: Never execute raw concatenated SQL strings. Parameterization must be used to mitigate injection risks during execution.
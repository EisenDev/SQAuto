# Export Pipeline

## Scope

SQAuto export now runs as a modular backend pipeline:

1. `parse`
2. `normalize`
3. `transform`
4. `generate`

The pipeline is project-scoped and always reads from the staging schema tied to the active source job.

## Pipeline Stages

### 1. Parse

- Read profiled table metadata from `job.profile.tables`
- Inspect staging schema for:
  - columns
  - primary keys
  - foreign keys
- Load staged row data for export generation

### 2. Normalize

- Build a canonical export context per table:
  - source columns
  - inferred mapping state
  - key metadata
  - row payloads
- Compute dependency order from foreign keys so parent tables emit before child tables

### 3. Transform

- Translate source PostgreSQL-oriented staging definitions into target dialect rules
- Apply default deterministic column mapping:
  - source column name -> same target column name
- Respect explicit saved mapping state if present

### 4. Generate

Supported output modes:

- `full`
- `schema-only`
- `data-only`

Supported output types:

- clean SQL (`postgresql`)
- translated SQL (`mysql`, `sqlite`)
- Excel workbook

## Validation Gate

Exports are blocked when:

- duplicate rows are detected
- orphan foreign keys are detected
- explicit unmapped columns exist in saved mapping state

Override is supported through the export endpoints using `override_validation=true`.

When override is used:

- the export still generates
- warnings are embedded in preview/status responses
- the operator is responsible for reviewing the blocking issues

## Translation Rules

### Types

Examples:

- `SERIAL` -> `BIGINT AUTO_INCREMENT` for MySQL
- `SERIAL` -> `INTEGER` for SQLite
- `BOOLEAN` -> `TINYINT(1)` for MySQL
- `BOOLEAN` -> `INTEGER` for SQLite
- `UUID` -> `CHAR(36)` for MySQL
- `UUID` -> `TEXT` for SQLite
- `TIMESTAMP WITH TIME ZONE` -> `DATETIME` for MySQL
- `TIMESTAMP WITH TIME ZONE` -> `TEXT` for SQLite

If no specialized rule exists, the type is passed through and a warning is emitted.

### Defaults

- `NOW()` -> `CURRENT_TIMESTAMP`
- `CURRENT_TIMESTAMP` remains `CURRENT_TIMESTAMP`
- `TRUE/FALSE` -> `1/0` for MySQL and SQLite

### Constraints

- primary keys are preserved
- foreign keys are emitted after columns inside `CREATE TABLE`
- dependency ordering is derived from FK relationships

## API Surface

### Download Endpoints

- `GET /api/jobs/{job_id}/export/clean-sql`
- `GET /api/jobs/{job_id}/export/translated-sql`
- `GET /api/jobs/{job_id}/export/excel`

### Preview/Status Endpoints

- `GET /api/jobs/{job_id}/exports/status`
- `GET /api/jobs/{job_id}/exports/preview`

### Query Parameters

- `export_mode=full|schema-only|data-only`
- `target=postgresql|mysql|sqlite`
- `override_validation=true|false`

## Notes

- clean SQL defaults to PostgreSQL
- translated SQL is generated from the same normalized export context
- Excel remains available even when SQL validation is blocked, since it is a review artifact rather than a migration script

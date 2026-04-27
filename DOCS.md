# DOCS.md

# SQL Dump Data Migration Platform Documentation

## PROJECT OVERVIEW

This system is a web-based platform designed to securely manage the transition of legacy database structures into modern systems.

It provides an end-to-end pipeline that:
- Accepts SQL dump files
- Restores them into an isolated environment
- Profiles and analyzes schema
- Extracts and processes data
- Cleans and normalizes records
- Repairs broken relationships
- Validates integrity
- Exports results to Excel, Clean SQL, or Translated SQL (best effort)

## TECHNOLOGY STACK

- **Frontend:** Next.js
- **Backend:** FastAPI
- **Database (Staging):** PostgreSQL
- **Processing Engine:** Python
- **AI:** Assistant Layer (strictly assistive, non-authoritative)

---

## CORE MODULES

### 1. Dump Restore Module
Responsible for:
- Restoring SQL dumps safely
- Handling large dumps with progressive loading
- Creating isolated staging environments
- Enforcing read-only treatment of the source

### 2. Schema Profiler
Responsible for:
- Detecting tables
- Analyzing columns and constraints
- Calculating null rates
- Detecting duplicates
- Proposing candidate keys
- Identifying possible foreign key relationships
- Generating graph-ready metadata (Nodes/Edges)

### 3. Extraction Engine
Responsible for:
- Chunk-based extraction for large datasets
- Metadata tagging
- Preservation of raw extracted data
- Preparing structured staging datasets

Metadata attached to extraction output:
- `source_table`
- `extraction_timestamp`
- `batch_id`

### 4. Cleaning Engine
Responsible for:
- Standardizing casing and formatting
- Type conversion
- Null normalization
- Deduplication
- Data cleanup based on deterministic rules
- Applying configurable project-specific standardization rules

### 5. Relationship Repair Engine
Responsible for:
- Detecting orphan records
- Attempting deterministic relationship repairs
- Generating repair suggestions
- Scoring repair confidence
- Routing unresolved cases to the exception queue

### 6. Validation Engine
Responsible for:
- Row count comparison
- Distinct ID comparison
- Duplicate detection
- Relationship validation
- Data integrity checks
- Readiness scoring

### 7. Exception Queue
Responsible for:
- Holding unresolved records
- Routing medium- and low-confidence cases for review
- Allowing operators to:
  - assign approved mappings
  - mark rows for exclusion
  - apply reviewed corrections
  - re-run validation after review

### 8. Export System
Responsible for:
- Excel generation
- Clean SQL generation
- Validation report generation
- SQL dialect translation (best effort)

### 9. AI Assistant Layer
Responsible for:
- Explaining schema in plain language
- Suggesting mappings
- Detecting anomalies
- Summarizing validation findings
- Explaining relation repair suggestions
- Generating operator-friendly summaries

### 10. Migration Control Center (Phase 1)
Responsible for:
- Registering and testing target database connections
- Executing dry-run migration validations
- Comparing staging schema and row counts against target databases
- Generating reconciliation summaries
- Logging all migration events with severity and context
- Providing a visual control panel for migration operations

---

## ROADMAP

The MVP is complete. SQAuto currently supports SQL dump upload, extraction pipeline diagnostics, table/column/row exploration, schema visualization, source-of-truth data exploration, and basic export delivery.

The platform is evolving from a data extraction/exploration tool into a **full operational data migration platform**.

### Phase 1: Migration Execution Foundation (Complete ✓)
- Connect to a target PostgreSQL database
- Test target DB connectivity
- Execute dry-run migration validation (read-only)
- Compare source/staging schema and row counts against target
- Generate reconciliation summaries
- Log all migration events
- Migration Control Center UI

### Phase 2: Data Intelligence Layer (Current)
Transform the platform from "shows problems" to "understands and helps fix problems."

#### Data Integrity Detection Engine
Detects migration blockers in the staging database:
- **Duplicate Primary Keys**: Tables with repeated PK values
- **Missing Primary Keys**: Tables with no PK defined
- **Orphan Foreign Keys**: Child rows referencing non-existent parent records
- **High NULL Density**: Columns where >50% of values are NULL

Example output:
```json
{
  "tables_scanned": 45,
  "total_issues": 12,
  "duplicate_keys": [{"table": "users", "count": 54, "pk_columns": ["id"]}],
  "missing_primary_keys": ["logs", "temp_data"],
  "orphan_foreign_keys": [{"table": "documents", "column": "user_id", "references": "users.id", "count": 231}],
  "null_risks": [{"table": "documents", "column": "description", "null_percentage": 78}]
}
```

UI displays a scannable summary with expandable sections per issue type, sample values, and action recommendations.

#### Schema Mapping Layer
Provides controlled column-to-column mapping between source and target schemas:
- Editable target column names per source column
- Type match toggling (OK / Mismatch)
- Per-table mapping view with dropdown navigation
- Mapping config saved to local storage (backend persistence in Phase 3+)

#### SQL Dialect Detection
Lightweight heuristic detection on upload:
- Supports: PostgreSQL, MySQL, SQL Server, SQLite
- Uses keyword scoring with confidence percentage
- Displays as a badge on the upload card: "🐘 PostgreSQL (92%)"

#### Enhanced Reconciliation Engine
Extends Phase 1 row-count comparison with:
- Missing IDs: records in staging but not in target
- Extra IDs: records in target but not in staging
- Sampled with LIMIT clauses for performance safety

### Phase 3: Controlled Migration Execution (Current)
- Execution modes: preview (default, rollback) vs commit (execute, commit)
- Migration Plan System details affected tables, rows, mappings, and integrity risks.
- Execution preview UI to show the planned migration.
- Rollback System: always rollback on failure, preview, or cancellation.
- Smart execution blocking based on Data Intelligence integrity checks (duplicate PKs, orphan FKs, etc).

### Phase 3.1: UX Stabilization & Guidance Layer
- Fixes session-based data isolation restricting logs and plans to the current active job.
- Introduces Tooltip help system across the application.
- Updates empty-states to provide guided user flows.
- Improves terminology (Simulation instead of Dry-Run, Destination Database, Data Quality Check).

### Phase 4: Transformation Layer
- Allow mapping old columns to new columns
- Allow simple transformation rules (e.g., `committee_name` → `committee_id`)
- Column mapping editor UI

### Phase 5: SQL Dialect Translation Studio
- Detect source SQL dialect from uploaded `.sql` file
- Display dialect detection message (e.g., "PostgreSQL detected on this file")
- Translate SQL to another dialect
- Show old SQL vs translated SQL comparison
- Export Translated File button
- Opens in a new page/view while preserving current scanned data state

### Phase 6: Data Integrity Detection Tools
- Detect duplicate primary keys
- Detect orphan foreign keys
- Detect broken relationships
- Detect nullable/required-field risks
- Surface warnings: "We detected broken relations or duplicated data. Clean it using the tools."

### Phase 7: Analytics Dashboard
- Charts based on meaningful migration metrics (not random data)
- Migration risk assessment:
  - Largest tables
  - Row count distribution
  - Duplicate data count
  - Broken relationship count
  - Table complexity score
  - Migration readiness score

---

## UI STRUCTURE

The interface should be modern, minimal, and easy to understand.

### Header
Contains:
- Logo
- Active job or dump name
- System status indicator

### Upload Panel
Contains:
- Drag-and-drop SQL dump uploader
- File status
- Detected SQL dialect
- Primary actions:
  - Analyze Dump
  - Start Extraction

### Summary Panel
Shows:
- Total tables
- Total records
- Broken relations found
- Repaired relations
- Unresolved issues
- Export readiness

### Table Viewer
Allows users to:
- Browse extracted tables
- View row counts
- Filter and sort
- Inspect table health and status
- Open Schema Visualizer to see relationships

### AI Explanation Panel
Displays:
- Table summaries
- Data quality findings
- Repair explanations
- Export readiness explanations

### Export Panel
Allows export to:
- Excel
- Clean SQL
- Translated SQL
- Validation report

### Migration Control Center
Contains:
- Target database connection panel (host, port, database, username, password, test, save)
- Dry-run migration panel (source job selector, target selector, run button, status display)
- Reconciliation summary panel (tables checked, missing tables, row mismatches, warnings)
- Migration logs panel (timestamp, level, table, message)

### Advanced Tools
Collapsed by default.
Contains:
- SQL translation controls
- Threshold settings
- Chunk settings
- Advanced processing overrides

---

## USER FLOW

1. Upload SQL dump
2. Restore dump into isolated staging
3. Analyze structure using Schema Profiler
4. Run extraction using Extraction Engine
5. Clean data using Cleaning Engine
6. Repair relations using Relationship Repair Engine
7. Validate outputs using Validation Engine
8. Review unresolved records in Exception Queue
9. Export outputs using Export System
10. Configure target database connection
11. Run dry-run migration validation
12. Review reconciliation summary
13. Review migration logs

---

## JOB LIFECYCLE

Each uploaded SQL dump becomes a migration job with the following states:

- Uploaded
- Restoring
- Analyzing
- Extracting
- Cleaning
- Repairing Relations
- Validating
- Needs Review
- Ready for Export
- Exported
- Failed

Every state transition must be logged with:
- timestamp
- status
- reason

---

## CONFIDENCE THRESHOLD RULES

- **High confidence:** auto-apply only when supported by deterministic validation and within approved safe rules
- **Medium confidence:** suggest and queue for operator review
- **Low confidence:** do not apply, mark as unresolved

---

## SAFETY DESIGN

- **Read-only source enforcement:** the original source must never be modified
- **Staging-only transformations:** all destructive or mutating logic is sandboxed
- **Audit logs required:** every manual intervention and AI-assisted suggestion must be logged
- **No direct production writes:** exports are generated, but production deployment is outside the scope of this platform

---

## EXPORT STRUCTURE (EXCEL)

When exporting to Excel, the workbook must follow this format:

- `00_Summary`
- `[Table Sheets]` for cleaned tables
- `Broken_Relations`
- `AI_Summary`
- `Validation_Report`

### `00_Summary` should include:
- job ID
- processing time
- source dialect
- total tables
- total rows
- repaired relations count
- unresolved issues count
- readiness status

---

## EXPORT NAMING CONVENTION

- Excel: `{job_id}_clean_export.xlsx`
- Clean SQL: `{job_id}_clean_dump.sql`
- Translated SQL: `{job_id}_{target_dialect}_translated.sql`
- Validation Report: `{job_id}_validation_report.xlsx`

---

## SQL TRANSLATION

The platform may provide best-effort SQL dialect conversion.

### Supported behavior
- Detect source dialect
- Allow user selection of target dialect
- Translate compatible SQL structures and types
- Flag unsupported syntax and risky conversions

### Important limitation
SQL translation is not guaranteed to be perfect. Engine-specific syntax, procedures, functions, triggers, and vendor-specific features may require manual review.

---

## DESIGN PRINCIPLES

- **Minimal UI:** avoid clutter
- **Clear language:** prefer understandable wording
- **High transparency:** always show why a decision was made
- **Auditability first:** never hide transformations
- **AI is assistive only:** AI helps explain and suggest, but does not silently decide
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

### Phase 1: Migration Execution Foundation (Current)
- Connect to a target PostgreSQL database
- Test target DB connectivity
- Execute dry-run migration validation (read-only)
- Compare source/staging schema and row counts against target
- Generate reconciliation summaries
- Log all migration events
- Migration Control Center UI

### Phase 2: Data Validation & Reconciliation Layer
- Compare source/staging data against target database in depth
- Compare table row counts
- Detect missing records
- Detect extra records
- Detect mismatched values when primary keys are available
- Generate validation summaries per table

### Phase 3: Error Logs & Diagnostics UI
- Show failed operations with table name, row id, error message, severity, timestamp
- Allow export of failed rows/logs

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
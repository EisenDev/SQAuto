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
# SAFETY_RULES.md

# Safety & Compliance Rules

These rules govern data preservation, execution safety, and project-based isolation.

## PRODUCT SCOPING SAFETY

1. **Strict Project Isolation**: Data from Project A (logs, runs, mappings) must NEVER appear in Project B. 
2. **Context Persistence**: The system must ensure that the user is always aware of which project and which SQL dump is currently active using top-header breadcrumbs.
3. **Session Clearing**: Switching projects in the UI must explicitly clear all temporary tool states and active job counters.

## READ-ONLY SOURCE PRINCIPLE

1. The original SQL dump file is the irrefutable source of truth.
2. ALL transformations happen ONLY inside the **staging sandbox** for the specific project job.
3. Restored raw source data must remain preserved for audits.

## EXECUTION SAFETY (SQL File First)

1. **Default Action is Export**: The primary safe output of SQAuto is a cleaned, sanitized SQL file. 
2. **Review Mandate**: All structural fixes and transformations must be previewed visually inside the builder prior to export or simulation.

## LIVE DATABASE SAFETY

1. **Mode Isolation**: Simulation is read-only. Push is transaction-wrapped.
2. **Explicit Blockers**: If integrity checks find duplicate PKs or orphan FKs, "Push to Live" must be hard-blocked until resolved or overridden with explicit user warning.

## CREDENTIAL SAFETY

1. Destination database passwords must never be stored in plain text (Future hardening required).
2. Credentials must never be returned to the frontend or logged in audit trails.
3. API responses for project details must mask destination strings.
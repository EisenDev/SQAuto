# SAFETY_RULES.md


# Safety & Compliance Rules

These immutable rules govern the data preservation and execution safety of the platform.

## Read-Only Source Principle
1. The original SQL dump file or legacy data stream acts as the irrefutable **Source of Truth**.
2. Source files and external databases MUST NEVER be modified, deleted, or written to.
3. Once imported, raw tables are treated with immutable guarantees to ensure complete rollback ability.

## Staging Sandbox
1. All transformations, standardizations, and deletions happen ONLY within the generated Staging Environment.
2. Cross-job isolation is enforced. Data from System A's dump cannot bleed into System B's dump or processing memory footprint.

## Audit Logs & Transparency
1. Every destructive action, alias configuration, data drop, or manual mapping override MUST be logged.
2. Stored audit artifacts include:
   - Operator ID / AI Agent Trace
   - Timestamp
   - Before / After values
   - Reason / Inference Confidence

## Decision Limitations
1. Unresolved anomalies MUST halt the pipeline stage (`Needs Review`).
2. Never auto-drop dangling references without logging them as orphans in the Exception Queue.

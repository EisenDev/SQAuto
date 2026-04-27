export const GUIDANCE = {
  CONNECTION: {
    TITLE: "Destination Database Connection",
    HELP: "This is the destination database where your data will be migrated. We support PostgreSQL for connectivity testing.",
    PRESET_HELP: "Presets auto-fill common connection parameters for major database types.",
    SAVE_HELP: "Saving a target allows you to reuse it for future simulations and executions.",
    SSL_HELP: "SSL ensures encrypted communication between SQAuto and your database.",
  },
  SIMULATION: {
    TITLE: "Simulation (No Data Changes)",
    HELP: "Simulations run a transaction-backed migration that always rolls back. Use this to verify schema compatibility and row count accuracy safely.",
    RUN_HELP: "Starts a dry-run migration. No data will be written permanently.",
  },
  INTEGRITY: {
    TITLE: "Data Quality Check",
    HELP: "Identifies migration blockers like duplicate primary keys, orphan records, and NULL values in critical fields.",
    RUN_HELP: "Analyzes the extracted staging data for consistency issues.",
    FIX_SUGGESTION: "Smart suggestions help you resolve common data issues prior to migration.",
  },
  MAPPING: {
    TITLE: "Schema Mapping Layer",
    HELP: "Defines the relationship between source columns and destination table structures.",
    AUTO_HELP: "Smart Mapping Suggestions fuzzy-match your source data to target schemas to save time.",
    TYPE_HELP: "Ensure data types are compatible. Mismatches may require custom transform logic.",
  },
  EXECUTION: {
    TITLE: "Migration Control Center",
    HELP: "Manage your migration plans and execution runs. Default mode is always safe rollback.",
    PREVIEW_MODE: "Preview mode generates a full report of what would happen without committing changes.",
    EXECUTE_MODE: "Execute mode attempts a real migration. Requires explicit confirmation.",
  },
  FIXES: {
    PREVIEW_TITLE: "Fix Preview Projection",
    PREVIEW_HELP: "Shows a conceptual 'Before vs After' projection of the proposed fix action based on sampled data.",
    SAFE_LIMIT: "Action is bounded by safe limits to prevent excessive data scanning.",
  },
  REACHABILITY: {
    HELP: "Destination connections are established from the SQAuto server, not your local machine. Ensure your database allows traffic from cloud addresses and non-local IPs."
  }
};

import uuid

def generate_fix_suggestions(source_job_id: str, integrity_report: dict) -> dict:
    """
    Translates an integrity report into actionable fix suggestions.
    Phase 4 supports: high_null_density, duplicate_primary_key, orphan_foreign_key, missing_primary_key.
    Returns:
    {
      "suggestions": [
        {
          "id": "uuid",
          "issue_type": "high_null_density",
          "table": "...",
          ...
        }
      ]
    }
    """
    suggestions = []
    
    # Missing Primary Keys
    for table in integrity_report.get("missing_primary_keys", []):
        suggestions.append({
            "id": str(uuid.uuid4()),
            "issue_type": "missing_primary_key",
            "table": table,
            "column": None,
            "severity": "critical",
            "recommended_action": "add_auto_increment_id",
            "description": f"Table '{table}' has no primary key.",
            "options": [
                {"label": "Add auto-increment 'id' column", "action": "add_auto_id"},
                {"label": "Select existing column as PK", "action": "select_existing_pk", "requires_input": True},
                {"label": "Exclude table", "action": "exclude_table"}
            ]
        })

    # Duplicate Primary Keys
    for dup in integrity_report.get("duplicate_keys", []):
        cols = dup.get("pk_columns", ["id"])
        suggestions.append({
            "id": str(uuid.uuid4()),
            "issue_type": "duplicate_primary_key",
            "table": dup.get("table"),
            "column": ", ".join(cols),
            "severity": "critical",
            "recommended_action": "delete_duplicates",
            "description": f"{dup.get('count', 0)} duplicate rows found for primary key in '{dup.get('table')}'.",
            "options": [
                {"label": "Keep first row, delete rest", "action": "keep_first"},
                {"label": "Keep last row, delete rest", "action": "keep_last"},
                {"label": "Generate new unique IDs", "action": "regenerate_ids"}
            ]
        })

    # Orphan Foreign Keys
    for orphan in integrity_report.get("orphan_foreign_keys", []):
        suggestions.append({
            "id": str(uuid.uuid4()),
            "issue_type": "orphan_foreign_key",
            "table": orphan.get("table"),
            "column": orphan.get("column"),
            "severity": "error",
            "recommended_action": "set_null",
            "description": f"Found {orphan.get('count', 0)} orphan records in '{orphan.get('table')}'.'{orphan.get('column')}' referencing missing parent '{orphan.get('references')}'.",
            "options": [
                {"label": "Set invalid references to NULL", "action": "set_null"},
                {"label": "Delete orphan rows", "action": "delete_rows"},
                {"label": "Ignore for now", "action": "ignore"}
            ]
        })

    # High NULL Density
    for null_risk in integrity_report.get("null_risks", []):
        pct = null_risk.get("null_percentage", 0)
        suggestions.append({
            "id": str(uuid.uuid4()),
            "issue_type": "high_null_density",
            "table": null_risk.get("table"),
            "column": null_risk.get("column"),
            "severity": "warning",
            "recommended_action": "review_nullable_field",
            "description": f"Column '{null_risk.get('column')}' has {pct}% NULL values.",
            "options": [
                {"label": "Keep NULL values", "action": "keep"},
                {"label": "Replace NULL with default value", "action": "replace_null", "requires_input": True},
                {"label": "Exclude column from migration", "action": "exclude_column"}
            ]
        })

    return {
        "suggestions": suggestions
    }

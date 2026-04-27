def preview_fix(source_job_id: str, suggestion_id: str, selected_action: str, options: dict = None) -> dict:
    """
    Simulates the outcome of applying a fix.
    No data is mutated here.
    """
    options = options or {}
    
    # In a real implementation, you would query the staging database for actual records.
    # Here we outline the expected return shape conceptually.
    
    table = options.get("table", "unknown_table")
    column = options.get("column", "unknown_column")
    
    preview = {
        "suggestion_id": suggestion_id,
        "action": selected_action,
        "affected_table": table,
        "affected_column": column,
        "estimated_rows_affected": 0,
        "sample_before_after": [],
        "safe_to_apply": True,
        "warnings": []
    }

    if selected_action == "replace_null":
        default_val = options.get("input_value", "N/A")
        preview["estimated_rows_affected"] = 24
        preview["sample_before_after"] = [
            {"pk": 1, "before": None, "after": default_val},
            {"pk": 2, "before": None, "after": default_val},
            {"pk": 5, "before": None, "after": default_val}
        ]

    elif selected_action == "set_null":
        preview["estimated_rows_affected"] = 5
        preview["warnings"].append("This will sever relationships for 5 records.")
        preview["sample_before_after"] = [
            {"pk": 14, "before": 999, "after": None},
            {"pk": 15, "before": 999, "after": None}
        ]

    elif selected_action == "delete_rows":
        preview["estimated_rows_affected"] = 5
        preview["safe_to_apply"] = False
        preview["warnings"].append("Destructive action: Records will be permanently deleted from the staging area.")
        preview["sample_before_after"] = [
            {"pk": 14, "before": "FULL ROW DATA", "after": "DELETED"},
            {"pk": 15, "before": "FULL ROW DATA", "after": "DELETED"}
        ]
        
    elif selected_action == "keep_first" or selected_action == "keep_last":
        preview["estimated_rows_affected"] = 12
        preview["safe_to_apply"] = False
        preview["warnings"].append("Destructive action: Duplicate entries will be dropped.")
        
    elif selected_action == "add_auto_id":
        preview["estimated_rows_affected"] = "ALL"
        preview["sample_before_after"] = [
            {"pk": "NEW (1)", "before": "NO ID", "after": "ID: 1"},
            {"pk": "NEW (2)", "before": "NO ID", "after": "ID: 2"},
        ]

    return preview

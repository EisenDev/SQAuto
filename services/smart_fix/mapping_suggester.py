import re

def suggest_schema_mappings(source_schema: dict, target_schema: dict) -> list:
    """
    Compares the source_schema and target_schema and generates mapping suggestions.
    source_schema shape: {"table_name": [{"name": "col1", "type": "varchar"}, ...]}
    target_schema shape: {"table_name": [{"name": "col1", "type": "varchar", "nullable": True}, ...]}
    """
    suggestions = []

    for src_table, src_cols in source_schema.items():
        if src_table not in target_schema:
            continue
        
        target_cols = target_schema[src_table]
        table_suggestions = {"table": src_table, "suggestions": []}
        
        for sc in src_cols:
            s_name = sc.get("name", "").lower()
            s_type = sc.get("type", "").lower()
            
            best_match = None
            highest_score = 0.0
            type_match = False
            reason = ""
            
            for tc in target_cols:
                t_name = tc.get("name", "").lower()
                t_type = tc.get("type", "").lower()
                
                # Exact Match
                if s_name == t_name:
                    best_match = tc.get("name")
                    highest_score = 1.0
                    type_match = (s_type == t_type or "int" in s_type and "int" in t_type or "char" in s_type and "char" in t_type)
                    reason = "Exact name match." if type_match else "Exact name match, but type mismatch requires transform."
                    break
                
                # Approximate similarity logic (Mocked basic fuzzy / snake_case vs camelCase)
                s_name_clean = re.sub(r'[^a-z0-9]', '', s_name)
                t_name_clean = re.sub(r'[^a-z0-9]', '', t_name)
                
                if s_name_clean == t_name_clean:
                    score = 0.9
                    if score > highest_score:
                        highest_score = score
                        best_match = tc.get("name")
                        type_match = (s_type == t_type)
                        reason = "Format variation match (e.g., camelCase vs snake_case)."
                        
                elif s_name_clean in t_name_clean or t_name_clean in s_name_clean:
                    # e.g., 'committee_name' vs 'committee_id' -> maybe a 0.6 score if lengths are similar
                    score = 0.6
                    if len(s_name_clean) > 3 and len(t_name_clean) > 3 and score > highest_score:
                        highest_score = score
                        best_match = tc.get("name")
                        type_match = False
                        reason = "Partial name similarity detected."
            
            if best_match and highest_score >= 0.6:
                table_suggestions["suggestions"].append({
                    "source_column": sc.get("name"),
                    "target_column": best_match,
                    "confidence": highest_score,
                    "type_match": type_match,
                    "reason": reason
                })
                
        if table_suggestions["suggestions"]:
            suggestions.append(table_suggestions)
            
    return suggestions

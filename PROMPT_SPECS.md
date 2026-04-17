# Prompt Specifications

This document defines the exact output formats for AI-generated suggestions and summaries.

All outputs must strictly follow the defined JSON structures to ensure consistency across the platform.

## GENERAL RULES

- Return JSON only when a JSON schema is requested
- Do not include markdown code fences in runtime JSON responses
- Do not include extra commentary outside the required fields
- Confidence must be a numeric value between `0.0` and `1.0`
- Use plain, human-readable reasons
- Do not fabricate missing source values

---

## 1. SCHEMA SUMMARY OUTPUT

Return JSON only:

```json
{
  "table_name": "",
  "table_purpose": "",
  "primary_key_candidates": [],
  "foreign_key_candidates": [],
  "notable_columns": [],
  "data_quality_notes": [],
  "estimated_business_role": "",
  "confidence": 0.0
}
```

### Field notes
- **table_name**: source table name
- **table_purpose**: short plain-language summary of what the table likely stores
- **primary_key_candidates**: possible PK columns
- **foreign_key_candidates**: possible FK columns
- **notable_columns**: important columns worth operator attention
- **data_quality_notes**: nulls, duplicates, inconsistent values, suspicious patterns
- **estimated_business_role**: likely role in the legacy system
- **confidence**: AI confidence in the summary

---

## 2. MAPPING SUGGESTION OUTPUT

Return JSON only:

```json
{
  "source_table": "",
  "source_column": "",
  "suggested_target_table": "",
  "suggested_target_column": "",
  "reason": "",
  "confidence": 0.0,
  "status": "suggested"
}
```

### Allowed values
- **status**: `suggested`

---

## 3. RELATION REPAIR SUGGESTION OUTPUT

Return JSON only:

```json
{
  "orphan_table": "",
  "orphan_id": "",
  "suggested_parent_table": "",
  "suggested_parent_id": "",
  "reason": "",
  "confidence": 0.0,
  "action": "review"
}
```

### Allowed values
- **action**: `repair`, `review`

---

## 4. ANOMALY SUMMARY OUTPUT

Return JSON only:

```json
{
  "table": "",
  "column": "",
  "anomaly_type": "",
  "description": "",
  "affected_rows": 0,
  "severity": "low"
}
```

### Allowed values
- **severity**: `low`, `medium`, `high`

---

## 5. EXPORT READINESS SUMMARY OUTPUT

Return JSON only:

```json
{
  "job_id": "",
  "tables_ready": 0,
  "tables_failed": 0,
  "unresolved_exceptions": 0,
  "overall_readiness_score": 0.0,
  "ready_for_export": false
}
```

---

## 6. AI EXPLANATION PANEL OUTPUT

Return JSON only:

```json
{
  "title": "",
  "summary": "",
  "key_findings": [],
  "risks": [],
  "recommended_next_steps": []
}
```

### Field notes
- **title**: short heading for the explanation
- **summary**: simple non-technical summary
- **key_findings**: important detected issues or results
- **risks**: unresolved concerns
- **recommended_next_steps**: suggested operator actions

---

## 7. VALIDATION SUMMARY OUTPUT

Return JSON only:

```json
{
  "job_id": "",
  "row_count_check": "pass",
  "distinct_id_check": "pass",
  "duplicate_check": "pass",
  "relationship_check": "pass",
  "null_check": "pass",
  "final_status": "ready",
  "notes": []
}
```

### Allowed values
- **row_count_check**: `pass`, `fail`
- **distinct_id_check**: `pass`, `fail`
- **duplicate_check**: `pass`, `fail`
- **relationship_check**: `pass`, `fail`
- **null_check**: `pass`, `fail`
- **final_status**: `ready`, `needs_review`, `failed`
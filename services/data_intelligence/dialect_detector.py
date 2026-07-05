# services/data_intelligence/dialect_detector.py
"""SQL Dialect Detection — Phase 2.

Lightweight heuristic-based detection of SQL dump dialect.
Reads the first portion of a SQL file and uses keyword scoring
to determine the source database engine.

Supported dialects: PostgreSQL, MySQL, SQL Server, SQLite, Progress OpenEdge.
"""

import logging
import re

logger = logging.getLogger("sqauto.dialect_detector")

# Heuristic keyword patterns with weights
DIALECT_PATTERNS = {
    "postgresql": {
        "keywords": [
            (r"PostgreSQL database dump", 5),
            (r"\bSERIAL\b", 3),
            (r"\bRETURNING\b", 3),
            (r"\bCOPY\s+.*FROM\s+stdin", 4),
            (r"CREATE\s+SEQUENCE", 3),
            (r"pg_catalog", 4),
            (r"nextval\(", 3),
            (r"::(?:integer|text|varchar|timestamptz?|boolean|uuid)", 3),
            (r"ALTER\s+SEQUENCE", 2),
            (r"SET\s+search_path", 3),
            (r"CREATE\s+EXTENSION", 2),
            (r'\bBIGSERIAL\b', 3),
            (r'CREATE\s+TABLE\s+public\.', 3),
        ],
        "negative": [
            (r"AUTO_INCREMENT", -5),
            (r"ENGINE\s*=\s*InnoDB", -5),
        ]
    },
    "mysql": {
        "keywords": [
            (r"MySQL dump", 5),
            (r"\bAUTO_INCREMENT\b", 4),
            (r"ENGINE\s*=\s*\w+", 4),
            (r"`[a-zA-Z_]+`", 2),  # backtick-quoted identifiers
            (r"LOCK\s+TABLES", 3),
            (r"UNLOCK\s+TABLES", 3),
            (r"/\*!40\d{3}", 3),  # MySQL version-specific comments
            (r"CHARSET\s*=\s*\w+", 2),
            (r"COLLATE\s+\w+", 1),
            (r"KEY\s+`\w+`", 2),
            (r"UNSIGNED", 2),
        ],
        "negative": [
            (r"\bSERIAL\b", -4),
            (r"\bRETURNING\b", -4),
        ]
    },
    "sqlserver": {
        "keywords": [
            (r"\bIDENTITY\s*\(\d+\s*,\s*\d+\)", 4),
            (r"\bGO\b", 2),
            (r"\[dbo\]", 4),
            (r"\[(?:nvarchar|varchar|int|bigint|datetime2?)\]", 3),
            (r"SET\s+ANSI_NULLS\s+ON", 3),
            (r"SET\s+QUOTED_IDENTIFIER\s+ON", 3),
            (r"NVARCHAR\s*\(\s*MAX\s*\)", 2),
            (r"@@IDENTITY", 2),
        ],
        "negative": [
            (r"\bSERIAL\b", -3),
            (r"AUTO_INCREMENT", -3),
        ]
    },
    "sqlite": {
        "keywords": [
            (r"SQLite format", 5),
            (r"AUTOINCREMENT", 3),
            (r"BEGIN TRANSACTION", 2),
            (r"INTEGER PRIMARY KEY", 3),
            (r"sqlite_master", 4),
        ],
        "negative": [
            (r"\bSERIAL\b", -3),
            (r"ENGINE\s*=", -3),
        ]
    },
    "progress_openedge": {
        "keywords": [
            (r"^ADD TABLE\s+\"", 5),
            (r"^ADD FIELD\s+\".*\"\s+OF\s+\"", 5),
            (r"^ADD INDEX\s+\".*\"\s+ON\s+\"", 4),
            (r"^DUMP-NAME", 4),
            (r"\bAS INTEGER\b", 2),
            (r"\bAS CHARACTER\b", 3),
            (r"\bAS LOGICAL\b", 3),
            (r"\bAS DECIMAL\b", 2),
            (r"\bAS DATETIME\b", 2),
            (r"AREA\s+\"Schema Area\"", 3),
            (r"MAX-WIDTH\s+\d+", 2),
            (r"MANDATORY", 2),
        ],
        "negative": [
            (r"\bSERIAL\b", -4),
            (r"AUTO_INCREMENT", -4),
            (r"MySQL dump", -5),
        ]
    },
}


def detect_sql_dialect(sql_text: str) -> dict:
    """Detect the SQL dialect from a SQL text sample.

    Args:
        sql_text: Raw SQL text to analyze (typically first 50-100KB)

    Returns:
        dict with:
        - dialect: detected dialect name
        - confidence: float 0-1
        - scores: breakdown of per-dialect scores
        - indicators: list of matched patterns for the winning dialect
    """
    if not sql_text or len(sql_text.strip()) < 10:
        return {
            "dialect": "unknown",
            "confidence": 0.0,
            "scores": {},
            "indicators": [],
        }

    # Truncate to first 100KB for performance
    sample = sql_text[:102400]

    scores = {}
    matched_patterns = {}

    for dialect, config in DIALECT_PATTERNS.items():
        score = 0
        matches = []

        for pattern, weight in config["keywords"]:
            found = re.findall(pattern, sample, re.IGNORECASE | re.MULTILINE)
            if found:
                hit_score = min(weight * len(found), weight * 5)  # cap per-pattern contribution
                score += hit_score
                matches.append(f"{pattern.replace(chr(92), '')} (x{len(found)})")

        for pattern, weight in config.get("negative", []):
            found = re.findall(pattern, sample, re.IGNORECASE | re.MULTILINE)
            if found:
                score += weight * min(len(found), 3)

        scores[dialect] = max(score, 0)
        matched_patterns[dialect] = matches

    # Determine winner
    total = sum(scores.values()) or 1
    best_dialect = max(scores, key=scores.get) if scores else "unknown"
    best_score = scores.get(best_dialect, 0)
    confidence = round(min(best_score / max(total, 1), 1.0), 2)

    # Require minimum score to declare a dialect
    if best_score < 3:
        best_dialect = "unknown"
        confidence = 0.0

    logger.info(f"Dialect detected: {best_dialect} (confidence: {confidence}, scores: {scores})")

    return {
        "dialect": best_dialect,
        "confidence": confidence,
        "scores": scores,
        "indicators": matched_patterns.get(best_dialect, [])[:10],
    }


def detect_dialect_from_file(file_path: str) -> dict:
    """Detect SQL dialect from a file on disk (supports .gz, .df, .zip).

    Reads the first 100KB of the file for analysis.
    File-extension shortcuts are applied first for certainty.
    """
    import gzip
    import zipfile

    try:
        lower = file_path.lower()

        # Fast extension-based shortcuts
        if lower.endswith(".bak"):
            return {
                "dialect": "sqlserver",
                "confidence": 1.0,
                "scores": {"sqlserver": 10.0},
                "indicators": ["file_extension_bak"],
            }
        if lower.endswith(".df") or lower.endswith(".d"):
            return {
                "dialect": "progress_openedge",
                "confidence": 1.0,
                "scores": {"progress_openedge": 10.0},
                "indicators": ["file_extension_df_or_d"],
            }
        if lower.endswith(".zip"):
            # Peek inside the ZIP to see if it contains .df files
            try:
                with zipfile.ZipFile(file_path, "r") as zf:
                    for name in zf.namelist():
                        if name.lower().endswith(".df"):
                            # Read the .df file for heuristic scoring
                            with zf.open(name) as f:
                                sample = f.read(102400).decode("utf-8", errors="ignore")
                            return detect_sql_dialect(sample)
            except Exception as zip_err:
                logger.warning(f"ZIP inspection failed for {file_path}: {zip_err}")
            return {
                "dialect": "unknown",
                "confidence": 0.0,
                "scores": {},
                "indicators": ["zip_no_df_found"],
            }

        opener = gzip.open if lower.endswith(".gz") else open
        with opener(file_path, "rt", encoding="utf-8", errors="ignore") as f:
            sample = f.read(102400)
        return detect_sql_dialect(sample)
    except Exception as e:
        logger.error(f"Dialect detection failed for {file_path}: {e}")
        return {
            "dialect": "unknown",
            "confidence": 0.0,
            "scores": {},
            "indicators": [],
            "error": str(e),
        }

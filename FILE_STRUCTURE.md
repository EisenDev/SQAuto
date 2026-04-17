# FILE_STRUCTURE.md

# Repository Structure

This document outlines the clean, scalable monorepo folder structure for the SQL Dump Data Migration Platform.

## DIRECTORY TREE

```text
SQAuto/
├── apps/
│   ├── api/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── ai.py
│   │   │   ├── cleaning.py
│   │   │   ├── exports.py
│   │   │   ├── extraction.py
│   │   │   ├── jobs.py
│   │   │   ├── profiling.py
│   │   │   ├── relations.py
│   │   │   ├── uploads.py
│   │   │   └── validation.py
│   │   ├── schemas/
│   │   ├── deps/
│   │   └── core/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── types/
├── configs/
│   ├── model_config.py
│   └── settings.py
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile
├── docs/
│   ├── AGENT.md
│   ├── ARCHITECTURE.md
│   ├── DOCS.md
│   ├── FILE_STRUCTURE.md
│   ├── PROMPT_SPECS.md
│   ├── SAFETY_RULES.md
│   └── TECH_STACK.md
├── scripts/
│   ├── extract_data.py
│   ├── profile_schema.py
│   ├── restore_dump.py
│   └── validate_data.py
├── services/
│   ├── ai_assistant/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── prompts.py
│   │   ├── models.py
│   │   └── utils.py
│   ├── cleaner/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── rules.py
│   │   ├── models.py
│   │   └── utils.py
│   ├── dump_restore/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── models.py
│   │   └── utils.py
│   ├── exporter/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── excel.py
│   │   ├── sql.py
│   │   └── utils.py
│   ├── extractor/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── chunking.py
│   │   ├── models.py
│   │   └── utils.py
│   ├── relationship_repair/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── matching.py
│   │   ├── scoring.py
│   │   ├── models.py
│   │   └── utils.py
│   ├── schema_profiler/
│   │   ├── __init__.py
│   │   ├── service.py
│   │   ├── analyzers.py
│   │   ├── models.py
│   │   └── utils.py
│   └── validator/
│       ├── __init__.py
│       ├── service.py
│       ├── checks.py
│       ├── models.py
│       └── utils.py
└── workers/
    └── migration_worker/
        ├── __init__.py
        ├── tasks.py
        └── worker.py
```
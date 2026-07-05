# services/source_adapters/__init__.py
"""Source Adapter Layer for SQAuto.

Provides a pluggable ingestion architecture so that non-SQL database formats
(Progress OpenEdge .df/.d, future MongoDB JSON, dBase .dbf, etc.) can be
normalized into the PostgreSQL staging schema the same way SQL dumps are.

Usage:
    from services.source_adapters.router import get_adapter
    adapter = get_adapter(file_path)
    adapter.restore(job_id=job.id, file_path=file_path, db_session=db)
"""

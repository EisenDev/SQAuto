# apps/api/routers/explorer.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import text
from apps.api.database import get_db, staging_engine as engine
from apps.api.models import Job
from apps.api.deps import verify_job_owner

router = APIRouter()
logger = logging.getLogger("sqauto.explorer")

@router.get("/{job_id}/table/{table_name}/data", summary="Fetch sample live data from Staging")
def get_table_data(
    job_id: str, 
    table_name: str, 
    limit: int = 50, 
    offset: int = 0, 
    q: str = None, 
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None)
):
    """
    Connects to the staging environment and retrieves raw rows for a mapped table.
    Supports industrial-scale pagination and global keyword search.
    """
    logger.info(f"Explorer Probe: Job {job_id} | Table {table_name} | Q: {q} | Offset: {offset}")

    try:
        job_uuid = UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID")
        
    job = verify_job_owner(job_uuid, db, x_user_id)


    # 1. Status Validation
    if job.status.value not in ["completed", "analyzing", "needs_review", "restoring"]:
        raise HTTPException(status_code=400, detail="This job has not reached data-mounting phase.")

    # 2. Staging Content Validation
    active_staging_job = db.query(Job).filter(
        Job.project_id == job.project_id,
        Job.status.in_(["completed", "analyzing", "restoring"])
    ).order_by(Job.updated_at.desc()).first()

    if active_staging_job and str(active_staging_job.id) != job_id:
        raise HTTPException(status_code=410, detail="DATA_RETIRED")

    try:
        with engine.connect() as conn:
            # Get columns first to build search query
            col_query = text(f'SELECT * FROM staging."{table_name}" LIMIT 0')
            col_res = conn.execute(col_query)
            columns = list(col_res.keys())

            # Build Search Clause
            where_clause = ""
            params = {"limit": limit, "offset": offset}
            if q:
                search_terms = []
                for idx, col in enumerate(columns):
                    p_name = f"q_{idx}"
                    search_terms.append(f'"{col}"::text ILIKE :{p_name}')
                    params[p_name] = f"%{q}%"
                where_clause = f"WHERE {' OR '.join(search_terms)}"

            # Get Total Count
            count_query = text(f'SELECT COUNT(*) FROM staging."{table_name}" {where_clause}')
            total = conn.execute(count_query, params).scalar()

            # Get Data
            data_query = text(f'SELECT * FROM staging."{table_name}" {where_clause} LIMIT :limit OFFSET :offset')
            result = conn.execute(data_query, params)
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
            
            return {
                "columns": columns,
                "rows": rows,
                "total": total,
                "limit": limit,
                "offset": offset
            }
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Explorer Failure: {err_msg}")
        if "does not exist" in err_msg:
             raise HTTPException(status_code=404, detail="Table not found.")
        raise HTTPException(status_code=500, detail="Database communication error.")

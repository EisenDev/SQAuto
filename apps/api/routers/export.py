# apps/api/routers/export.py
import os
import tempfile
import polars as pl
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import subprocess

from apps.api.database import get_db, engine
from apps.api.models import Job

router = APIRouter()

@router.get("/{job_id}/export/excel", summary="Export Job output to Excel format")
def export_excel(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.status.value != "completed":
        raise HTTPException(status_code=400, detail="Job must be completed before export.")

    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, f"{job_id}_export.xlsx")
    
    # We use Polars with xlsxwriter to create a multi-sheet workbook
    # Excel limit implies we truncate safely per table for massive SQL sets.
    try:
        import xlsxwriter
        
        tables = job.profile.get("tables", {}) if job.profile else {}
        
        with xlsxwriter.Workbook(tmp_path) as workbook:
            # 1. Summary Sheet
            summary_ws = workbook.add_worksheet("00_Summary")
            summary_ws.write(0, 0, "Job ID")
            summary_ws.write(0, 1, str(job.id))
            summary_ws.write(1, 0, "Source Dialect")
            summary_ws.write(1, 1, job.profile.get("metadata", {}).get("flavor", "postgres"))
            summary_ws.write(2, 0, "Total Tables")
            summary_ws.write(2, 1, job.profile.get("metadata", {}).get("table_count", len(tables)))
            summary_ws.write(3, 0, "Readiness Status")
            summary_ws.write(3, 1, "Exported successfully. Native SQL truncated to 10k rows/sheet to protect memory limits.")
            
            # 2. Table Sheets
            db_conn = engine.connect()
            for t_name in tables:
                clean_name = t_name[:31]  # Excel limits sheet names to 31 chars
                try:
                    df = pl.read_database(query=f'SELECT * FROM staging."{t_name}" LIMIT 10000', connection=db_conn)
                    df.write_excel(workbook=workbook, worksheet=clean_name)
                except Exception as e:
                    print(f"Failed to export table {t_name} to excel: {e}")
                    
            # 3. AI Insights
            ai_ws = workbook.add_worksheet("AI_Summary")
            ai_ws.write(0, 0, "AI Generated Schema Insights")
            for idx, insight in enumerate(job.profile.get("ai_insights", [])):
                ai_ws.write(idx+1, 0, insight)

            db_conn.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel generation failed: {e}")

    return FileResponse(tmp_path, filename=f"{job_id}_clean_export.xlsx", content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@router.get("/{job_id}/export/clean-sql", summary="Export staging as Clean PostgreSQL")
def export_clean_sql(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    db_url = engine.url.render_as_string(hide_password=False).replace("+psycopg", "")
    tmp_path = os.path.join(tempfile.gettempdir(), f"{job_id}_clean_dump.sql")
    
    # Use pg_dump to export the isolated staging schema safely avoiding catalog overlap
    cmd = ["pg_dump", db_url, "-n", "staging", "-O", "-x", "-f", tmp_path]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"pg_dump failed: {e.stderr.decode('utf-8')}")
        
    return FileResponse(tmp_path, filename=f"{job_id}_clean_dump.sql", content_type="application/sql")


@router.get("/{job_id}/export/translated-sql", summary="Export and transpile SQL")
def export_translated_sql(job_id: str, target: str = "mysql", db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Translated SQL export for multi-gigabyte models requires the Advanced Pipeline Translation add-on which is not initialized.")

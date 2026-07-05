# scripts/recreate_db.py
import os
import sys
import uuid
from sqlalchemy import create_engine, text

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.database import Base, engine, staging_engine, SessionLocal
# Import all models to ensure they are registered on Base
import apps.api.models

def recreate_databases():
    print("[+] Connecting to postgres administrative database...")
    # Connect to the main postgres database first to perform drop/create database actions
    admin_url = "postgresql+psycopg://postgres:postgres@localhost:55433/postgres"
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with admin_engine.connect() as conn:
        print("[+] Dropping database sqauto (forcing termination of active sessions)...")
        conn.execute(text("DROP DATABASE IF EXISTS sqauto WITH (FORCE);"))
        print("[+] Dropping database staging_db (forcing termination of active sessions)...")
        conn.execute(text("DROP DATABASE IF EXISTS staging_db WITH (FORCE);"))
        
        print("[+] Creating database sqauto...")
        conn.execute(text("CREATE DATABASE sqauto;"))
        print("[+] Creating database staging_db...")
        conn.execute(text("CREATE DATABASE staging_db;"))

    print("[+] Databases recreated successfully.")

def initialize_schema():
    print("[+] Initializing tables on sqauto...")
    # Bind metadata to sqauto engine and create all tables
    Base.metadata.create_all(bind=engine)
    
    print("[+] Applying startup migrations (ALTER TABLE and indexes)...")
    with engine.begin() as conn:
        # Alter columns and add indexes if missing (from main.py startup_event)
        conn.execute(text("ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS project_type VARCHAR NOT NULL DEFAULT 'individual'"))
        conn.execute(text("ALTER TABLE IF EXISTS public.migration_targets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE IF EXISTS public.migration_targets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_project_id_status ON public.jobs (project_id, status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_project_id_created_at ON public.jobs (project_id, created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_runs_project_id ON public.migration_runs (project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_logs_project_id ON public.migration_logs (project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_logs_project_id_created_at ON public.migration_logs (project_id, created_at DESC)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_migration_targets_project_id ON public.migration_targets (project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_comparison_runs_project_id_created_at ON public.comparison_runs (project_id, created_at DESC)"))

    print("[+] Creating public.users table in sqauto database for Auth.js...")
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        """))
    print("[+] Database schemas initialized successfully.")

def seed_demo_data():
    print("[+] Seeding demo data...")
    from scripts.create_demo_data import create_demo_data
    create_demo_data()
    print("[+] Demo data seeded successfully.")

if __name__ == "__main__":
    recreate_databases()
    initialize_schema()
    seed_demo_data()
    print("[+] All done! Database refreshed and seeded from scratch.")

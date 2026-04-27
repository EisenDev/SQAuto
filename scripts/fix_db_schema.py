import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

def run_migration():
    print(f"Connecting to database...")
    with engine.connect() as conn:
        # 1. Check migration_targets
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'migration_targets' AND table_schema = 'public'
        """))
        target_cols = [row[0] for row in result]
        if "db_type" not in target_cols:
            print("Adding db_type to migration_targets...")
            conn.execute(text("ALTER TABLE public.migration_targets ADD COLUMN db_type VARCHAR DEFAULT 'postgresql' NOT NULL"))
        
        # 2. Check migration_runs
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'migration_runs' AND table_schema = 'public'
        """))
        run_cols = [row[0] for row in result]
        run_expected = [
            ("summary", "JSON"),
            ("started_at", "TIMESTAMP"),
            ("finished_at", "TIMESTAMP")
        ]
        for col_name, col_type in run_expected:
            if col_name not in run_cols:
                print(f"Adding column {col_name} to migration_runs...")
                conn.execute(text(f"ALTER TABLE public.migration_runs ADD COLUMN {col_name} {col_type}"))

        # 3. Check migration_logs
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'migration_logs' AND table_schema = 'public'
        """))
        log_cols = [row[0] for row in result]
        log_expected = [
            ("rows_affected", "INTEGER"),
            ("execution_time_ms", "INTEGER"),
            ("transaction_status", "VARCHAR")
        ]
        for col_name, col_type in log_expected:
            if col_name not in log_cols:
                print(f"Adding column {col_name} to migration_logs...")
                conn.execute(text(f"ALTER TABLE public.migration_logs ADD COLUMN {col_name} {col_type}"))

        # 4. Check tables existence
        tables = ['migration_plans']
        for table in tables:
            result = conn.execute(text(f"SELECT count(*) FROM information_schema.tables WHERE table_name = '{table}' AND table_schema = 'public'"))
            if result.scalar() == 0:
                print(f"WARNING: Table {table} is missing. Use create_all or manual SQL to create it.")
            else:
                print(f"Table {table} exists.")

        conn.commit()
    print("Migration finished successfully.")

if __name__ == "__main__":
    run_migration()

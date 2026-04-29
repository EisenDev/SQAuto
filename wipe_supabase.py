import os
import sys
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")

if not db_url:
    raise RuntimeError("DATABASE_URL is required")

print("Connecting to Supabase...")
engine = create_engine(db_url, execution_options={"isolation_level": "AUTOCOMMIT"})

try:
    with engine.connect() as conn:
        print("Dropping 'staging' schema CASCADE to free up 2GB of space...")
        conn.execute(text("DROP SCHEMA IF EXISTS staging CASCADE"))
        
        print("Re-creating empty 'staging' schema...")
        conn.execute(text("CREATE SCHEMA staging"))
        
        print("Truncating heavy tables in 'public' schema...")
        try:
            conn.execute(text("TRUNCATE TABLE migration_logs CASCADE"))
            conn.execute(text("TRUNCATE TABLE migration_runs CASCADE"))
            conn.execute(text("TRUNCATE TABLE jobs CASCADE"))
        except Exception as e:
            print(f"Notice: public tables might not exist or be empty: {e}")
            
        print("Supabase wipe complete! All heavy data deleted.")
except Exception as e:
    print(f"Error during wipe: {e}")
    sys.exit(1)

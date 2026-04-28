import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

db_url = "postgresql+psycopg://postgres.lcijmzschmnzghxqnpsd:SqAuTO2556hkeygen@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

engine = create_engine(db_url)
Session = sessionmaker(bind=engine)
session = Session()

try:
    print("Fetching active migration runs and their targets...")
    # Fetch recent runs
    runs_q = text("SELECT id, source_job_id, target_id, status FROM public.migration_runs ORDER BY created_at DESC LIMIT 5")
    runs = session.execute(runs_q).fetchall()
    
    for run in runs:
        print(f"\nRUN ID: {run.id} | Status: {run.status}")
        # Fetch target details
        target_q = text("SELECT id, name, host, port, database_name, username FROM public.migration_targets WHERE id = :tid")
        target = session.execute(target_q, {"tid": run.target_id}).fetchone()
        if target:
            print(f"  TARGET: {target.name} | Host: {target.host} | Port: {target.port} | DB: {target.database_name} | User: {target.username}")
            
            # Connectivity check logic from the server's perspective (simulated here)
            print(f"  Diagnosing: Target host {target.host} at port {target.port}")
            if target.host in ['127.0.0.1', 'localhost', '0.0.0.0'] or target.host.startswith('192.168.') or target.host.startswith('10.'):
                print("  [!] CRITICAL: This is a LOCAL/PRIVATE IP. It will fail from Azure.")
            elif target.port == 5432 and 'supabase.co' in target.host:
                print("  [!] WARNING: Supabase default port is 5432, but pooler is often port 6543. Ensure firewall is open.")
except Exception as e:
    print(f"Error: {e}")
finally:
    session.close()

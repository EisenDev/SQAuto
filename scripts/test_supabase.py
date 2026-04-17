# scripts/test_supabase.py
import sys
import os
sys.path.append(os.getcwd())

from apps.api.database import engine
from sqlalchemy import text

def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            row = result.fetchone()
            print(f"[+] Successfully connected to Supabase!")
            print(f"[+] DB Version: {row[0]}")
            
            # Check for jobs table
            result = connection.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'jobs');"))
            exists = result.fetchone()[0]
            print(f"[+] 'jobs' table exists: {exists}")
            
    except Exception as e:
        print(f"[!] Connection failed: {e}")

if __name__ == "__main__":
    test_connection()

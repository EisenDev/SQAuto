import os
from sqlalchemy import create_engine, text

db_url = "postgresql+psycopg://postgres.lcijmzschmnzghxqnpsd:SqAuTO2556hkeygen@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("Checking Table Sizes in all schemas...")
        table_q = text("""
            SELECT 
                schemaname, 
                relname, 
                pg_size_pretty(pg_total_relation_size(relid)) as total_size,
                pg_total_relation_size(relid) as raw_size
            FROM pg_catalog.pg_statio_user_tables 
            ORDER BY pg_total_relation_size(relid) DESC
            LIMIT 20
        """)
        results = conn.execute(table_q).fetchall()
        for row in results:
            print(f"  {row[0]}.{row[1]}: {row[2]}")

except Exception as e:
    print(f"Error: {e}")

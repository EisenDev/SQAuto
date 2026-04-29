import os
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")

if not db_url:
    raise RuntimeError("DATABASE_URL is required")

engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print("Checking current database size...")
        size_q = text("SELECT pg_size_pretty(pg_database_size('postgres'))")
        size = conn.execute(size_q).scalar()
        print(f"Current DB Size: {size}")
        
        print("\nChecking schema sizes...")
        schema_q = text("""
            SELECT schema_name, 
                   pg_size_pretty(sum(pg_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::bigint) as size
            FROM pg_tables
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            GROUP BY schema_name
        """)
        results = conn.execute(schema_q).fetchall()
        for row in results:
            print(f"  Schema '{row[0]}': {row[1]}")

except Exception as e:
    print(f"Error: {e}")

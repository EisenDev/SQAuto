# scripts/init_db.py
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apps.api.database import Base, engine
# We must import models so that Base knows about them
from apps.api.models import Job

def init_db():
    print(f"[+] Connecting to database at: {engine.url.render_as_string(hide_password=True)}")
    try:
        # Create all tables defined in models.py
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Database tables created/verified in Supabase.")
    except Exception as e:
        print(f"[ERROR] Could not connect to Supabase: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_db()

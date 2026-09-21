import os
import sys
import asyncio
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db.supabase import SupabaseManager
from dotenv import load_dotenv

# load ML env to get DB URL
load_dotenv(Path(__file__).parent.parent / "ML" / ".env")

async def verify_and_clean():
    client = SupabaseManager.get_client()
    if not client:
        print("Failed to get Supabase client.")
        return
        
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("No SUPABASE_DB_URL")
        return
        
    import psycopg2
    conn = psycopg2.connect(db_url, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Get all tables starting with scraped_on_
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'scraped_on_%';")
    tables = cur.fetchall()
    
    active_scraped, _ = await SupabaseManager.resolve_active_scraped_table()
    print(f"Active table should be: {active_scraped}")
    
    for (table_name,) in tables:
        if table_name != active_scraped:
            print(f"Dropping old scraped table: {table_name}")
            cur.execute(f'DROP TABLE IF EXISTS public."{table_name}"')
        else:
            print(f"Keeping active table: {table_name}")
            
    cur.close()
    conn.close()
    print("Cleanup verified and completed.")

if __name__ == "__main__":
    asyncio.run(verify_and_clean())

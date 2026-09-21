import os
import sys
import asyncio
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.db.supabase import SupabaseManager
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

async def clear_old():
    client = SupabaseManager.get_client()
    if not client:
        print("Failed to get Supabase client.")
        return
        
    print("Clearing old scraped tables to save space...")
    try:
        client.table("scraped_on_19_09_2026").delete().neq("route", "__NOT_EXIST__").execute()
        print("Cleared scraped_on_19_09_2026")
    except Exception as e:
        print(e)
        
    try:
        client.table("scraped_on_21_09_2026").delete().neq("route", "__NOT_EXIST__").execute()
        print("Cleared scraped_on_21_09_2026")
    except Exception as e:
        print(e)
        
    print("Done clearing. These tables will no longer take up storage, and they are fully decoupled from the system.")

if __name__ == "__main__":
    asyncio.run(clear_old())

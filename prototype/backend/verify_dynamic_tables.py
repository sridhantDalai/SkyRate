import asyncio
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase import SupabaseManager

async def verify():
    print("=" * 60)
    print("SKYRATE DYNAMIC TABLE VERIFICATION")
    print("=" * 60)
    
    scraped, is_live = await SupabaseManager.resolve_active_scraped_table()
    print(f"Active Scraped Table : {scraped}")
    print(f"Exists in Supabase   : {'YES (Live Data Ready)' if is_live else 'NO (Fallback)'}")
    
    print("-" * 60)
    
    index, index_live = await SupabaseManager.resolve_active_index_table()
    print(f"Active Index Table   : {index}")
    print(f"Exists in Supabase   : {'YES (Live Data Ready)' if index_live else 'NO (Fallback)'}")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(verify())

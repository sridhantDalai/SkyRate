import asyncio
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase import SupabaseManager

async def test():
    scraped, is_live = await SupabaseManager.resolve_active_scraped_table()
    print(f"Scraped table: {scraped} (live: {is_live})")
    
    index, index_live = await SupabaseManager.resolve_active_index_table()
    print(f"Index table: {index} (live: {index_live})")

if __name__ == "__main__":
    asyncio.run(test())

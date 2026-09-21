import asyncio
import os
import sys
from datetime import datetime
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.supabase import SupabaseManager
from app.repositories.fare_repository import FareRepository
from app.schemas.fare import LatestFaresParams

async def check_date(date_input: str):
    # Try parsing date formats
    dt = None
    for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_input, fmt)
            break
        except ValueError:
            continue
            
    if not dt:
        print(f"Could not parse date format for: {date_input}")
        print("Please use a format like 19-9-26 or 2026-09-19.")
        return
        
    iso_date = dt.strftime("%Y-%m-%d")
    suffix = dt.strftime("%d_%m_%Y")
    scraped_table = f"scraped_on_{suffix}"
    index_table = f"index_for_{suffix}"
    
    print(f"\n--- Checking DB for date: {iso_date} ---")
    
    client = SupabaseManager.get_client()
    if not client:
        print("Error: Could not initialize Supabase client. Check your .env file.")
        return

    # Check INDEX Table
    print(f"\n[1] Checking Index Table: {index_table}")
    try:
        res = client.table(index_table).select("*").limit(5).execute()
        records = res.data or []
        print(f"Total Records found in sample: {len(records)}")
        if records:
            print("-" * 75)
            print(f"| {'State':<15} | {'Horizon':<8} | {'APIx':<8} | {'Inflation':<12} |")
            print("-" * 75)
            for r in records:
                state = str(r.get("State", "N/A"))[:15]
                horizon = str(r.get("Time_Horizon", "N/A"))
                apix = str(r.get("RealTime_APIx", "N/A"))
                inflation = str(r.get("Basket_Inflation", "N/A"))
                print(f"| {state:<15} | {horizon:<8} | {apix:<8} | {inflation:<12} |")
            print("-" * 75)
        else:
            print("No records found (table might exist but is empty, or table doesn't exist).")
    except Exception as e:
        print(f"Error querying {index_table}: {e}")

    # Check SCRAPED Table
    print(f"\n[2] Checking Scraped Table: {scraped_table}")
    try:
        res = client.table(scraped_table).select("*").limit(10).execute()
        records = res.data or []
        print(f"Total Records found in sample: {len(records)}")
        if records:
            print("-" * 65)
            print(f"| {'ID':<6} | {'Route':<8} | {'Carrier':<12} | {'Horizon':<8} | {'Price':<8} |")
            print("-" * 65)
            for i, r in enumerate(records, 1):
                r_id = str(r.get("ID", str(i)))[:6]
                route = str(r.get("route", "N/A"))
                carrier = str(r.get("carrier", "N/A"))[:12]
                horizon = str(r.get("t_window", "N/A"))
                price = str(r.get("gross_fare", "N/A"))
                print(f"| {r_id:<6} | {route:<8} | {carrier:<12} | {horizon:<8} | {price:<8} |")
            print("-" * 65)
        else:
            print("No records found (table might exist but is empty, or table doesn't exist).")
    except Exception as e:
        print(f"Error querying {scraped_table}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test DB data for a specific date")
    parser.add_argument("date", nargs="?", help="Date to check (e.g., 19-9-26, 2026-09-19)")
    args = parser.parse_args()
    
    date_to_test = args.date
    if not date_to_test:
        print("========================================")
        print("SkyRate DB Test System")
        print("========================================")
        date_to_test = input("Enter a date to test (e.g., 19-9-26 or 2026-09-19): ")
        
    if date_to_test:
        asyncio.run(check_date(date_to_test))

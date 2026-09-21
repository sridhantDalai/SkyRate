"""
SkyRate DB Seeder
=================
Creates `scraped_on_<date>` and `index_for_<date>` partition tables
in Supabase and fills them with realistic test data.

Usage:
    python seed_tables.py 19-9-26
    python seed_tables.py 2026-09-19
    python seed_tables.py          <-- interactive prompt
"""

import asyncio
import os
import sys
import httpx
from datetime import datetime
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

# ── Realistic seed fares (route, carrier, flight_number, nonstop, horizon, base, tax, udf, gross, status) ──
FARE_ROWS = [
    ("DEL-BOM", "IndiGo",    "6E-204",  True,  "T",    9200.0, 1223.0, 77.0, 10500.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-315",  True,  "T+1",  6500.0,  923.0, 77.0,  7500.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-401",  True,  "T+7",  5800.0,  823.0, 77.0,  6700.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-510",  True,  "T+15", 4500.0,  680.0, 77.0,  5257.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-612",  True,  "T+30", 3800.0,  620.0, 77.0,  4497.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-720",  True,  "T+45", 3500.0,  580.0, 77.0,  4157.0, "Available"),
    ("DEL-BOM", "Air India", "AI-805",  True,  "T",    9800.0, 1350.0, 77.0, 11227.0, "Available"),
    ("DEL-BOM", "Air India", "AI-811",  True,  "T+1",  7200.0, 1023.0, 77.0,  8300.0, "Available"),
    ("DEL-BOM", "Air India", "AI-102",  True,  "T+1",   None,   None,  77.0,   None,  "Sold Out / Cancelled"),
    ("DEL-BOM", "Air India", "AI-812",  True,  "T+30", 4000.0,  620.0, 77.0,  4697.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-8169", True,  "T+7",  4800.0,  723.0, 77.0,  5600.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-123",  False, "T+1",  5100.0,  723.0, 77.0,  5900.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-205",  True,  "T+45", 3600.0,  580.0, 77.0,  4257.0, "Available"),
    ("BLR-DEL", "IndiGo",    "6E-512",  True,  "T+1",  8200.0, 1150.0, 250.0, 9600.0, "Available"),
    ("BLR-DEL", "IndiGo",    "6E-601",  True,  "T+7",  7500.0, 1050.0, 250.0, 8800.0, "Available"),
    ("BLR-DEL", "Air India", "AI-502",  True,  "T+1",  8800.0, 1200.0, 250.0,10250.0, "Available"),
    ("BLR-DEL", "Air India", "AI-601",  True,  "T+15", 6500.0,  950.0, 250.0, 7700.0, "Available"),
    ("BOM-GOI", "Akasa Air", "QP-1302", True,  "T+15", 3200.0,  420.0, 120.0, 3740.0, "Available"),
    ("BOM-GOI", "IndiGo",    "6E-7801", True,  "T",    4500.0,  680.0, 120.0, 5300.0, "Available"),
    ("BOM-GOI", "SpiceJet",  "SG-901",  True,  "T+7",  3600.0,  540.0, 120.0, 4260.0, "Available"),
    ("DEL-CCU", "Air India", "AI-701",  True,  "T+30", 4100.0,  623.0, 77.0,  4800.0, "Available"),
    ("DEL-CCU", "IndiGo",    "6E-801",  True,  "T+7",  5200.0,  750.0, 77.0,  6027.0, "Available"),
    ("DEL-CCU", "SpiceJet",  "SG-401",  True,  "T+15", 4600.0,  680.0, 77.0,  5357.0, "Available"),
    ("BOM-BLR", "IndiGo",    "6E-901",  True,  "T+1",  6800.0,  980.0, 250.0, 8030.0, "Available"),
    ("BOM-BLR", "Air India", "AI-302",  True,  "T",    8200.0, 1150.0, 250.0, 9600.0, "Available"),
]

# ── Realistic seed index rows (State, horizon, mospi_base, inflation, apix) ──
INDEX_ROWS = [
    ("All India",    "T",    134.2, "14.2%",  153.26),
    ("All India",    "T+1",  134.2, "11.5%",  149.63),
    ("All India",    "T+7",  134.2,  "6.8%",  143.33),
    ("All India",    "T+15", 134.2,  "3.1%",  138.36),
    ("All India",    "T+30", 134.2, "-0.8%",  133.13),
    ("All India",    "T+45", 134.2, "-2.5%",  130.85),
    ("Delhi",        "T",    138.5, "16.4%",  161.21),
    ("Delhi",        "T+1",  138.5, "13.2%",  156.76),
    ("Delhi",        "T+7",  138.5,  "8.0%",  149.58),
    ("Delhi",        "T+15", 138.5,  "4.5%",  144.73),
    ("Delhi",        "T+30", 138.5,  "0.2%",  138.78),
    ("Maharashtra",  "T",    132.8, "13.2%",  150.33),
    ("Maharashtra",  "T+1",  132.8, "10.5%",  146.74),
    ("Maharashtra",  "T+7",  132.8,  "6.1%",  140.89),
    ("Maharashtra",  "T+15", 132.8,  "2.8%",  136.52),
    ("Maharashtra",  "T+30", 132.8, "-1.2%",  131.21),
    ("Karnataka",    "T",    136.1, "12.0%",  152.43),
    ("Karnataka",    "T+1",  136.1,  "9.5%",  149.02),
    ("Karnataka",    "T+7",  136.1,  "5.5%",  143.59),
    ("Karnataka",    "T+15", 136.1,  "2.1%",  139.02),
    ("West Bengal",  "T",    130.5, "11.5%",  145.51),
    ("West Bengal",  "T+7",  130.5,  "5.8%",  138.07),
    ("Tamil Nadu",   "T",    131.2, "10.8%",  145.37),
    ("Tamil Nadu",   "T+7",  131.2,  "5.2%",  138.02),
    ("Telangana",    "T",    133.5, "12.5%",  150.19),
    ("Telangana",    "T+7",  133.5,  "6.3%",  141.91),
    ("Gujarat",      "T",    129.8, "11.0%",  144.08),
    ("Gujarat",      "T+7",  129.8,  "5.0%",  136.29),
]


def build_sql(scraped_table: str, index_table: str, date_suffix: str) -> str:
    """Build the full SQL to create both partition tables and insert seed data."""

    # ── CREATE scraped table ──────────────────────────────────────────────────
    scraped_ddl = f"""
-- ============================================================
-- TABLE: {scraped_table}
-- ============================================================
CREATE TABLE IF NOT EXISTS public."{scraped_table}" (
    "ID"            TEXT          PRIMARY KEY,
    route           TEXT          NOT NULL,
    carrier         TEXT          NOT NULL,
    flight_number   TEXT          NOT NULL,
    is_non_stop     BOOLEAN       NOT NULL DEFAULT TRUE,
    t_window        TEXT          NOT NULL,
    base_fare       NUMERIC(10,2),
    taxes           NUMERIC(10,2),
    udf_fee         NUMERIC(10,2),
    gross_fare      NUMERIC(10,2),
    status          TEXT          NOT NULL DEFAULT 'Available',
    source          TEXT          NOT NULL DEFAULT 'SkyRate Network',
    scraped_at      TIMESTAMPTZ   DEFAULT NOW()
);"""

    scraped_inserts = []
    for i, (route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status) in enumerate(FARE_ROWS, 1):
        rid = f"f{date_suffix.replace('_','')}_{i:03d}"
        ns = "TRUE" if nonstop else "FALSE"
        base_s = f"{base}" if base is not None else "NULL"
        tax_s = f"{tax}" if tax is not None else "NULL"
        udf_s = f"{udf}" if udf is not None else "NULL"
        gross_s = f"{gross}" if gross is not None else "NULL"
        scraped_inserts.append(
            f"('{rid}','{route}','{carrier}','{fn}',{ns},'{horizon}',{base_s},{tax_s},{udf_s},{gross_s},'{status}','SkyRate Network',NOW())"
        )

    scraped_insert_sql = f"""
INSERT INTO public."{scraped_table}"
    ("ID", route, carrier, flight_number, is_non_stop, t_window, base_fare, taxes, udf_fee, gross_fare, status, source, scraped_at)
VALUES
{chr(10)+'    ,'.join(scraped_inserts)}
ON CONFLICT ("ID") DO NOTHING;"""

    # ── CREATE index table ────────────────────────────────────────────────────
    index_ddl = f"""

-- ============================================================
-- TABLE: {index_table}
-- ============================================================
CREATE TABLE IF NOT EXISTS public."{index_table}" (
    "State"             TEXT          NOT NULL,
    "Time_Horizon"      TEXT          NOT NULL,
    "MoSPI_Base"        NUMERIC(8,2),
    "Basket_Inflation"  TEXT,
    "RealTime_APIx"     NUMERIC(8,2),
    computed_at         TIMESTAMPTZ   DEFAULT NOW(),
    PRIMARY KEY ("State", "Time_Horizon")
);"""

    index_inserts = []
    for (state, horizon, mospi, inflation, apix) in INDEX_ROWS:
        index_inserts.append(
            f"('{state}','{horizon}',{mospi},'{inflation}',{apix},NOW())"
        )

    index_insert_sql = f"""
INSERT INTO public."{index_table}"
    ("State", "Time_Horizon", "MoSPI_Base", "Basket_Inflation", "RealTime_APIx", computed_at)
VALUES
{chr(10)+'    ,'.join(index_inserts)}
ON CONFLICT ("State", "Time_Horizon") DO UPDATE SET
    "MoSPI_Base" = EXCLUDED."MoSPI_Base",
    "Basket_Inflation" = EXCLUDED."Basket_Inflation",
    "RealTime_APIx" = EXCLUDED."RealTime_APIx",
    computed_at = NOW();"""

    return scraped_ddl + scraped_insert_sql + index_ddl + index_insert_sql


async def execute_via_supabase_http(sql: str) -> bool:
    """Try to execute SQL via Supabase Management REST API."""
    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
    key = settings.SUPABASE_SECRET_KEY

    if not key:
        return False

    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Try with project service role key
            for auth_header in [f"Bearer {key}", key]:
                headers["Authorization"] = auth_header
                resp = await client.post(url, headers=headers, json={"query": sql})
                if resp.status_code in (200, 201):
                    return True
            print(f"Management API response: {resp.status_code}")
    except Exception as e:
        # Ignore encoding errors from printing unicode
        if "codec" not in str(e).lower():
            print(f"Management API error: {e}")
    return False


async def execute_via_psycopg(sql: str) -> bool:
    """Try to execute via direct PostgreSQL connection using psycopg2."""
    try:
        import psycopg2
        project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
        db_pass = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("DB_PASSWORD")
        if not db_pass:
            return False
        conn_str = f"host=db.{project_ref}.supabase.co port=5432 dbname=postgres user=postgres password={db_pass}"
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Direct PostgreSQL error: {e}")
        return False


def insert_via_rest(client: any, scraped_table: str, index_table: str) -> bool:
    """Last resort: insert rows via supabase-py REST client (tables must already exist)."""
    try:
        rows = []
        for i, (route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status) in enumerate(FARE_ROWS, 1):
            rid = f"f{scraped_table.replace('scraped_on_','').replace('_','')}_{i:03d}"
            rows.append({
                "ID": rid, "route": route, "carrier": carrier, "flight_number": fn,
                "is_non_stop": nonstop, "t_window": horizon,
                "base_fare": base, "taxes": tax, "udf_fee": udf,
                "gross_fare": gross, "status": status, "source": "SkyRate Network"
            })
        client.table(scraped_table).upsert(rows, on_conflict="ID").execute()

        idx_rows = []
        for (state, horizon, mospi, inflation, apix) in INDEX_ROWS:
            idx_rows.append({
                "State": state, "Time_Horizon": horizon,
                "MoSPI_Base": mospi, "Basket_Inflation": inflation, "RealTime_APIx": apix
            })
        client.table(index_table).upsert(idx_rows, on_conflict="State,Time_Horizon").execute()
        return True
    except Exception as e:
        print(f"REST insert error: {e}")
        return False


async def seed_date(date_input: str):
    dt = None
    for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_input, fmt)
            break
        except ValueError:
            continue

    if not dt:
        print(f"Cannot parse date: {date_input}")
        return

    suffix = dt.strftime("%d_%m_%Y")
    iso = dt.strftime("%Y-%m-%d")
    scraped_table = f"scraped_on_{suffix}"
    index_table = f"index_for_{suffix}"

    print(f"\n  Date         : {iso}")
    print(f"  Scraped table: {scraped_table}  ({len(FARE_ROWS)} rows)")
    print(f"  Index table  : {index_table}  ({len(INDEX_ROWS)} rows)")
    print()

    sql = build_sql(scraped_table, index_table, suffix)

    # ── Method 1: Supabase Management API ────────────────────────────────────
    print("Trying Supabase Management API...")
    ok = await execute_via_supabase_http(sql)
    if ok:
        print("  ✓ SQL executed via Management API")
        return True

    # ── Method 2: Direct psycopg2 ────────────────────────────────────────────
    print("Trying direct PostgreSQL connection (psycopg2)...")
    ok = await execute_via_psycopg(sql)
    if ok:
        print("  ✓ SQL executed via psycopg2")
        return True

    # ── Method 3: supabase-py REST (works ONLY if tables already exist) ──────
    from app.db.supabase import SupabaseManager
    client = SupabaseManager.get_client()
    if client:
        print("Trying supabase-py REST insert (tables must already exist)...")
        ok = insert_via_rest(client, scraped_table, index_table)
        if ok:
            print("  ✓ Data inserted via REST (tables were already there)")
            return True

    # ── All methods failed → output SQL for manual paste ─────────────────────
    sql_file = f"seed_{suffix}.sql"
    with open(sql_file, "w", encoding="utf-8") as f:
        f.write(sql)
    print()
    print("=" * 65)
    print(f"  Automatic methods failed - SQL saved to: {sql_file}")
    print()
    print("  To fix this manually (takes 30 seconds):")
    print("  1. Open https://supabase.com/dashboard/project/uiqekxqtbzgfqohlvpct/sql")
    print(f"  2. Paste the contents of  {sql_file}")
    print("  3. Click Run")
    print("=" * 65)
    return False


async def main(dates: list[str]):
    print("=" * 65)
    print("  SkyRate DB Seeder")
    print("=" * 65)
    results = {}
    for d in dates:
        ok = await seed_date(d)
        results[d] = ok

    print()
    print("=" * 65)
    print("  Summary")
    print("=" * 65)
    for d, ok in results.items():
        status = "[DONE]" if ok else "[MANUAL SQL NEEDED]"
        print(f"  {d:>12}  ->  {status}")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Supabase partition tables")
    parser.add_argument("dates", nargs="*", help="Dates to seed (e.g. 19-9-26 20-9-26)")
    args = parser.parse_args()

    dates = args.dates
    if not dates:
        raw = input("Enter dates to seed (space-separated, e.g. 19-9-26 20-9-26): ")
        dates = raw.strip().split()

    asyncio.run(main(dates))

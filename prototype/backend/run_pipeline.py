"""
SkyRate Pipeline Simulator
===========================
Mimics the GitHub Actions daily pipeline for any given date.
Creates `scraped_on_<date>` and `index_for_<date>` tables
directly in Supabase via PostgreSQL and inserts realistic data.

Usage:
    python run_pipeline.py 19-9-26
    python run_pipeline.py 19-9-26 20-9-26 21-9-26
    python run_pipeline.py              <-- interactive prompt
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
from urllib.parse import urlparse, unquote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load env vars from BOTH .env files ───────────────────────────────────────
def load_env():
    dirs = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "..", "ML", ".env"),
    ]
    for path in dirs:
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ.setdefault(k.strip(), v.strip())

load_env()

# ── Realistic scraped fare rows ───────────────────────────────────────────────
# (route, carrier, flight_number, nonstop, horizon, base_fare, taxes, udf_fee, gross_fare, status)
FARE_ROWS = [
    ("DEL-BOM", "IndiGo",    "6E-204",  True,  "T",    9200.0, 1223.0,  77.0, 10500.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-315",  True,  "T+1",  6500.0,  923.0,  77.0,  7500.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-401",  True,  "T+7",  5800.0,  823.0,  77.0,  6700.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-510",  True,  "T+15", 4500.0,  680.0,  77.0,  5257.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-612",  True,  "T+30", 3800.0,  620.0,  77.0,  4497.0, "Available"),
    ("DEL-BOM", "IndiGo",    "6E-720",  True,  "T+45", 3500.0,  580.0,  77.0,  4157.0, "Available"),
    ("DEL-BOM", "Air India", "AI-805",  True,  "T",    9800.0, 1350.0,  77.0, 11227.0, "Available"),
    ("DEL-BOM", "Air India", "AI-811",  True,  "T+1",  7200.0, 1023.0,  77.0,  8300.0, "Available"),
    ("DEL-BOM", "Air India", "AI-102",  True,  "T+1",  None,   None,    77.0,  None,   "Sold Out / Cancelled"),
    ("DEL-BOM", "Air India", "AI-812",  True,  "T+30", 4000.0,  620.0,  77.0,  4697.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-8169", True,  "T+7",  4800.0,  723.0,  77.0,  5600.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-123",  False, "T+1",  5100.0,  723.0,  77.0,  5900.0, "Available"),
    ("DEL-BOM", "SpiceJet",  "SG-205",  True,  "T+45", 3600.0,  580.0,  77.0,  4257.0, "Available"),
    ("BLR-DEL", "IndiGo",    "6E-512",  True,  "T+1",  8200.0, 1150.0, 250.0,  9600.0, "Available"),
    ("BLR-DEL", "IndiGo",    "6E-601",  True,  "T+7",  7500.0, 1050.0, 250.0,  8800.0, "Available"),
    ("BLR-DEL", "Air India", "AI-502",  True,  "T+1",  8800.0, 1200.0, 250.0, 10250.0, "Available"),
    ("BLR-DEL", "Air India", "AI-601",  True,  "T+15", 6500.0,  950.0, 250.0,  7700.0, "Available"),
    ("BOM-GOI", "Akasa Air", "QP-1302", True,  "T+15", 3200.0,  420.0, 120.0,  3740.0, "Available"),
    ("BOM-GOI", "IndiGo",    "6E-7801", True,  "T",    4500.0,  680.0, 120.0,  5300.0, "Available"),
    ("BOM-GOI", "SpiceJet",  "SG-901",  True,  "T+7",  3600.0,  540.0, 120.0,  4260.0, "Available"),
    ("DEL-CCU", "Air India", "AI-701",  True,  "T+30", 4100.0,  623.0,  77.0,  4800.0, "Available"),
    ("DEL-CCU", "IndiGo",    "6E-801",  True,  "T+7",  5200.0,  750.0,  77.0,  6027.0, "Available"),
    ("DEL-CCU", "SpiceJet",  "SG-401",  True,  "T+15", 4600.0,  680.0,  77.0,  5357.0, "Available"),
    ("BOM-BLR", "IndiGo",    "6E-901",  True,  "T+1",  6800.0,  980.0, 250.0,  8030.0, "Available"),
    ("BOM-BLR", "Air India", "AI-302",  True,  "T",    8200.0, 1150.0, 250.0,  9600.0, "Available"),
]

# ── Realistic APIx index rows ─────────────────────────────────────────────────
# (State, Time_Horizon, MoSPI_Base, Basket_Inflation, RealTime_APIx)
INDEX_ROWS = [
    ("All India",   "T",    134.2, "14.2%",  153.26),
    ("All India",   "T+1",  134.2, "11.5%",  149.63),
    ("All India",   "T+7",  134.2,  "6.8%",  143.33),
    ("All India",   "T+15", 134.2,  "3.1%",  138.36),
    ("All India",   "T+30", 134.2, "-0.8%",  133.13),
    ("All India",   "T+45", 134.2, "-2.5%",  130.85),
    ("Delhi",       "T",    138.5, "16.4%",  161.21),
    ("Delhi",       "T+1",  138.5, "13.2%",  156.76),
    ("Delhi",       "T+7",  138.5,  "8.0%",  149.58),
    ("Delhi",       "T+15", 138.5,  "4.5%",  144.73),
    ("Delhi",       "T+30", 138.5,  "0.2%",  138.78),
    ("Maharashtra", "T",    132.8, "13.2%",  150.33),
    ("Maharashtra", "T+1",  132.8, "10.5%",  146.74),
    ("Maharashtra", "T+7",  132.8,  "6.1%",  140.89),
    ("Maharashtra", "T+15", 132.8,  "2.8%",  136.52),
    ("Maharashtra", "T+30", 132.8, "-1.2%",  131.21),
    ("Karnataka",   "T",    136.1, "12.0%",  152.43),
    ("Karnataka",   "T+1",  136.1,  "9.5%",  149.02),
    ("Karnataka",   "T+7",  136.1,  "5.5%",  143.59),
    ("Karnataka",   "T+15", 136.1,  "2.1%",  139.02),
    ("West Bengal", "T",    130.5, "11.5%",  145.51),
    ("West Bengal", "T+7",  130.5,  "5.8%",  138.07),
    ("Tamil Nadu",  "T",    131.2, "10.8%",  145.37),
    ("Tamil Nadu",  "T+7",  131.2,  "5.2%",  138.02),
    ("Telangana",   "T",    133.5, "12.5%",  150.19),
    ("Telangana",   "T+7",  133.5,  "6.3%",  141.91),
    ("Gujarat",     "T",    129.8, "11.0%",  144.08),
    ("Gujarat",     "T+7",  129.8,  "5.0%",  136.29),
]


def drop_old_scraped_tables(conn, keep_table: str) -> None:
    """
    Drops all public.scraped_on_* tables EXCEPT the one being created.
    Ensures only ONE scraped partition exists at any time.
    Index tables (index_for_*) are NOT touched - they pile up per date.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'scraped_on_%'
    """)
    tables = [row[0] for row in cur.fetchall()]
    dropped = []
    for t in tables:
        if t != keep_table:
            cur.execute(f'DROP TABLE IF EXISTS public."{t}" CASCADE')
            dropped.append(t)
    cur.close()
    if dropped:
        print(f"  Dropped {len(dropped)} old scraped table(s): {dropped}")
    else:
        print("  No old scraped tables found to drop.")


def get_db_conn():
    """Returns a psycopg2 connection using SUPABASE_DB_URL."""
    import psycopg2
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("  [ERROR] SUPABASE_DB_URL is missing. Add it to .env or secrets.")
        return None
        
    # Rewrite direct Supabase URL to connection pooler for GitHub Actions IPv4
    if "db." in db_url and ".supabase.co" in db_url:
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        host = parsed.hostname
        # Extract project ref from db.[PROJECT-REF].supabase.co
        project_ref = host.split('.')[1]
        
        # Rewrite to pooler in ap-southeast-1
        pooler_host = "aws-0-ap-southeast-1.pooler.supabase.com:6543"
        
        # Ensure username ends with .[project-ref]
        username = parsed.username
        if not username.endswith(project_ref):
            username = f"{username}.{project_ref}"
            
        db_url = f"postgresql://{username}:{parsed.password}@{pooler_host}{parsed.path}"
        
    conn = psycopg2.connect(db_url, connect_timeout=15)
    conn.autocommit = True
    return conn


def run_pipeline_for_date(date_input: str) -> bool:
    """
    Fully mimics the GitHub Actions daily pipeline for a given date.
    1. Creates the scraped_on_<date> partition table
    2. Inserts realistic fare records
    3. Creates the index_for_<date> partition table
    4. Inserts APIx index records
    5. Verifies both tables via SELECT COUNT(*)
    """
    # Parse flexible date formats
    dt = None
    for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_input, fmt)
            break
        except ValueError:
            continue

    if not dt:
        print(f"  [ERROR] Cannot parse date: '{date_input}'")
        print("          Use format like  19-9-26  or  2026-09-19")
        return False

    suffix        = dt.strftime("%d_%m_%Y")
    iso           = dt.strftime("%Y-%m-%d")
    scraped_table = f"scraped_on_{suffix}"
    index_table   = f"index_for_{suffix}"

    print(f"\n{'='*62}")
    print(f"  Pipeline run for: {iso}")
    print(f"  Scraped table   : {scraped_table}   ({len(FARE_ROWS)} rows)")
    print(f"  Index table     : {index_table}     ({len(INDEX_ROWS)} rows)")
    print(f"{'='*62}")

    try:
        conn = get_db_conn()
        cur  = conn.cursor()
    except Exception as e:
        print(f"  [ERROR] DB connection failed: {e}")
        return False

    # ── STEP 0: Drop old scraped_on_* tables (index tables pile up, scraped DOES NOT) ──
    print("  [0/4] Dropping old scraped tables (keeping only today's)...")
    drop_old_scraped_tables(conn, keep_table=scraped_table)

    # ── STEP 1: Create scraped partition table ────────────────────────────────
    print("  [1/4] Creating scraped table...", end=" ", flush=True)
    cur.execute(f"""
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
        );
    """)
    print("OK")

    # ── STEP 2: Insert fare rows ──────────────────────────────────────────────
    print("  [2/4] Inserting fare records...", end=" ", flush=True)
    rows_data = []
    for i, (route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status) in enumerate(FARE_ROWS, 1):
        rid = f"f{suffix.replace('_','')}_{i:03d}"
        rows_data.append((rid, route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status, "SkyRate Network"))

    from psycopg2.extras import execute_values
    execute_values(
        cur,
        f"""INSERT INTO public."{scraped_table}"
            ("ID", route, carrier, flight_number, is_non_stop, t_window,
             base_fare, taxes, udf_fee, gross_fare, status, source)
            VALUES %s
            ON CONFLICT ("ID") DO NOTHING""",
        rows_data
    )
    print(f"OK ({len(rows_data)} rows)")

    # ── STEP 3: Create index partition table ──────────────────────────────────
    print("  [3/4] Creating index table...", end=" ", flush=True)
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS public."{index_table}" (
            "State"             TEXT          NOT NULL,
            "Time_Horizon"      TEXT          NOT NULL,
            "MoSPI_Base"        NUMERIC(8,2),
            "Basket_Inflation"  TEXT,
            "RealTime_APIx"     NUMERIC(8,2),
            computed_at         TIMESTAMPTZ   DEFAULT NOW(),
            PRIMARY KEY ("State", "Time_Horizon")
        );
    """)
    print("OK")

    # ── STEP 4: Insert index rows ─────────────────────────────────────────────
    print("  [4/4] Inserting APIx index records...", end=" ", flush=True)
    idx_data = [(s, h, m, inf, apix) for s, h, m, inf, apix in INDEX_ROWS]
    execute_values(
        cur,
        f"""INSERT INTO public."{index_table}"
            ("State", "Time_Horizon", "MoSPI_Base", "Basket_Inflation", "RealTime_APIx")
            VALUES %s
            ON CONFLICT ("State", "Time_Horizon") DO UPDATE SET
                "MoSPI_Base"       = EXCLUDED."MoSPI_Base",
                "Basket_Inflation" = EXCLUDED."Basket_Inflation",
                "RealTime_APIx"    = EXCLUDED."RealTime_APIx",
                computed_at        = NOW()""",
        idx_data
    )
    print(f"OK ({len(idx_data)} rows)")

    # ── VERIFY ────────────────────────────────────────────────────────────────
    cur.execute(f'SELECT COUNT(*) FROM public."{scraped_table}"')
    scraped_count = cur.fetchone()[0]
    cur.execute(f'SELECT COUNT(*) FROM public."{index_table}"')
    index_count = cur.fetchone()[0]

    cur.close()
    conn.close()

    print()
    print("  VERIFICATION:")
    print(f"  {scraped_table:35s}  -> {scraped_count} rows in DB")
    print(f"  {index_table:35s}  -> {index_count} rows in DB")

    ok = scraped_count > 0 and index_count > 0
    if ok:
        print(f"\n  [PASS] Pipeline for {iso} complete!")
    else:
        print(f"\n  [FAIL] Something went wrong — 0 rows found.")
    return ok


def verify_date(date_input: str):
    """
    Quick read-only check: shows sample data from both tables.
    Runs after seeding to confirm exactly what's in DB.
    """
    dt = None
    for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_input, fmt)
            break
        except ValueError:
            continue
    if not dt:
        return

    suffix        = dt.strftime("%d_%m_%Y")
    iso           = dt.strftime("%Y-%m-%d")
    scraped_table = f"scraped_on_{suffix}"
    index_table   = f"index_for_{suffix}"

    try:
        conn = get_db_conn()
        cur  = conn.cursor()

        print(f"\n--- {iso} | {scraped_table} (sample 5) ---")
        cur.execute(f'SELECT "ID", route, carrier, t_window, gross_fare, status FROM public."{scraped_table}" LIMIT 5')
        rows = cur.fetchall()
        if rows:
            print(f"  {'ID':<25} {'Route':<8} {'Carrier':<12} {'Window':<8} {'Price'}")
            print("  " + "-" * 62)
            for r in rows:
                print(f"  {str(r[0]):<25} {str(r[1]):<8} {str(r[2]):<12} {str(r[3]):<8} {r[4]}")

        print(f"\n--- {iso} | {index_table} (sample 5) ---")
        cur.execute(f'SELECT "State", "Time_Horizon", "RealTime_APIx", "Basket_Inflation" FROM public."{index_table}" LIMIT 5')
        rows = cur.fetchall()
        if rows:
            print(f"  {'State':<15} {'Horizon':<8} {'APIx':<10} {'Inflation'}")
            print("  " + "-" * 45)
            for r in rows:
                print(f"  {str(r[0]):<15} {str(r[1]):<8} {str(r[2]):<10} {r[3]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  [ERROR] Verify failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SkyRate Pipeline Simulator — mimics GitHub Actions daily run"
    )
    parser.add_argument(
        "dates", nargs="*",
        help="Dates to simulate (e.g.  19-9-26  20-9-26  23-10-27)"
    )
    args = parser.parse_args()

    dates = args.dates
    if not dates:
        print("=" * 62)
        print("  SkyRate Pipeline Simulator")
        print("  Mimics the GitHub Actions daily scraper + index pipeline")
        print("=" * 62)
        raw = input("  Enter dates (space-separated, e.g. 19-9-26 20-9-26): ")
        dates = raw.strip().split()

    if not dates:
        print("No dates provided. Exiting.")
        sys.exit(1)

    results = {}
    for d in dates:
        results[d] = run_pipeline_for_date(d)

    # Print final verification sample from DB
    print(f"\n{'='*62}")
    print("  DB Verification (reading back from Supabase)")
    print(f"{'='*62}")
    for d in dates:
        if results[d]:
            verify_date(d)

    # Summary
    print(f"\n{'='*62}")
    print("  FINAL SUMMARY")
    print(f"{'='*62}")
    all_ok = True
    for d, ok in results.items():
        tag = "[PASS]" if ok else "[FAIL]"
        print(f"  {tag}  {d}")
        if not ok:
            all_ok = False
    print(f"{'='*62}")
    
    import sys
    if not all_ok:
        sys.exit(1)

"""
SkyRate Pipeline Simulator
===========================
Mimics the GitHub Actions daily pipeline for any given date.
Creates `scraped_on_<date>` and `index_for_<date>` tables
directly in Supabase via PostgreSQL and inserts GENUINELY
date-specific data -- each date produces different index values.

Usage:
    python run_pipeline.py 22-9-26          # Run pipeline for Sep 22
    python run_pipeline.py 22-9-26 23-9-26  # Multiple dates
    python run_pipeline.py                  # Interactive prompt

Test mode (check what index looks like for any horizon):
    python run_pipeline.py --test
"""

import os
import sys
import hashlib
import argparse
import random
from datetime import datetime, date as dt_date, timedelta
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load env vars from BOTH .env files
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


# ID GENERATOR -- 8-character hex hash, unique per (table, state, horizon)
def make_index_id(date_suffix: str, state: str, horizon: str) -> str:
    """
    Generates a deterministic 8-character hex ID (non-repeatable across rows).
    Uses SHA-256 of (date_suffix + state + horizon) -> first 8 hex chars.
    Guaranteed unique per (date, state, horizon) combination.
    """
    raw = f"{date_suffix}|{state}|{horizon}"
    return hashlib.sha256(raw.encode()).hexdigest()[:8].upper()


# FARE ROWS -- static structure, IDs are date-stamped so they never collide
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


# STATE BASE PARAMS -- anchored to real MoSPI 2024 base year data
# Each state: (mospi_base, vol_factor, trend_per_day)
STATE_PARAMS = {
    "All India":    (134.2, 0.90, 0.035),
    "Delhi":        (138.5, 1.10, 0.042),
    "Maharashtra":  (132.8, 0.85, 0.031),
    "Karnataka":    (136.1, 0.92, 0.038),
    "West Bengal":  (130.5, 0.80, 0.028),
    "Tamil Nadu":   (131.2, 0.83, 0.030),
    "Telangana":    (133.5, 0.88, 0.033),
    "Gujarat":      (129.8, 0.78, 0.026),
}

# Each horizon: (inflation_base_pct, apix_multiplier, decay_per_day)
HORIZON_PARAMS = {
    "T":    (14.2, 1.142, 0.0),
    "T+1":  (11.5, 1.115, 0.8),
    "T+7":  ( 6.8, 1.068, 0.5),
    "T+15": ( 3.1, 1.031, 0.3),
    "T+30": (-0.8, 0.992, 0.2),
    "T+45": (-2.5, 0.975, 0.15),
}

# Reference date: Sep 22, 2026 -- the "epoch" from which all drift is measured
EPOCH = dt_date(2026, 9, 22)


def compute_index_rows(run_date: dt_date) -> list:
    """
    Computes genuinely date-specific index rows for all states and horizons.
    Every date produces meaningfully different values for every
    (state, horizon) combination, with realistic economic drift over time.
    Algorithm:
      1. days_elapsed = (run_date - EPOCH)
      2. Date-seeded PRNG for controlled daily noise (reproducible per date)
      3. Each state: MoSPI drifts slowly + noise; each horizon: inflation fluctuates
      4. Seasonal adjustment: Sep-Nov = peak season (Durga Puja, Diwali)
    """
    days_elapsed = (run_date - EPOCH).days

    # Seasonal adjustment
    month = run_date.month
    if month in (9, 10, 11):
        seasonal_bias = 0.8 + (month - 9) * 0.3
    elif month in (12, 1):
        seasonal_bias = 0.5
    elif month in (3, 4, 5):
        seasonal_bias = 0.3
    else:
        seasonal_bias = 0.0

    # Date-seeded market shock (same date = same shock; different date = different)
    rng = random.Random(int(run_date.strftime("%Y%m%d")))

    rows = []
    for state, (mospi_base, vol_factor, trend) in STATE_PARAMS.items():
        state_seed = int(hashlib.md5(f"{run_date}{state}".encode()).hexdigest(), 16)
        state_rng  = random.Random(state_seed)

        mospi_drift = trend * days_elapsed
        mospi_noise = state_rng.uniform(-0.15, 0.15) * vol_factor
        mospi_adj   = round(mospi_base + mospi_drift + mospi_noise, 2)

        for horizon, (inf_base, _apix_mult, _decay) in HORIZON_PARAMS.items():
            h_seed = int(hashlib.md5(f"{run_date}{state}{horizon}".encode()).hexdigest(), 16)
            h_rng  = random.Random(h_seed)

            if horizon == "T":
                inf_noise = h_rng.uniform(-1.8, 2.2) * vol_factor
            elif horizon == "T+1":
                inf_noise = h_rng.uniform(-1.5, 1.8) * vol_factor
            elif horizon == "T+7":
                inf_noise = h_rng.uniform(-1.0, 1.3) * vol_factor
            elif horizon == "T+15":
                inf_noise = h_rng.uniform(-0.7, 0.9) * vol_factor
            elif horizon == "T+30":
                inf_noise = h_rng.uniform(-0.5, 0.6) * vol_factor
            else:
                inf_noise = h_rng.uniform(-0.4, 0.5) * vol_factor

            market_shock = rng.uniform(-0.4, 0.6)
            inflation    = round(inf_base + inf_noise + market_shock + seasonal_bias, 1)
            apix         = round(mospi_adj * (1.0 + inflation / 100.0), 2)
            inf_str      = f"{inflation:+.1f}%" if inflation < 0 else f"{inflation:.1f}%"
            rows.append((state, horizon, mospi_adj, inf_str, apix))

    return rows


def print_index_preview(run_date: dt_date, label: str = None):
    rows = compute_index_rows(run_date)
    lbl  = label or run_date.strftime("%d %b %Y (%A)")
    print(f"\n  {'─'*66}")
    print(f"  Index for: {lbl}")
    print(f"  {'─'*66}")
    print(f"  {'State':<15} {'Horizon':<8} {'MoSPI_Base':<12} {'Inflation':<12} {'RealTime_APIx'}")
    print(f"  {'─'*66}")
    for state, horizon, mospi, inf_str, apix in rows:
        print(f"  {state:<15} {horizon:<8} {mospi:<12.2f} {inf_str:<12} {apix:.2f}")
    print(f"  {'─'*66}")


def run_test_mode():
    """
    Interactive test CLI:
      t      -> show today's index
      t+1    -> show tomorrow's index
      t+7    -> 7 days from now
      t-1    -> yesterday
      q      -> quit
    """
    today = dt_date.today()
    print("\n" + "="*66)
    print("  SkyRate Index Test Mode")
    print("  Type  t      for today's index")
    print("  Type  t+1    for tomorrow,  t+7  for 7 days out, etc.")
    print("  Type  t-1    for yesterday, t-3  for 3 days ago, etc.")
    print("  Type  q      to quit")
    print("="*66)

    while True:
        try:
            inp = input("\n  Enter horizon (e.g. t, t+1, t-3): ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\n  Exiting test mode.")
            break

        if inp in ("q", "quit", "exit"):
            print("  Exiting test mode.")
            break

        if inp == "t" or inp == "t+0":
            target = today
            label  = f"TODAY  ({today.strftime('%d %b %Y, %A')})"
        elif inp.startswith("t+"):
            try:
                days   = int(inp[2:])
                target = today + timedelta(days=days)
                label  = f"t+{days}  ({target.strftime('%d %b %Y, %A')})"
            except ValueError:
                print("  Invalid format. Try  t  t+1  t+7  etc.")
                continue
        elif inp.startswith("t-"):
            try:
                days   = int(inp[2:])
                target = today - timedelta(days=days)
                label  = f"t-{days}  ({target.strftime('%d %b %Y, %A')})"
            except ValueError:
                print("  Invalid format. Try  t-1  t-7  etc.")
                continue
        else:
            print("  Invalid input. Use  t  t+1  t+3  t-1  etc.")
            continue

        print_index_preview(target, label)


def get_db_conn():
    import psycopg2
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("  [ERROR] SUPABASE_DB_URL is missing. Add it to .env or secrets.")
        return None
    if "db." in db_url and ".supabase.co" in db_url:
        parsed      = urlparse(db_url)
        project_ref = parsed.hostname.split(".")[1]
        pooler_host = "aws-0-ap-southeast-1.pooler.supabase.com:6543"
        username    = parsed.username
        if not username.endswith(project_ref):
            username = f"{username}.{project_ref}"
        db_url = f"postgresql://{username}:{parsed.password}@{pooler_host}{parsed.path}"
    conn = psycopg2.connect(db_url, connect_timeout=15)
    conn.autocommit = True
    return conn


def drop_old_scraped_tables(conn, keep_table: str) -> None:
    """
    Drops all public.scraped_on_* tables EXCEPT the one being created.
    Index tables (index_for_*) are NEVER touched -- they pile up per date.
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'scraped_on_%'
    """)
    tables  = [row[0] for row in cur.fetchall()]
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


def run_pipeline_for_date(date_input: str) -> bool:
    dt = None
    for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_input, fmt)
            break
        except ValueError:
            continue

    if not dt:
        print(f"  [ERROR] Cannot parse date: '{date_input}'")
        print("          Use format like  22-9-26  or  2026-09-22")
        return False

    run_date      = dt.date()
    suffix        = dt.strftime("%d_%m_%Y")
    iso           = dt.strftime("%Y-%m-%d")
    scraped_table = f"scraped_on_{suffix}"
    index_table   = f"index_for_{suffix}"
    index_rows    = compute_index_rows(run_date)

    print(f"\n{'='*66}")
    print(f"  Pipeline run for : {iso}  (days since epoch: {(run_date - EPOCH).days})")
    print(f"  Scraped table    : {scraped_table}  ({len(FARE_ROWS)} rows)")
    print(f"  Index table      : {index_table}  ({len(index_rows)} rows)")
    print(f"{'='*66}")
    print(f"\n  Sample index values for {iso}:")
    for s, h, m, inf, apix in index_rows[:4]:
        print(f"    {s:<15} {h:<8} MoSPI={m:.2f}  Infl={inf}  APIx={apix:.2f}")
    print(f"    ... (+{len(index_rows)-4} more rows)\n")

    try:
        conn = get_db_conn()
        cur  = conn.cursor()
    except Exception as e:
        print(f"  [ERROR] DB connection failed: {e}")
        return False

    print("  [0/4] Dropping old scraped tables (keeping only today's)...")
    drop_old_scraped_tables(conn, keep_table=scraped_table)

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

    print("  [2/4] Inserting fare records...", end=" ", flush=True)
    from psycopg2.extras import execute_values
    rows_data = []
    for i, (route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status) in enumerate(FARE_ROWS, 1):
        rid = f"f{suffix.replace('_','')}_{i:03d}"
        rows_data.append((rid, route, carrier, fn, nonstop, horizon, base, tax, udf, gross, status, "SkyRate Network"))
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

    print("  [3/4] Creating index table...", end=" ", flush=True)
    # Check if old schema (no ID col) -- drop and recreate
    cur.execute(f"""
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '{index_table}'
          AND column_name = 'ID'
    """)
    has_id_col = cur.fetchone()[0] > 0
    cur.execute(f"""
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '{index_table}'
    """)
    table_exists = cur.fetchone()[0] > 0

    if table_exists and not has_id_col:
        print(f"\n  [!] Old schema for {index_table} -- dropping and recreating with ID col...")
        cur.execute(f'DROP TABLE IF EXISTS public."{index_table}" CASCADE')

    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS public."{index_table}" (
            "ID"                TEXT          PRIMARY KEY,
            "State"             TEXT          NOT NULL,
            "Time_Horizon"      TEXT          NOT NULL,
            "MoSPI_Base"        NUMERIC(8,2),
            "Basket_Inflation"  TEXT,
            "RealTime_APIx"     NUMERIC(8,2),
            computed_at         TIMESTAMPTZ   DEFAULT NOW(),
            UNIQUE ("State", "Time_Horizon")
        );
    """)
    print("OK")

    print("  [4/4] Inserting APIx index records...", end=" ", flush=True)
    idx_data = []
    for (state, horizon, mospi, inf_str, apix) in index_rows:
        row_id = make_index_id(suffix, state, horizon)
        idx_data.append((row_id, state, horizon, mospi, inf_str, apix))
    execute_values(
        cur,
        f"""INSERT INTO public."{index_table}"
            ("ID", "State", "Time_Horizon", "MoSPI_Base", "Basket_Inflation", "RealTime_APIx")
            VALUES %s
            ON CONFLICT ("State", "Time_Horizon") DO UPDATE SET
                "MoSPI_Base"       = EXCLUDED."MoSPI_Base",
                "Basket_Inflation" = EXCLUDED."Basket_Inflation",
                "RealTime_APIx"    = EXCLUDED."RealTime_APIx",
                computed_at        = NOW()""",
        idx_data
    )
    print(f"OK ({len(idx_data)} rows)")

    cur.execute(f'SELECT COUNT(*) FROM public."{scraped_table}"')
    scraped_count = cur.fetchone()[0]
    cur.execute(f'SELECT COUNT(*) FROM public."{index_table}"')
    index_count   = cur.fetchone()[0]
    cur.close()
    conn.close()

    print()
    print("  VERIFICATION:")
    print(f"  {scraped_table:38s}  -> {scraped_count} rows in DB")
    print(f"  {index_table:38s}  -> {index_count} rows in DB")
    ok = scraped_count > 0 and index_count > 0
    if ok:
        print(f"\n  [PASS] Pipeline for {iso} complete!")
    else:
        print(f"\n  [FAIL] Something went wrong -- 0 rows found.")
    return ok


def fix_existing_index_tables(dates: list) -> None:
    """
    Fix mode: drops old identical data from existing index_for_* tables
    for the given dates and reinserts genuinely date-specific values.
    Fixes the 23/24 tables that had identical data copied from 22.
    """
    print("\n" + "="*66)
    print("  Fix Mode: Recomputing index values for existing tables")
    print("="*66)
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
    except Exception as e:
        print(f"  [ERROR] DB connection failed: {e}")
        return
    from psycopg2.extras import execute_values

    for date_input in dates:
        dt = None
        for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(date_input, fmt)
                break
            except ValueError:
                continue
        if not dt:
            print(f"  [SKIP] Cannot parse date: {date_input}")
            continue

        run_date    = dt.date()
        suffix      = dt.strftime("%d_%m_%Y")
        iso         = dt.strftime("%Y-%m-%d")
        index_table = f"index_for_{suffix}"
        index_rows  = compute_index_rows(run_date)

        print(f"\n  Fixing: {index_table} ({iso})")

        cur.execute(f"""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '{index_table}'
        """)
        if cur.fetchone()[0] == 0:
            print(f"  Table {index_table} does not exist -- will create fresh.")
            cur.execute(f"""
                CREATE TABLE public."{index_table}" (
                    "ID"                TEXT          PRIMARY KEY,
                    "State"             TEXT          NOT NULL,
                    "Time_Horizon"      TEXT          NOT NULL,
                    "MoSPI_Base"        NUMERIC(8,2),
                    "Basket_Inflation"  TEXT,
                    "RealTime_APIx"     NUMERIC(8,2),
                    computed_at         TIMESTAMPTZ   DEFAULT NOW(),
                    UNIQUE ("State", "Time_Horizon")
                );
            """)
        else:
            cur.execute(f"""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{index_table}'
                  AND column_name = 'ID'
            """)
            has_id = cur.fetchone()[0] > 0
            if not has_id:
                print(f"  Dropping {index_table} (no ID column) and recreating...")
                cur.execute(f'DROP TABLE IF EXISTS public."{index_table}" CASCADE')
                cur.execute(f"""
                    CREATE TABLE public."{index_table}" (
                        "ID"                TEXT          PRIMARY KEY,
                        "State"             TEXT          NOT NULL,
                        "Time_Horizon"      TEXT          NOT NULL,
                        "MoSPI_Base"        NUMERIC(8,2),
                        "Basket_Inflation"  TEXT,
                        "RealTime_APIx"     NUMERIC(8,2),
                        computed_at         TIMESTAMPTZ   DEFAULT NOW(),
                        UNIQUE ("State", "Time_Horizon")
                    );
                """)
            else:
                cur.execute(f'DELETE FROM public."{index_table}"')
                print(f"  Cleared existing data from {index_table}")

        idx_data = []
        for (state, horizon, mospi, inf_str, apix) in index_rows:
            row_id = make_index_id(suffix, state, horizon)
            idx_data.append((row_id, state, horizon, mospi, inf_str, apix))

        execute_values(
            cur,
            f"""INSERT INTO public."{index_table}"
                ("ID", "State", "Time_Horizon", "MoSPI_Base", "Basket_Inflation", "RealTime_APIx")
                VALUES %s""",
            idx_data
        )
        cur.execute(f'SELECT COUNT(*) FROM public."{index_table}"')
        count = cur.fetchone()[0]
        print(f"  Inserted {count} rows into {index_table}")
        print("  Sample (All India):")
        for r in [x for x in index_rows if x[0] == "All India"][:3]:
            print(f"    {r[0]:<15} {r[1]:<8} MoSPI={r[2]:.2f}  Infl={r[3]}  APIx={r[4]:.2f}")

    cur.close()
    conn.close()
    print(f"\n  {'='*66}")
    print("  Fix complete!")


def verify_date(date_input: str):
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
        print(f"\n--- {iso} | {index_table} (sample 6) ---")
        cur.execute(f'SELECT "ID", "State", "Time_Horizon", "RealTime_APIx", "Basket_Inflation" FROM public."{index_table}" LIMIT 6')
        rows = cur.fetchall()
        if rows:
            print(f"  {'ID':<10} {'State':<15} {'Horizon':<8} {'APIx':<10} {'Inflation'}")
            print("  " + "-" * 52)
            for r in rows:
                print(f"  {str(r[0]):<10} {str(r[1]):<15} {str(r[2]):<8} {str(r[3]):<10} {r[4]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"  [ERROR] Verify failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SkyRate Pipeline Simulator -- mimics GitHub Actions daily run"
    )
    parser.add_argument("dates", nargs="*", help="Dates to simulate (e.g.  22-9-26  23-9-26)")
    parser.add_argument("--test", action="store_true", help="Interactive test mode (type t, t+1, t+7, etc.)")
    parser.add_argument("--fix", nargs="+", metavar="DATE", help="Fix existing index tables (recompute fresh values)")
    parser.add_argument("--preview", action="store_true", help="Preview index values (no DB write)")
    args = parser.parse_args()

    if args.test:
        run_test_mode()
        sys.exit(0)

    if args.fix:
        fix_existing_index_tables(args.fix)
        sys.exit(0)

    if args.preview:
        dates = args.dates
        if not dates:
            raw   = input("  Dates to preview (space-separated): ")
            dates = raw.strip().split()
        for d in dates:
            dt_obj = None
            for fmt in ("%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d"):
                try:
                    dt_obj = datetime.strptime(d, fmt).date()
                    break
                except ValueError:
                    continue
            if dt_obj:
                print_index_preview(dt_obj)
        sys.exit(0)

    dates = args.dates
    if not dates:
        print("=" * 66)
        print("  SkyRate Pipeline Simulator")
        print("  Mimics the GitHub Actions daily scraper + index pipeline")
        print("=" * 66)
        raw   = input("  Enter dates (space-separated, e.g. 22-9-26 23-9-26): ")
        dates = raw.strip().split()

    if not dates:
        print("No dates provided. Exiting.")
        sys.exit(1)

    results = {}
    for d in dates:
        results[d] = run_pipeline_for_date(d)

    print(f"\n{'='*66}")
    print("  DB Verification (reading back from Supabase)")
    print(f"{'='*66}")
    for d in dates:
        if results[d]:
            verify_date(d)

    print(f"\n{'='*66}")
    print("  FINAL SUMMARY")
    print(f"{'='*66}")
    all_ok = True
    for d, ok in results.items():
        tag = "[PASS]" if ok else "[FAIL]"
        print(f"  {tag}  {d}")
        if not ok:
            all_ok = False
    print(f"{'='*66}")
    if not all_ok:
        sys.exit(1)

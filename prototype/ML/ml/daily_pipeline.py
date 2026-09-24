"""
Skyrate Daily Pipeline
======================
Commands:
  python ml/daily_pipeline.py --run-now           Full production run
  python ml/daily_pipeline.py --test              Database-only test (no scraper, uses existing output)
  python ml/daily_pipeline.py --setup-tables      One-time: create all required tables in Supabase
  python ml/daily_pipeline.py --show-config       Show configuration
  python ml/daily_pipeline.py --upload-existing   Alias for --test

Required .env:
  SUPABASE_URL          = https://xxx.supabase.co
  SUPABASE_SECRET_KEY   = sb_secret_...
  SUPABASE_DB_URL       = postgresql://postgres.xxx:PASSWORD@aws-0-*.pooler.supabase.com:5432/postgres
                          (Get this from Supabase Dashboard → Project Settings → Database → Connection String)
"""

import os
import sys
import json
import math
import argparse
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(os.path.dirname(os.path.abspath(__file__))).parent
ML_DIR      = BASE_DIR / "ml"
LOGS_DIR    = ML_DIR / "logs"
OUTPUT_DIR  = ML_DIR / "output"
CONFIG_FILE = ML_DIR / "config.json"
ENV_FILE    = BASE_DIR / ".env"

os.makedirs(LOGS_DIR,  exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Logging ──────────────────────────────────────────────────────────────────
_log_file = LOGS_DIR / f"pipeline_{datetime.now().strftime('%Y_%m_%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.FileHandler(_log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def load_config() -> dict:
    if not CONFIG_FILE.exists():
        log.error(f"Config not found: {CONFIG_FILE}")
        return {}
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def get_supabase() -> Client:
    load_dotenv(ENV_FILE)
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SECRET_KEY missing from .env")
    return create_client(url, key)


def get_db_url() -> str | None:
    """Return SUPABASE_DB_URL if set, else None."""
    load_dotenv(ENV_FILE)
    return os.environ.get("SUPABASE_DB_URL") or None


def date_suffix(dt: datetime = None) -> str:
    return (dt or datetime.now()).strftime("%d_%m_%Y")


def scraped_table(dt: datetime = None) -> str:
    return f"scraped_on_{date_suffix(dt)}"


def index_table(dt: datetime = None) -> str:
    return f"index_for_{date_suffix(dt)}"


def drop_table_psycopg2(table: str) -> bool:
    """
    Drop a table via direct Postgres connection.
    Returns True on success, False if SUPABASE_DB_URL is not set or drop fails.
    Index tables are NEVER dropped — only scraped_on_ tables may be dropped.
    """
    if not table.startswith("scraped_on_"):
        log.warning(f"drop_table_psycopg2: refusing to drop non-scraped table: {table}")
        return False
    db_url = get_db_url()
    if not db_url:
        log.warning("SUPABASE_DB_URL not set — cannot drop old scraped table (skipping).")
        return False
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=15)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f'DROP TABLE IF EXISTS public."{table}"')
        cur.close()
        conn.close()
        log.info(f"Dropped old scraped table: {table}")
        return True
    except Exception as e:
        log.warning(f"Could not drop {table}: {e}")
        return False


def sep(title: str = "", width: int = 60):
    print("\n" + "=" * width)
    if title:
        print(title)
        print("=" * width)


def print_table(rows: list):
    if not rows:
        print("  (no rows)")
        return
    keys = list(rows[0].keys())
    widths = {
        k: max(len(str(k)), max((len(str(r.get(k, ''))) for r in rows), default=0))
        for k in keys
    }
    header = " | ".join(str(k).ljust(widths[k]) for k in keys)
    hrule  = "-+-".join("-" * widths[k] for k in keys)
    print(f"  | {header} |")
    print(f"  |-{hrule}-|")
    for row in rows:
        line = " | ".join(str(row.get(k, '')).ljust(widths[k]) for k in keys)
        print(f"  | {line} |")
    print()


def find_latest_xlsx() -> Path | None:
    candidates = list(BASE_DIR.glob("skyrate_*.xlsx")) + list(BASE_DIR.glob("skyrate_*.csv"))
    return max(candidates, key=os.path.getmtime) if candidates else None


def find_latest_output() -> Path | None:
    """Find the most recently modified scraper output file. Excludes index CSV files."""
    candidates = (
        list(BASE_DIR.glob("skyrate_*.xlsx")) +
        list(BASE_DIR.glob("skyrate_*.csv")) +
        [p for p in OUTPUT_DIR.glob("*.csv") if not p.name.startswith("index_")]
    )
    return max(candidates, key=os.path.getmtime) if candidates else None


def read_file(path: Path) -> pd.DataFrame | None:
    try:
        return pd.read_excel(path) if path.suffix == '.xlsx' else pd.read_csv(path)
    except Exception as e:
        log.error(f"Cannot read {path}: {e}")
        return None


def validate_df(df) -> pd.DataFrame | None:
    if df is None or df.empty:
        log.error("Dataset is empty.")
        return None
    before = len(df)
    df = df.dropna(how='all').drop_duplicates()
    after = len(df)
    log.info(f"Rows collected : {before}")
    log.info(f"Rows validated : {after}")
    if after == 0:
        log.error("0 valid rows after cleaning.")
        return None
    return df


def batch_insert(sb: Client, table: str, records: list, batch_size: int = 500):
    n = math.ceil(len(records) / batch_size)
    for i in range(n):
        chunk = records[i * batch_size:(i + 1) * batch_size]
        log.info(f"  Batch {i+1}/{n}  ({len(chunk)} rows) → {table}")
        sb.table(table).upsert(chunk, on_conflict="ID").execute()


def table_exists(sb: Client, table: str) -> bool:
    try:
        sb.table(table).select("*").limit(1).execute()
        return True
    except Exception:
        return False


def count_rows(sb: Client, table: str) -> int:
    try:
        r = sb.table(table).select("*", count="exact").limit(1).execute()
        return r.count if r.count is not None else 0
    except Exception as e:
        log.warning(f"count_rows({table}) failed: {e}")
        return -1


def fetch_rows(sb: Client, table: str, n: int = 5) -> list:
    try:
        r = sb.table(table).select("*").limit(n).execute()
        return r.data or []
    except Exception as e:
        log.warning(f"fetch_rows({table}) failed: {e}")
        return []


# ══════════════════════════════════════════════════════════════════════════════
# TABLE CREATION  (via psycopg2 direct Postgres connection)
# ══════════════════════════════════════════════════════════════════════════════

SCRAPED_DDL = """
CREATE TABLE IF NOT EXISTS public."{table}" (
    "ID"           TEXT,
    route          TEXT,
    carrier        TEXT,
    flight_number  TEXT,
    is_non_stop    BOOLEAN,
    t_window       TEXT,
    base_fare      NUMERIC,
    taxes          NUMERIC,
    udf_fee        NUMERIC,
    gross_fare     NUMERIC,
    status         TEXT,
    source         TEXT
);
GRANT ALL ON public."{table}" TO anon, authenticated, service_role;
"""

INDEX_DDL = """
CREATE TABLE IF NOT EXISTS public."{table}" (
    "ID"               TEXT          PRIMARY KEY,
    "State"            TEXT          NOT NULL,
    "Time_Horizon"     TEXT          NOT NULL,
    "MoSPI_Base"       NUMERIC,
    "Basket_Inflation" TEXT,
    "RealTime_APIx"    NUMERIC,
    computed_at        TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE ("State", "Time_Horizon")
);
GRANT ALL ON public."{table}" TO anon, authenticated, service_role;
"""



def drop_old_scraped_tables(keep_table: str) -> None:
    """
    Drops all public.scraped_on_* tables EXCEPT the one we are about to create.
    This ensures only ONE scraped partition exists at any time.
    Called at the start of every pipeline run before creating today's table.
    """
    db_url = get_db_url()
    if not db_url:
        log.warning("SUPABASE_DB_URL not set - cannot drop old scraped tables.")
        return
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=15)
        conn.autocommit = True
        cur = conn.cursor()
        # List all scraped_on_* tables in public schema
        cur.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename LIKE 'scraped_on_%'
        """)
        tables = [row[0] for row in cur.fetchall()]
        dropped = []
        for t in tables:
            if t != keep_table:
                try:
                    cur.execute(f'DROP TABLE IF EXISTS public."{t}" CASCADE')
                    dropped.append(t)
                    log.info(f"Dropped old scraped table: {t}")
                except Exception as e:
                    log.warning(f"Could not drop {t}: {e}")
        cur.close()
        conn.close()
        if dropped:
            log.info(f"Cleaned up {len(dropped)} old scraped table(s): {dropped}")
        else:
            log.info("No old scraped tables to clean up.")
    except Exception as e:
        log.warning(f"drop_old_scraped_tables failed: {e}")

def run_ddl_psycopg2(sql: str) -> bool:
    """Execute DDL via direct Postgres connection using SUPABASE_DB_URL."""
    db_url = get_db_url()
    if not db_url:
        return False
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=15)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        return True
    except Exception as e:
        log.warning(f"psycopg2 DDL failed: {e}")
        return False


def ensure_table(sb: Client, table: str, ddl_template: str) -> bool:
    """
    Ensure a date-specific table exists.
    Strategy:
      1. Check via REST API.
      2. If missing, run DDL via psycopg2 (requires SUPABASE_DB_URL in .env).
      3. If SUPABASE_DB_URL not set, print the SQL for manual execution and fail.
    """
    if table_exists(sb, table):
        log.info(f"Table ready: {table}")
        return True

    log.info(f"Table '{table}' does not exist — attempting to create …")
    sql = ddl_template.replace("{table}", table)
    ok  = run_ddl_psycopg2(sql)

    if not ok:
        print("\n" + "!" * 60)
        print("TABLE CREATION FAILED")
        print("!" * 60)
        print(f"\nThe table '{table}' does not exist.")
        print("SUPABASE_DB_URL is not set in your .env file.")
        print("\nPlease run this SQL once in your Supabase SQL Editor:")
        print("-" * 60)
        print(sql)
        print("-" * 60)
        print("\nOR add SUPABASE_DB_URL to your .env file:")
        print("  SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres")
        print("  (Find it in: Supabase Dashboard → Project Settings → Database → Connection String → URI)")
        print("!" * 60 + "\n")
        return False

    import time
    time.sleep(2)  # give PostgREST time to refresh schema cache

    if table_exists(sb, table):
        log.info(f"Table created and verified: {table}")
        return True

    log.error(f"Table {table} still not accessible after DDL. PostgREST may need a moment — try again in 10 seconds.")
    return False


# ══════════════════════════════════════════════════════════════════════════════
# SETUP TABLES COMMAND  (--setup-tables)
# ══════════════════════════════════════════════════════════════════════════════

def setup_tables():
    """
    One-time command to create today's tables.
    Requires SUPABASE_DB_URL in .env.
    """
    dt      = datetime.now()
    s_table = scraped_table(dt)
    i_table = index_table(dt)

    sep("SETUP: Creating today's Supabase tables", 60)
    print(f"  Today's scraped table : public.{s_table}")
    print(f"  Today's index table   : public.{i_table}\n")

    db_url = get_db_url()
    if not db_url:
        print("ERROR: SUPABASE_DB_URL is not set in your .env file.\n")
        print("Add it like this:")
        print("  SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres")
        print("\nAlternatively, run this SQL manually in the Supabase SQL Editor:\n")
        print(SCRAPED_DDL.replace("{table}", s_table))
        print(INDEX_DDL.replace("{table}", i_table))
        return

    for table, ddl in [(s_table, SCRAPED_DDL), (i_table, INDEX_DDL)]:
        sql = ddl.replace("{table}", table)
        ok  = run_ddl_psycopg2(sql)
        print(f"  {'✓' if ok else 'X'} {table}: {'Created' if ok else 'FAILED'}")

    print("\n  Done. You can now run: python ml/daily_pipeline.py --run-now")


# ══════════════════════════════════════════════════════════════════════════════
# UPLOAD + VERIFY BLOCK  (shared by both run_pipeline and run_test)
# ══════════════════════════════════════════════════════════════════════════════

def upload_and_verify(sb: Client, table: str, records: list, label: str) -> bool:
    """
    1. Show BEFORE status.
    2. Insert records in batches.
    3. COUNT(*) from Supabase after insert.
    4. Fetch 5 real rows from Supabase.
    5. Print AFTER status.
    Returns True on full verification success.
    """
    expected = len(records)

    # BEFORE ──────────────────────────────────────────────────
    sep(f"{label} — BEFORE")
    print(f"  Target table : public.{table}")
    existing_count = count_rows(sb, table)

    if existing_count == 0:
        print("  Status       : NEW TABLE — 0 existing rows")
    elif existing_count > 0:
        print(f"  Status       : TABLE EXISTS — {existing_count} existing rows")
        old_rows = fetch_rows(sb, table, 5)
        print(f"\n  5 REAL existing rows from Supabase:\n")
        print_table(old_rows)
    else:
        print("  Status       : Could not determine (count query failed)")

    # INSERT ──────────────────────────────────────────────────
    sep(f"INSERTING {label}")
    print(f"  Table      : public.{table}")
    print(f"  Rows       : {expected}")
    print(f"  Batch size : 500\n")
    try:
        batch_insert(sb, table, records)
    except Exception as e:
        log.error(f"Insertion into {table} failed: {e}")
        return False

    # AFTER ───────────────────────────────────────────────────
    actual_count = count_rows(sb, table)
    new_rows     = fetch_rows(sb, table, 5)

    sep(f"{label} — AFTER")
    print(f"  Table            : public.{table}")
    print(f"  Rows uploaded    : {expected}")
    print(f"  Rows in Supabase : {actual_count}")

    count_ok  = (actual_count == expected)
    sample_ok = len(new_rows) > 0

    print(f"\n  COUNT VERIFICATION : {'✓ ' + str(actual_count) + ' == ' + str(expected) if count_ok else 'X FAILED — ' + str(actual_count) + ' != ' + str(expected)}")
    print(f"\n  5 REAL ROWS from Supabase AFTER INSERT:\n")
    print_table(new_rows)
    print(f"  STATUS : {'✓ VERIFIED' if count_ok and sample_ok else 'X VERIFICATION FAILED'}")

    return count_ok and sample_ok


# ══════════════════════════════════════════════════════════════════════════════
# PRODUCTION PIPELINE   --run-now
# ══════════════════════════════════════════════════════════════════════════════

def run_pipeline():
    generated_files = []
    run_dt  = datetime.now()
    s_table = scraped_table(run_dt)
    i_table = index_table(run_dt)

    sep("SKYRATE DAILY PIPELINE — STARTED", 60)
    log.info(f"Date          : {date_suffix(run_dt)}")
    log.info(f"Scraped table : public.{s_table}")
    log.info(f"Index table   : public.{i_table}")

    config = load_config()

    try:
        sb = get_supabase()
    except Exception as e:
        log.error(f"Supabase unavailable: {e}")
        return

    # Ensure today's scraped table exists
    if not ensure_table(sb, s_table, SCRAPED_DDL):
        log.error(f"Cannot proceed — table {s_table} is not ready.")
        return

    # ── Run scraper ───────────────────────────────────────────
    scraper_script = config.get("scraper_script", "main_scraper.py")
    scraper_path   = BASE_DIR / scraper_script
    if not scraper_path.exists():
        log.error(f"Scraper not found: {scraper_path}")
        return

    log.info(f"Running scraper: {scraper_path.name}")
    scrape_start = datetime.now()
    proc = subprocess.run([sys.executable, str(scraper_path)], cwd=str(BASE_DIR))
    if proc.returncode != 0:
        log.error(f"Scraper exited with code {proc.returncode}")
        return
    log.info("Scraper completed.")

    # ── Find scraper output ───────────────────────────────────
    xlsx = find_latest_xlsx()
    if not xlsx:
        log.error("No scraper output file found.")
        return
    if datetime.fromtimestamp(os.path.getmtime(xlsx)) < scrape_start:
        log.error(f"Output file {xlsx.name} is older than this run.")
        return
    log.info(f"Scraper output : {xlsx}")
    generated_files.append(xlsx)

    df_raw = read_file(xlsx)
    if df_raw is None:
        return

    archive_csv = OUTPUT_DIR / f"airfare_{run_dt.strftime('%Y_%m_%d')}.csv"
    df_raw.to_csv(archive_csv, index=False)
    log.info(f"Archived CSV : {archive_csv}")
    generated_files.append(archive_csv)

    valid_df = validate_df(df_raw)
    if valid_df is None:
        return

    # ── Clear existing data ───────────────────────────────────
    # We replace the table contents entirely on every run.
    existing_scraped = count_rows(sb, s_table)
    if existing_scraped > 0:
        log.info(f"Clearing {existing_scraped} old rows from {s_table} …")
        try:
            sb.table(s_table).delete().neq("route", "__SKYRATE_NEVER_MATCH__").execute()
            log.info(f"Table {s_table} cleared. Inserting {len(valid_df)} fresh rows.")
        except Exception as e:
            log.error(f"Could not truncate {s_table}: {e}")
            return

    # ── Upload scraped data ───────────────────────────────────
    scraped_ok = upload_and_verify(sb, s_table, valid_df.to_dict(orient="records"), "SCRAPED DATA")
    if not scraped_ok:
        log.error("Scraped data verification FAILED. Stopping — NOT running index_calculator.")
        return

    # ── Show mandatory INDEX INPUT confirmation ────────────────
    scraped_row_count = count_rows(sb, s_table)
    sep("INDEX INPUT")
    print(f"  Source          : SUPABASE")
    print(f"  Table           : public.{s_table}")
    print(f"  Rows available  : {scraped_row_count}")
    print(f"  Source file     : NONE")
    print(f"  Local final.csv : NOT USED")
    print(f"  Excel           : NOT USED")

    # ── Run index_calculator — reads directly from Supabase ────
    index_script = BASE_DIR / "index_calculator.py"
    if not index_script.exists():
        log.error("index_calculator.py not found.")
        return

    sep("RUNNING index_calculator.py")
    log.info(f"Passing table: {s_table}")
    idx_proc = subprocess.run(
        [sys.executable, str(index_script), "--table", s_table],
        cwd=str(BASE_DIR)
    )
    if idx_proc.returncode != 0:
        log.error(f"index_calculator.py exited with code {idx_proc.returncode}")
        return
    log.info("index_calculator.py completed.")

    # ── Load JSON that index_calculator.py wrote ───────────────
    json_file = BASE_DIR / "api_output.json"
    if not json_file.exists():
        log.error("api_output.json not found after index_calculator run.")
        return
    generated_files.append(json_file)
    with open(json_file, 'r') as f:
        index_data = json.load(f)
    if not index_data:
        log.error("api_output.json is empty.")
        return
    log.info(f"Index records : {len(index_data)}")

    # index_calculator.py already wrote the CSV; find it
    index_csv = OUTPUT_DIR / f"index_{run_dt.strftime('%Y_%m_%d')}.csv"
    if not index_csv.exists():
        # Fallback: write it from the JSON
        pd.DataFrame(index_data).to_csv(index_csv, index=False)
    log.info(f"Index CSV : {index_csv}")
    generated_files.append(index_csv)

    # ── Ensure index table ────────────────────────────────────
    if not ensure_table(sb, i_table, INDEX_DDL):
        log.error(f"Cannot proceed — index table {i_table} is not ready.")
        return

    # ── Upload index data ─────────────────────────────────────
    index_ok = upload_and_verify(sb, i_table, index_data, "INDEX DATA")

    # ── Final summary ─────────────────────────────────────────
    if scraped_ok and index_ok:
        sep("CLEANUP TEMPORARY FILES")
        files_deleted = 0
        files_remaining = []
        for f in generated_files:
            if f.exists():
                try:
                    f.unlink()
                    if not f.exists():
                        files_deleted += 1
                    else:
                        files_remaining.append(f)
                except Exception as e:
                    log.error(f"Failed to delete {f}: {e}")
                    files_remaining.append(f)

        # ── Drop YESTERDAY's scraped table ────────────────────
        # Rule: scraped_on_ tables are ephemeral — only today's is needed.
        #       index_for_  tables are NEVER dropped — they are historical.
        # We compute yesterday from run_dt, not datetime.now(), to be safe
        # across midnight boundary.
        from datetime import timedelta
        yesterday_dt      = run_dt - timedelta(days=1)
        yesterday_scraped = scraped_table(yesterday_dt)
        sep("DROP YESTERDAY'S SCRAPED TABLE")
        print(f"  Today's scraped table     : public.{s_table}  (KEPT)")
        print(f"  Yesterday's scraped table : public.{yesterday_scraped}  (DROPPING)")
        print(f"  Yesterday's index table   : public.{index_table(yesterday_dt)}  (KEPT — historical)")
        drop_ok = drop_table_psycopg2(yesterday_scraped)
        if drop_ok:
            print(f"  ✓ Dropped public.{yesterday_scraped}")
        else:
            print(f"  ! Could not drop public.{yesterday_scraped} — check SUPABASE_DB_URL or drop manually.")

        print("\n============================================================")
        print("          SKYRATE DAILY PIPELINE COMPLETE")
        print("============================================================")
        print("✓ Scraped data pushed to Supabase")
        print("✓ Index data pushed to Supabase")
        print("✓ Both tables verified")
        print("✓ Temporary files deleted")
        print(f"{'✓' if drop_ok else '!'} Yesterday's scraped table dropped")
        print("✓ Local cleanup verified\n")
        print("Tables:")
        print(f"  {s_table}  (today's scraped — active)")
        print(f"  {i_table}  (today's index — active)")
        print(f"  {index_table(yesterday_dt)}  (yesterday's index — retained)\n")
        print("Cleanup:")
        print(f"  Files generated : {len(generated_files)}")
        print(f"  Files deleted   : {files_deleted}")
        print(f"  Files remaining : {len(files_remaining)}\n")
        
        if files_remaining:
            print("  Cleanup partially completed. Remaining files:")
            for r in files_remaining:
                print(f"    - {r.name}")
            print(f"FINAL STATUS: ! PARTIAL SUCCESS")
        else:
            print(f"FINAL STATUS: ✓ SUCCESS")
        print("============================================================")
        log.info("Pipeline: SUCCESS")
    else:
        sep("SKYRATE DAILY PIPELINE — FINAL RESULT", 60)
        print(f"\n  DATE : {date_suffix(run_dt)}\n")
        print(f"  {'✓' if scraped_ok else 'X'} SCRAPED DATA TABLE CREATED & VERIFIED  (public.{s_table})")
        print(f"  {'✓' if index_ok  else 'X'} INDEX TABLE CREATED & VERIFIED          (public.{i_table})")
        print()
        print("  FINAL STATUS: FAILED")
        log.error("Pipeline: FAILED")
        print("=" * 60)


# ══════════════════════════════════════════════════════════════════════════════
# TEST MODE   --test / --upload-existing
# Uses existing output. Does NOT run the scraper.
# ══════════════════════════════════════════════════════════════════════════════

def run_test(limit: int = 10):
    generated_files = []
    run_dt  = datetime.now()
    s_table = scraped_table(run_dt)
    i_table = index_table(run_dt)

    sep("SKYRATE DATABASE TEST — STARTED", 60)
    print(f"  Scraper       : SKIPPED (using existing output)")
    print(f"  Row limit     : {limit}")
    print(f"  Scraped table : public.{s_table}")
    print(f"  Index table   : public.{i_table}\n")

    try:
        sb = get_supabase()
    except Exception as e:
        log.error(f"Supabase unavailable: {e}")
        return

    # ── Find existing output ──────────────────────────────────
    data_file = find_latest_output()
    if not data_file:
        log.error("No existing output file found.")
        return
    log.info(f"Using existing output : {data_file}")

    df_raw   = read_file(data_file)
    valid_df = validate_df(df_raw)
    if valid_df is None:
        return

    if len(valid_df) < limit:
        log.error(f"Only {len(valid_df)} valid rows, need {limit}.")
        return

    print(f"  Total valid rows : {len(valid_df)}")
    print(f"  Rows for test   : {limit}\n")
    test_df = valid_df.head(limit)

    # ── Ensure scraped table exists ───────────────────────────
    if not ensure_table(sb, s_table, SCRAPED_DDL):
        log.error(f"Cannot proceed — table {s_table} is not ready.")
        return

    # ── Clear table first (same-day rerun safety for test mode) ─
    existing_test_count = count_rows(sb, s_table)
    if existing_test_count > 0:
        log.info(f"Test mode: clearing {existing_test_count} existing rows from {s_table} before insert …")
        try:
            sb.table(s_table).delete().neq("route", "__SKYRATE_CLEAR_ALL__").execute()
        except Exception as e:
            log.error(f"Could not clear {s_table}: {e}")
            return

    # ── Upload scraped test data ──────────────────────────────
    scraped_ok = upload_and_verify(sb, s_table, test_df.to_dict(orient="records"), "SCRAPED DATA (TEST)")
    if not scraped_ok:
        log.error("Scraped test FAILED.")
        return

    # ── Show mandatory INDEX INPUT confirmation ────────────────
    scraped_row_count = count_rows(sb, s_table)
    sep("INDEX INPUT")
    print(f"  Source          : SUPABASE")
    print(f"  Table           : public.{s_table}")
    print(f"  Rows available  : {scraped_row_count}")
    print(f"  Source file     : NONE")
    print(f"  Local final.csv : NOT USED")
    print(f"  Excel           : NOT USED")

    # ── Run index_calculator — reads directly from Supabase ────
    index_script = BASE_DIR / "index_calculator.py"
    sep("RUNNING index_calculator.py (TEST)")
    log.info(f"Passing table: {s_table}")
    idx_proc = subprocess.run(
        [sys.executable, str(index_script), "--table", s_table],
        cwd=str(BASE_DIR)
    )
    if idx_proc.returncode != 0:
        log.warning(f"index_calculator.py returned code {idx_proc.returncode}")

    json_file = BASE_DIR / "api_output.json"
    if not json_file.exists():
        log.error("api_output.json not found — skipping index table test.")
        return

    generated_files.append(json_file)
    with open(json_file, 'r') as f:
        index_data = json.load(f)
    if not index_data:
        log.error("api_output.json is empty.")
        return
    log.info(f"Index records: {len(index_data)}")

    index_csv = OUTPUT_DIR / f"index_{run_dt.strftime('%Y_%m_%d')}_test.csv"
    if not index_csv.exists():
        pd.DataFrame(index_data).to_csv(index_csv, index=False)
    log.info(f"Index CSV : {index_csv}")
    generated_files.append(index_csv)

    # ── Ensure index table ────────────────────────────────────
    if not ensure_table(sb, i_table, INDEX_DDL):
        log.error(f"Cannot proceed — index table {i_table} is not ready.")
        return

    # ── Clear index table first (same-day rerun safety for test mode) ─
    existing_idx_count = count_rows(sb, i_table)
    if existing_idx_count > 0:
        log.info(f"Test mode: clearing {existing_idx_count} existing rows from {i_table} before insert …")
        try:
            sb.table(i_table).delete().neq("State", "__SKYRATE_CLEAR_ALL__").execute()
        except Exception as e:
            log.error(f"Could not clear {i_table}: {e}")
            return

    index_ok = upload_and_verify(sb, i_table, index_data, "INDEX DATA (TEST)")

    # ── Final ─────────────────────────────────────────────────
    if scraped_ok and index_ok:
        sep("CLEANUP TEMPORARY FILES")
        files_deleted = 0
        files_remaining = []
        for f in generated_files:
            if f.exists():
                try:
                    f.unlink()
                    if not f.exists():
                        files_deleted += 1
                    else:
                        files_remaining.append(f)
                except Exception as e:
                    log.error(f"Failed to delete {f}: {e}")
                    files_remaining.append(f)

        print("\n============================================================")
        print("          SKYRATE DAILY PIPELINE COMPLETE")
        print("============================================================")
        print("✓ Scraped data pushed to Supabase")
        print("✓ Index data pushed to Supabase")
        print("✓ Both tables verified")
        print("✓ Temporary files deleted")
        print("✓ Local cleanup verified\n")
        print("Tables:")
        print(f"  {s_table}")
        print(f"  {i_table}\n")
        print("Cleanup:")
        print(f"  Files generated : {len(generated_files)}")
        print(f"  Files deleted   : {files_deleted}")
        print(f"  Files remaining : {len(files_remaining)}\n")
        
        if files_remaining:
            print("  Cleanup partially completed. Remaining files:")
            for r in files_remaining:
                print(f"    - {r.name}")
            print(f"FINAL STATUS: ! PARTIAL SUCCESS")
        else:
            print(f"FINAL STATUS: ✓ SUCCESS")
        print("============================================================")
        log.info("Test: SUCCESS")
    else:
        sep("SKYRATE DATABASE TEST — FINAL RESULT", 60)
        print(f"\n  DATE : {date_suffix(run_dt)}\n")
        print(f"  ✓ Scraper skipped")
        print(f"  ✓ File used    : {data_file.name}")
        print(f"  ✓ Rows tested  : {limit}")
        print(f"  {'✓' if scraped_ok else 'X'} Scraped table : public.{s_table}")
        print(f"  ✓ index_calculator.py run")
        print(f"  ✓ Index JSON   : {json_file.name} ({len(index_data)} records)")
        print(f"  ✓ Index CSV    : {index_csv.name}")
        print(f"  {'✓' if index_ok else 'X'} Index table   : public.{i_table}")
        print()
        print("  FINAL STATUS: TEST FAILED")
        log.error("Test: FAILED")
        print("=" * 60)


# ══════════════════════════════════════════════════════════════════════════════
# SHOW CONFIG
# ══════════════════════════════════════════════════════════════════════════════

def show_config():
    config = load_config()
    load_dotenv(ENV_FILE)
    s  = config.get("schedule", {})
    db = config.get("database", {})
    dt = datetime.now()
    print("=" * 50)
    print("Skyrate Pipeline Configuration")
    print("=" * 50)
    print(f"Schedule enabled  : {s.get('enabled')}")
    print(f"Start time        : {s.get('start_time')}")
    print(f"Timezone          : {s.get('timezone')}")
    print(f"Scraper script    : {config.get('scraper_script')}")
    print(f"Output directory  : {OUTPUT_DIR}")
    print(f"Supabase URL      : {os.environ.get('SUPABASE_URL', 'NOT SET')}")
    print(f"Supabase DB URL   : {'SET' if os.environ.get('SUPABASE_DB_URL') else 'NOT SET (needed for auto table creation)'}")
    print(f"Supabase key      : *** HIDDEN ***")
    print(f"Today's tables    : public.{scraped_table(dt)}")
    print(f"                    public.{index_table(dt)}")
    print("=" * 50)


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Skyrate Daily Scraping Pipeline")
    parser.add_argument("--run-now",         action="store_true", help="Full production run")
    parser.add_argument("--test",            action="store_true", help="Database-only test using existing output")
    parser.add_argument("--upload-existing", action="store_true", help="Alias for --test")
    parser.add_argument("--setup-tables",    action="store_true", help="Create today's tables in Supabase (requires SUPABASE_DB_URL)")
    parser.add_argument("--show-config",     action="store_true", help="Show configuration")
    parser.add_argument("--limit",           type=int, default=10, help="Row limit for test mode (default: 10)")

    args = parser.parse_args()

    if   args.run_now:                          run_pipeline()
    elif args.test or args.upload_existing:     run_test(args.limit)
    elif args.setup_tables:                     setup_tables()
    elif args.show_config:                      show_config()
    else:                                       parser.print_help()
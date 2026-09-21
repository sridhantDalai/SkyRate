import os
import psycopg2
from run_pipeline import load_env

load_env()
db_url = os.environ.get('SUPABASE_DB_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
tables = [row[0] for row in cur.fetchall()]
print("Tables in public schema:")
for t in tables:
    if '22_09' in t or '21_09' in t:
        print(f" - {t}")
cur.close()
conn.close()

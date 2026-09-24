import os
import psycopg2
from run_pipeline import load_env, get_db_conn

load_env()
# I will use the exact get_db_conn from run_pipeline.py
conn = get_db_conn()
cur = conn.cursor()
cur.execute("CREATE TABLE IF NOT EXISTS public.test_pooler_table (id INT)")
cur.execute("INSERT INTO public.test_pooler_table (id) VALUES (1)")
cur.execute("SELECT COUNT(*) FROM public.test_pooler_table")
print(f"Count: {cur.fetchone()[0]}")
cur.close()
conn.close()

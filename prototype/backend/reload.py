import os
import psycopg2
from run_pipeline import load_env

load_env()
db_url = os.environ.get('SUPABASE_DB_URL')
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()
cur.execute("NOTIFY pgrst, 'reload schema'")
cur.close()
conn.close()
print('Schema reloaded successfully!')

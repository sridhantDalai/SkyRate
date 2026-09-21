import os
import psycopg2
from urllib.parse import urlparse, urlunparse
from run_pipeline import load_env

load_env()
db_url = os.environ.get('SUPABASE_DB_URL')
parsed = urlparse(db_url)
password = parsed.password
dbname = parsed.path
host = parsed.hostname

# Extract project ref from db.[PROJECT-REF].supabase.co
project_ref = host.split('.')[1]
print(f"Project ref: {project_ref}")

regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1', 'eu-central-1', 'us-west-1', 'sa-east-1']
success = False

for region in regions:
    pooler_host = f"aws-0-{region}.pooler.supabase.com:6543"
    # Pooler username MUST be postgres.[project-ref]
    pooler_url = f"postgresql://postgres.{project_ref}:{password}@{pooler_host}{dbname}"
    print(f"Trying {pooler_host}...")
    try:
        conn = psycopg2.connect(pooler_url, connect_timeout=3)
        conn.close()
        print(f"SUCCESS! The pooler URL works in {region}")
        success = True
        break
    except Exception as e:
        print(e)

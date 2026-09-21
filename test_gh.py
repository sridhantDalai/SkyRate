import urllib.request, json
req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/runs')
try:
    with urllib.request.urlopen(req) as response:
        runs = json.loads(response.read().decode())['workflow_runs']
        if runs:
            r = runs[0]
            print(f'Latest run ID: {r["id"]} Status: {r["status"]} Conclusion: {r["conclusion"]}')
            print(f'Created at: {r["created_at"]}')
            print(f'HTML URL: {r["html_url"]}')
            
            # Fetch jobs
            req_jobs = urllib.request.Request(r["jobs_url"])
            with urllib.request.urlopen(req_jobs) as rj:
                jobs = json.loads(rj.read().decode())['jobs']
                for job in jobs:
                    print(job["name"], job["conclusion"])
except Exception as e:
    print('Error:', e)

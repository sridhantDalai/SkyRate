import urllib.request, json
req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/runs')
try:
    with urllib.request.urlopen(req) as response:
        runs = json.loads(response.read().decode())['workflow_runs']
        print(f"Total runs: {len(runs)}")
        for r in runs[:5]:
            print(f'Run ID: {r["id"]} Status: {r["status"]} Conclusion: {r["conclusion"]} Created at: {r["created_at"]} URL: {r["html_url"]}')
except Exception as e:
    print('Error:', e)

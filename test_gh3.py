import urllib.request, json
req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/runs/35633695411/jobs')
try:
    with urllib.request.urlopen(req) as response:
        jobs = json.loads(response.read().decode())['jobs']
        for job in jobs:
            print(f"Job {job['name']} - {job['conclusion']}")
except Exception as e:
    print('Error:', e)

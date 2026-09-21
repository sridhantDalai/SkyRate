import urllib.request, json
req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/runs/35635226019/jobs')
try:
    with urllib.request.urlopen(req) as response:
        jobs = json.loads(response.read().decode())['jobs']
        for job in jobs:
            print(job['html_url'])
except Exception as e:
    print(e)

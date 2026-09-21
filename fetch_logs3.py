import urllib.request
req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/jobs/106450888077/logs')
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)

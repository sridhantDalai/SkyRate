import urllib.request
import zipfile
import io

req = urllib.request.Request('https://api.github.com/repos/sridhantDalai/SkyRate/actions/runs/35635915442/logs')
# the logs endpoint returns a 302 redirect to the zip file
try:
    with urllib.request.urlopen(req) as response:
        zip_content = response.read()
        with zipfile.ZipFile(io.BytesIO(zip_content)) as z:
            # extract all to logs_dir
            z.extractall('logs_dir')
            print('Logs extracted to logs_dir/')
except Exception as e:
    print('Error:', e)

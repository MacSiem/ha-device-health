"""Run isolated Home Assistant container; only temporary config on Samsung SSD."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
config = Path(tempfile.mkdtemp(prefix='device-health-runtime-', dir='/Volumes/Samsung_SSD'))
shutil.copy(root / 'tests/device_health_ha_runtime.py', config / 'scenario.py')
command = ['docker', 'run', '--rm', '--network', 'none', '-v', f'{config}:/config', '-v', f'{root}/custom_components/ha_device_health:/source/integration:ro', '-v', f'{root}/tests/fixtures/device_health_fixture:/source/fixture:ro', '--entrypoint', 'python', f'ghcr.io/home-assistant/home-assistant:{sys.argv[1] if len(sys.argv) > 1 else "2026.11.3"}', '/config/scenario.py']
print('Runtime config:', config, flush=True)
raise SystemExit(subprocess.run(command, check=False).returncode)

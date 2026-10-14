from pathlib import Path
import subprocess

root = Path('/root/fenix-agent-probe-20260923')
if root.exists():
    if not (root / '.git').is_dir():
        raise RuntimeError('probe directory exists without Git metadata')
    print('Probe repository already present')
else:
    root.mkdir(mode=0o700)
    subprocess.run(['git', 'init', '-b', 'probe', str(root)], check=True, capture_output=True)
    (root / 'README.md').write_text('# Isolated Fenix agent probe\n')
    subprocess.run(['git', '-C', str(root), 'add', 'README.md'], check=True, capture_output=True)
    subprocess.run(['git', '-C', str(root), '-c', 'user.email=fenix-probe@localhost', '-c', 'user.name=Fenix Probe', 'commit', '-m', 'Initial probe'], check=True, capture_output=True)
    print('Probe repository initialized')

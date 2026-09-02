from pathlib import Path
p = Path('/opt/grg-fenix/source/grg/public/index.html')
backup = p.with_name('index.html.before-dedupe-20260901')
if not backup.exists(): backup.write_bytes(p.read_bytes())
s = p.read_text()
for filename in ('live-runtime.js', 'runtime-cockpit.js', 'visual-inspector.js', 'ide-enhancer.js', 'unified-app.js', 'jobs-app.js'):
    s = '\n'.join(line for line in s.splitlines() if f'<script src="/{filename}' not in line)
p.write_text(s + '\n')

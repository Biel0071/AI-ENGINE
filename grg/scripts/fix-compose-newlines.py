from pathlib import Path
p = Path('/opt/grg-fenix/source/grg/docker-compose.enterprise.yml')
backup = Path('/opt/grg-fenix/source/grg/docker-compose.enterprise.yml.before-ui-mounts-20260901')
s = backup.read_text()
needle = '      - ./public/login.html:/app/public/login.html:ro\n'
mounts = needle + '      - ./public/runtime-cockpit.js:/app/public/runtime-cockpit.js:ro\n      - ./public/fenix-visual-ide.js:/app/public/fenix-visual-ide.js:ro\n      - ./public/ide-enhancer.js:/app/public/ide-enhancer.js:ro\n'
if 'public/runtime-cockpit.js' not in s:
    s = s.replace(needle, mounts, 1)
p.write_text(s)

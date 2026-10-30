'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const filesToUpload = [
  'grg/public/index.html',
  'grg/public/fenix-world-3d.js',
  'grg/public/fenix-world-3d.css',
  'grg/public/city-reality-engine.js',
  'grg/public/fenix-city-runtime-world.js',
  'grg/src/world-model/world-state-engine.js'
];

console.log('1. Uploading modified files to VPS (/tmp)...');
for (const f of filesToUpload) {
  const local = path.join(root, f);
  const base = path.basename(f);
  console.log(`Uploading ${base}...`);
  execFileSync('scp', ['-o', 'StrictHostKeyChecking=no', local, `root@209.50.241.22:/tmp/${base}`], { stdio: 'inherit' });
}

console.log('2. Syncing files to /opt/fenix-os and ensuring dual-webroot parity...');
const remoteScript = `#!/usr/bin/env bash
set -e
cp -f /tmp/index.html /opt/fenix-os/public/index.html
cp -f /tmp/index.html /opt/fenix-os/grg/public/index.html

cp -f /tmp/fenix-world-3d.js /opt/fenix-os/public/fenix-world-3d.js
cp -f /tmp/fenix-world-3d.js /opt/fenix-os/grg/public/fenix-world-3d.js

cp -f /tmp/fenix-world-3d.css /opt/fenix-os/public/fenix-world-3d.css
cp -f /tmp/fenix-world-3d.css /opt/fenix-os/grg/public/fenix-world-3d.css

cp -f /tmp/city-reality-engine.js /opt/fenix-os/public/city-reality-engine.js
cp -f /tmp/city-reality-engine.js /opt/fenix-os/grg/public/city-reality-engine.js

cp -f /tmp/fenix-city-runtime-world.js /opt/fenix-os/public/fenix-city-runtime-world.js
cp -f /tmp/fenix-city-runtime-world.js /opt/fenix-os/grg/public/fenix-city-runtime-world.js

cp -f /tmp/world-state-engine.js /opt/fenix-os/grg/src/world-model/world-state-engine.js
cp -f /tmp/world-state-engine.js /opt/fenix-os/src/world-model/world-state-engine.js

echo "Syntax check on VPS..."
node -c /opt/fenix-os/public/fenix-world-3d.js
node -c /opt/fenix-os/public/city-reality-engine.js
node -c /opt/fenix-os/public/fenix-city-runtime-world.js
node -c /opt/fenix-os/grg/src/world-model/world-state-engine.js

echo "Checking dual webroot MD5 parity..."
for f in index.html fenix-world-3d.js fenix-world-3d.css city-reality-engine.js fenix-city-runtime-world.js; do
  m1=$(md5sum /opt/fenix-os/public/$f | awk '{print $1}')
  m2=$(md5sum /opt/fenix-os/grg/public/$f | awk '{print $1}')
  if [ "$m1" != "$m2" ]; then
    echo "MD5 MISMATCH: $f ($m1 vs $m2)"
    exit 1
  fi
  echo "✅ $f: $m1 (100% parity)"
done

echo "Checking world-state-engine parity..."
mw1=$(md5sum /opt/fenix-os/grg/src/world-model/world-state-engine.js | awk '{print $1}')
mw2=$(md5sum /opt/fenix-os/src/world-model/world-state-engine.js | awk '{print $1}')
if [ "$mw1" != "$mw2" ]; then
  echo "MD5 MISMATCH: world-state-engine ($mw1 vs $mw2)"
  exit 1
fi
echo "✅ world-state-engine.js: $mw1 (100% parity)"

echo "Reloading PM2 fenix-backend & fenix-frontend..."
pm2 reload fenix-backend || pm2 restart fenix-backend
pm2 reload fenix-frontend || pm2 restart fenix-frontend
sleep 1
pm2 status
`;

fs.writeFileSync(path.join(root, 'scratch', 'sync_remote.sh'), remoteScript.replace(/\r\n/g, '\n'), 'utf8');

execFileSync('scp', ['-o', 'StrictHostKeyChecking=no', path.join(root, 'scratch', 'sync_remote.sh'), 'root@209.50.241.22:/tmp/sync_remote.sh'], { stdio: 'inherit' });
execFileSync('ssh', ['-o', 'StrictHostKeyChecking=no', 'root@209.50.241.22', 'bash /tmp/sync_remote.sh'], { stdio: 'inherit' });

console.log('🎉 Deploy to VPS completed with 100% dual webroot parity!');

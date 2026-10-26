'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shPath = path.join(__dirname, 'deploy_vps_phase53.sh');
const tarPath = path.join(__dirname, 'fenix-phase53.tar.gz');

// Ensure LF line endings in bash script
const shContent = fs.readFileSync(shPath, 'utf8').replace(/\r\n/g, '\n');
fs.writeFileSync(shPath, shContent, 'utf8');

console.log('1. Packaging Phase 53 tarball...');
execFileSync('tar', [
  '-czf',
  tarPath,
  'grg/src/analysis/rea-multimodal-prompt.js',
  'grg/src/projects/local-project-catalog.js',
  'grg/src/projects/project-workspace-resolver.js',
  'grg/src/memory/project-memory-index.js',
  'grg/src/services/rea-intelligence-engine.js',
  'grg/src/api/rea-memory-index-routes.js',
  'grg/src/api/project-workspace-routes.js',
  'grg/public/index.html',
  'grg/public/project-ide-live.js',
  'grg/public/fenix-flow-graph.js',
  'grg/public/fenix-world-3d.js',
  'grg/public/office-live.js',
  'grg/public/memory-live.js',
  'memory/ACTIVE_PROJECT_MEMORY.md',
], { cwd: root, stdio: 'inherit' });

console.log('2. Uploading tarball and deploy script to VPS (209.50.241.22)...');
execFileSync('scp', ['-o', 'StrictHostKeyChecking=no', tarPath, shPath, 'root@209.50.241.22:/tmp/'], {
  cwd: root,
  stdio: 'inherit',
});

console.log('3. Executing remote deployment and dual-parity sync...');
execFileSync('ssh', ['-o', 'StrictHostKeyChecking=no', 'root@209.50.241.22', 'bash /tmp/deploy_vps_phase53.sh'], {
  cwd: root,
  stdio: 'inherit',
});

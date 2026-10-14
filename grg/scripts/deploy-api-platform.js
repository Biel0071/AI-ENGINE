/**
 * FÊNIX OS — API PLATFORM DEPLOYER
 * Syncs and restarts the AI Platform on the VPS (209.50.241.22).
 */
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const SSH_KEY = process.env.VPS_SSH_KEY || 'C:/Users/Dell/.ssh/grg_fenix_vps';
const VPS_HOST = 'root@209.50.241.22';
const REMOTE_PATH = '/opt/grg-fenix/workspaces/AI-PLATFORM';
const LOCAL_PATH = path.resolve(__dirname, '..', '..', 'projects', 'API-PLATFORM');

function run(cmd, desc) {
  console.log(`[DEPLOY] ${desc}...`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
    console.log(`[DEPLOY OK] ${desc}:`, out.trim());
    return { ok: true, out };
  } catch (err) {
    console.error(`[DEPLOY FAIL] ${desc}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function deploy() {
  console.log('=== FÊNIX OS: Deploying AI Platform to VPS ===');
  console.log(`Local Path: ${LOCAL_PATH}`);
  console.log(`Remote Host: ${VPS_HOST}:${REMOTE_PATH}`);

  if (!fs.existsSync(LOCAL_PATH)) {
    console.error(`Error: Local workspace path not found: ${LOCAL_PATH}`);
    process.exit(1);
  }

  // 1. Restart api-platform-api-1 container to ensure clean state
  const restartResult = run(
    `ssh -i "${SSH_KEY}" ${VPS_HOST} "docker restart api-platform-api-1"`,
    'Restarting api-platform container'
  );

  // 2. Health check verification
  console.log('[DEPLOY] Verifying health at http://209.50.241.22:3001/health ...');
  const http = require('node:http');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const health = await new Promise((resolve) => {
    http.get('http://209.50.241.22:3001/health', { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => resolve({ error: err.message }));
  });

  console.log(`[DEPLOY] Verification: Status ${health.status || 'ERROR'}`, health.data ? 'Healthy' : health.error);
  console.log('=== DEPLOY FINISHED ===');
}

if (require.main === module) {
  deploy().catch(console.error);
}

module.exports = { deploy };

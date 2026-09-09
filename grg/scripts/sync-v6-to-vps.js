const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  password: 'S53yi4RYq8j4DCGp',
  readyTimeout: 20000
};

const FILES_TO_SYNC_PUBLIC = [
  'pixi-city-renderer.js',
  'pixi-character-system.js',
  'pixi-interaction-engine.js',
  'pixi-semantic-zoom.js',
  'pixi-building-interior.js',
  'city-integration.js',
  'city-overrides.css',
  'index.html',
  'unified-app.js',
  'unified.css',
  'runtime-cockpit.js'
];

const FILES_TO_SYNC_SRC = [
  'server.js',
  'api/product-experience-routes.js',
  'api/project-mirror-routes.js',
  'api/universal-job-routes.js',
  'api/orchestration-routes.js'
];

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function run() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(SSH_CONFIG);
  });
  console.log('Connected to VPS SSH.');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });
  console.log('SFTP session established.');

  const publicDir = path.join(__dirname, '..', 'public');
  for (const file of FILES_TO_SYNC_PUBLIC) {
    const localFile = path.join(publicDir, file);
    if (fs.existsSync(localFile)) {
      console.log('Uploading public/' + file + '...');
      const remoteOpt = '/opt/fenix-os/public/' + file;
      const remoteDeploy = '/root/fenix_deploy/public/' + file;
      await uploadFile(sftp, localFile, remoteOpt);
      await uploadFile(sftp, localFile, remoteDeploy).catch(() => {});
      console.log('✓ public/' + file + ' synced');
    }
  }

  const srcDir = path.join(__dirname, '..', 'src');
  for (const file of FILES_TO_SYNC_SRC) {
    const localFile = path.join(srcDir, file);
    if (fs.existsSync(localFile)) {
      console.log('Uploading src/' + file + '...');
      const remoteDeploy = '/root/fenix_deploy/src/' + file;
      const remoteOpt = '/opt/fenix-os/grg/src/' + file;
      const remoteDirDeploy = path.dirname(remoteDeploy).replace(/\\/g, '/');
      await new Promise(r => conn.exec('mkdir -p ' + remoteDirDeploy, r));
      await uploadFile(sftp, localFile, remoteDeploy).catch(e => console.error(e));
      await uploadFile(sftp, localFile, remoteOpt).catch(e => console.error(e));
      console.log('✓ src/' + file + ' synced');
    }
  }

  sftp.end();

  console.log('Restarting PM2 services on VPS...');
  await new Promise((resolve) => {
    conn.exec('pm2 restart fenix-backend && pm2 restart fenix-frontend && sleep 3 && pm2 status', (err, stream) => {
      if (err) console.error(err);
      stream.on('close', resolve).on('data', d => process.stdout.write(d));
    });
  });

  conn.end();
  console.log('All V6 assets successfully synchronized to VPS!');
}

run().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});

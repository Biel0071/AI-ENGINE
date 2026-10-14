const { Client } = require('ssh2');
const fs = require('fs');

const SSH_CONFIG = {
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  privateKey: fs.existsSync('C:/Users/Dell/.ssh/grg_fenix_vps') ? fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps') : undefined,
  readyTimeout: 20000
};

async function pullFile(sftp, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, localPath, (err) => {
      if (err) return reject(err);
      console.log(`Pulled ${remotePath} -> ${localPath}`);
      resolve();
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  const files = [
    { remote: '/opt/fenix-os/FENIX_FRONTEND_BROWSER_CERTIFICATION.md', local: 'FENIX_FRONTEND_BROWSER_CERTIFICATION.md' },
    { remote: '/opt/fenix-os/FENIX_EVOLUTION_METRICS.md', local: 'FENIX_EVOLUTION_METRICS.md' }
  ];

  for (const f of files) {
    try {
      await pullFile(sftp, f.remote, f.local);
    } catch(e) {
      console.error(`Failed to pull ${f.remote}:`, e.message);
    }
  }

  conn.end();
  console.log('Done pulling files.');
}

main().catch(console.error);

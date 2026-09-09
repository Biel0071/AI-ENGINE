const { Client } = require('ssh2');
const fs = require('fs');

const SSH_CONFIG = {
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  privateKey: fs.existsSync('C:/Users/Dell/.ssh/grg_fenix_vps') ? fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps') : undefined,
  password: process.env.VPS_SSH_PASSWORD || undefined,
  readyTimeout: 20000
};

async function main() {
  const localFile = process.argv[2];
  const remoteFile = process.argv[3] || '/tmp/vps-exec-temp.js';
  if (!localFile || !fs.existsSync(localFile)) {
    console.error('Usage: node run-vps-script.js <localFile> [remoteFile]');
    process.exit(1);
  }

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });

  // SFTP upload
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  const content = fs.readFileSync(localFile);
  await new Promise((resolve, reject) => {
    const ws = sftp.createWriteStream(remoteFile);
    ws.on('close', resolve);
    ws.on('error', reject);
    ws.end(content);
  });

  // Execute
  await new Promise((resolve, reject) => {
    conn.exec(`node ${remoteFile}`, (err, stream) => {
      if (err) return reject(err);
      stream.on('close', (code) => {
        conn.end();
        process.exit(code || 0);
      });
      stream.on('data', d => process.stdout.write(d));
      stream.stderr.on('data', d => process.stderr.write(d));
    });
  });
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});

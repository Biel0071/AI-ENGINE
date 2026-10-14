const { Client } = require('ssh2');
const fs = require('fs');

async function main() {
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({
      host: '209.50.241.22',
      port: 22,
      username: 'root',
      privateKey: fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps'),
      readyTimeout: 15000,
    });
  });

  console.log('SSH Connection ready, starting SFTP uploads...');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  function uploadFile(local, remote) {
    return new Promise((resolve, reject) => {
      const rs = fs.createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      ws.on('close', resolve).on('error', reject);
      rs.pipe(ws);
    });
  }

  await uploadFile('c:/Users/Dell/Documents/API GRATIS/dist-api.tar.gz', '/tmp/dist-api.tar.gz');
  console.log('dist-api.tar.gz uploaded');
  await uploadFile('c:/Users/Dell/Documents/API GRATIS/dist-shared.tar.gz', '/tmp/dist-shared.tar.gz');
  console.log('dist-shared.tar.gz uploaded');

  const cmd = `
    mkdir -p /tmp/api-dist /tmp/shared-dist && \
    tar -xzf /tmp/dist-api.tar.gz -C /tmp/api-dist && \
    tar -xzf /tmp/dist-shared.tar.gz -C /tmp/shared-dist && \
    docker cp /tmp/shared-dist/. api-platform-api-1:/app/packages/shared/dist/ && \
    docker cp /tmp/shared-dist/. api-platform-api-1:/app/node_modules/@api-platform/shared/dist/ && \
    docker cp /tmp/api-dist/. api-platform-api-1:/app/apps/api/dist/ && \
    docker restart api-platform-api-1
  `;

  console.log('Executing extraction and copy into container...');
  await new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on('close', (code) => {
        console.log(`Command finished with code ${code}`);
        conn.end();
        resolve();
      }).on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d));
    });
  });
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

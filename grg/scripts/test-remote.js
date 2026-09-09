const { Client } = require('ssh2');
const fs = require('fs');

function run(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', d => out += d);
        stream.stderr.on('data', d => out += d);
        stream.on('close', code => {
          conn.end();
          resolve({ code, out });
        });
      });
    }).on('error', reject).connect({
      host: '209.50.241.22',
      port: 22,
      username: 'root',
      privateKey: fs.existsSync('C:/Users/Dell/.ssh/grg_fenix_vps') ? fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps') : undefined,
      password: process.env.VPS_SSH_PASSWORD || undefined
    });
  });
}

async function main() {
  const cmd = `docker exec api-platform-api-1 node -e "const { registry } = require('./dist/services/ai.service.js'); Promise.resolve(registry.resolve('chat', 'ollama')).then(p => { console.log('RESOLVED OLLAMA:', p ? p.name : 'NULL'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"`;
  console.log('Testing registry.resolve...');
  const res = await run(cmd);
  console.log('Result:', res.out);
}

main().catch(console.error);

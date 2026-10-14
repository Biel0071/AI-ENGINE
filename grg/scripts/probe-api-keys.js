const { Client } = require('ssh2');
const fs = require('fs');

function runRemote(code) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      const b64 = Buffer.from(code).toString('base64');
      const cmd = `node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '', stderr = '';
        stream.on('data', d => stdout += d);
        stream.stderr.on('data', d => stderr += d);
        stream.on('close', code => {
          conn.end();
          resolve({ code, stdout, stderr });
        });
      });
    }).on('error', reject).connect({
      host: '209.50.241.22',
      port: 22,
      username: 'root',
      privateKey: fs.existsSync('C:/Users/Dell/.ssh/grg_fenix_vps') ? fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps') : undefined,
      password: process.env.VPS_SSH_PASSWORD || undefined,
      readyTimeout: 15000
    });
  });
}

async function main() {
  const code = `
    const { execSync } = require('child_process');
    try {
      const out = execSync("docker exec api-platform-postgres-1 psql -U apiplatform -d apiplatform -c 'SELECT id, name, prefix, active, scopes FROM \\\"ApiKey\\\";'", { encoding: 'utf8' });
      console.log('APIKEYS IN DB:\\n' + out);
    } catch(e) {
      console.error('ERROR:', e.message);
    }
  `;
  const res = await runRemote(code);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);

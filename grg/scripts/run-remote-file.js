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

function run(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        stream.end();
        let out = '';
        let errOut = '';
        stream.on('data', d => {
          out += d;
          process.stdout.write(d);
        });
        stream.stderr.on('data', d => {
          errOut += d;
          process.stderr.write(d);
        });
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, out, errOut });
        });
        stream.on('end', () => {
          conn.end();
          resolve({ code: 0, out, errOut });
        });
      });
    }).on('error', reject).connect(SSH_CONFIG);
  });
}

async function main() {
  const fileArg = process.argv[2];
  let cmd = '';
  if (fileArg && fs.existsSync(fileArg)) {
    const scriptContent = fs.readFileSync(fileArg, 'utf8');
    const b64 = Buffer.from(scriptContent).toString('base64');
    cmd = `echo '${b64}' | base64 -d | bash`;
  } else {
    cmd = process.argv.slice(2).join(' ');
  }
  const res = await run(cmd);
  if (res.out) console.log(res.out);
  if (res.errOut) console.error(res.errOut);
  process.exit(res.code);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const nodeCheck = `
    const http = require('http');
    function check(path) {
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:3000' + path, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', e => resolve({ error: e.message }));
      });
    }
    async function run() {
      console.log('/health:', JSON.stringify(await check('/health')));
      console.log('/ready:', JSON.stringify(await check('/ready')));
    }
    run();
  `;
  const b64 = Buffer.from(nodeCheck).toString('base64');
  const cmd = `docker exec api-platform-api-1 node -e "$(echo '${b64}' | base64 -d)"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('\nExit code:', code);
      conn.end();
    }).on('data', (d) => process.stdout.write(d))
      .stderr.on('data', (d) => process.stderr.write(d));
  });
}).on('error', console.error).connect({
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps'),
  readyTimeout: 15000,
});

const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const nodeOllamaTest = `
    const http = require('http');
    function post(host, port, path, body) {
      return new Promise((resolve) => {
        const payload = JSON.stringify(body);
        const req = http.request({
          hostname: host,
          port,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 45000
        }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', e => resolve({ error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
        req.write(payload);
        req.end();
      });
    }

    function get(host, port, path) {
      return new Promise((resolve) => {
        const req = http.get({ hostname: host, port, path, timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', e => resolve({ error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
      });
    }

    async function run() {
      const host = 'host.docker.internal';
      console.log('Testing GET tags on', host);
      const tags = await get(host, 11434, '/api/tags');
      console.log('TAGS RESULT:', JSON.stringify(tags));

      console.log('Testing POST generate with qwen2.5:0.5b on', host);
      const start = Date.now();
      const gen = await post(host, 11434, '/api/generate', {
        model: 'qwen2.5:0.5b',
        prompt: 'Responda exatamente FENIX_OLLAMA_OK',
        stream: false
      });
      console.log('GENERATE DURATION (ms):', Date.now() - start);
      console.log('GENERATE RESULT:', JSON.stringify(gen));
    }
    run();
  `;
  const b64 = Buffer.from(nodeOllamaTest).toString('base64');
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

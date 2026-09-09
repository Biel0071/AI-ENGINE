const { Client } = require('ssh2');

function runRemoteNode(code) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      const b64 = Buffer.from(code).toString('base64');
      const cmd = `node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
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

async function test() {
  console.log('Testing Qwen on VPS with optimized parameters...');
  const remoteCode = `
    const http = require('http');
    
    async function testDirectOllama() {
      return new Promise((resolve) => {
        const payload = JSON.stringify({
          model: 'qwen2.5:3b',
          prompt: 'ping',
          stream: false,
          options: {
            num_predict: 8,
            num_ctx: 512,
            num_thread: 2
          }
        });
        const req = http.request({
          host: '172.20.0.7',
          port: 11434,
          path: '/api/generate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 120000
        }, (res) => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve({ ok: true, status: res.statusCode, response: json.response, prompt_eval_count: json.prompt_eval_count, eval_count: json.eval_count, total_duration: json.total_duration });
            } catch(e) {
              resolve({ ok: false, status: res.statusCode, data });
            }
          });
        });
        req.on('error', err => resolve({ ok: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'TIMEOUT' }); });
        req.write(payload);
        req.end();
      });
    }

    (async () => {
      const t0 = Date.now();
      const direct = await testDirectOllama();
      const directMs = Date.now() - t0;
      console.log(JSON.stringify({ direct, directMs }));
    })();
  `;

  const res = await runRemoteNode(remoteCode);
  console.log('EXIT:', res.code);
  console.log('STDOUT:\n', res.stdout);
  if (res.stderr) console.error('STDERR:\n', res.stderr);
}

test().catch(console.error);

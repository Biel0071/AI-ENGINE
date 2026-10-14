const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const testScript = `
    const http = require('http');
    const { registry } = require('/app/apps/api/dist/services/ai.service');

    async function test4A() {
      console.log('=== TESTE 4A: PROVIDER COM TIMEOUT HARD 20s ===');
      const provider = registry.get('ollama');
      if (!provider) {
        console.log('PROVIDER_FAILED: Provider ollama not found in registry');
        return { status: 'PROVIDER_FAILED', error: 'NOT_FOUND' };
      }

      console.log('Provider selected: ollama, baseUrl:', provider.config?.baseUrl);
      const start = Date.now();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_20S')), 20000)
      );

      try {
        const callPromise = provider.chat({
          model: 'qwen2.5:0.5b',
          messages: [{ role: 'user', content: 'Responda exatamente FENIX_PROVIDER_OK' }],
          temperature: 0.1,
          maxTokens: 6
        });

        const res = await Promise.race([callPromise, timeoutPromise]);
        const duration = Date.now() - start;
        console.log('PROVIDER_OK in', duration, 'ms');
        console.log('OUTPUT:', JSON.stringify(res.result?.message?.content));
        return { status: 'PROVIDER_OK', duration, content: res.result?.message?.content };
      } catch (err) {
        const duration = Date.now() - start;
        if (err.message === 'TIMEOUT_20S') {
          console.log('PROVIDER_TIMEOUT after', duration, 'ms');
          return { status: 'PROVIDER_TIMEOUT', duration };
        }
        console.log('PROVIDER_FAILED after', duration, 'ms:', err.message);
        return { status: 'PROVIDER_FAILED', duration, error: err.message, stack: err.stack };
      }
    }

    async function test4B() {
      console.log('=== TESTE 4B: OLLAMA DIRETO 20s ===');
      const start = Date.now();
      const payload = JSON.stringify({
        model: 'qwen2.5:0.5b',
        messages: [{ role: 'user', content: 'Responda exatamente FENIX_PROVIDER_OK' }],
        options: { temperature: 0.1, num_predict: 6 },
        stream: false
      });

      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'host.docker.internal',
          port: 11434,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 20000
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            const duration = Date.now() - start;
            try {
              const parsed = JSON.parse(body);
              console.log('OLLAMA_OK in', duration, 'ms, response:', JSON.stringify(parsed.message?.content));
              resolve({ status: 'OLLAMA_OK', duration, content: parsed.message?.content });
            } catch (e) {
              console.log('OLLAMA_FAILED (parse) in', duration, 'ms');
              resolve({ status: 'OLLAMA_FAILED', duration, body });
            }
          });
        });

        req.on('error', (e) => {
          console.log('OLLAMA_FAILED in', Date.now() - start, 'ms:', e.message);
          resolve({ status: 'OLLAMA_FAILED', duration: Date.now() - start, error: e.message });
        });

        req.on('timeout', () => {
          req.destroy();
          console.log('OLLAMA_TIMEOUT in 20000 ms');
          resolve({ status: 'OLLAMA_TIMEOUT', duration: 20000 });
        });

        req.write(payload);
        req.end();
      });
    }

    async function main() {
      const resA = await test4A();
      const resB = await test4B();
      console.log('=== TESTE 4C: COMPARACAO ===');
      console.log('PROVIDER:', resA.status, resA.duration, 'ms');
      console.log('OLLAMA:  ', resB.status, resB.duration, 'ms');
      process.exit(0);
    }

    main();
  `;
  const b64 = Buffer.from(testScript).toString('base64');
  const cmd = `docker exec api-platform-api-1 node -e "$(echo '${b64}' | base64 -d)"`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
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

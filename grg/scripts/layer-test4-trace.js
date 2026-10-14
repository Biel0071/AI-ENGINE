const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const traceScript = `
    const { registry } = require('/app/apps/api/dist/services/ai.service');

    async function run() {
      const provider = registry.get('ollama');
      console.log('Provider config:', JSON.stringify(provider.config));
      
      const t0 = Date.now();
      console.log('[T0] Iniciando chat call...');

      try {
        const res = await provider.chat({
          model: 'qwen2.5:0.5b',
          messages: [{ role: 'user', content: 'Responda exatamente FENIX_PROVIDER_OK' }],
          temperature: 0.1,
          maxTokens: 6
        });
        const t1 = Date.now();
        console.log('[T1] chat call finalizada em', (t1 - t0), 'ms');
        console.log('Output:', JSON.stringify(res.result?.message?.content));
      } catch (err) {
        console.error('ERROR:', err);
      }
    }

    run();
  `;
  const b64 = Buffer.from(traceScript).toString('base64');
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

const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const nodeProviderTest = `
    const { registry } = require('/app/apps/api/dist/services/ai.service');
    async function run() {
      try {
        const provider = registry.get('ollama');
        console.log('Provider found:', Boolean(provider), 'baseUrl:', provider?.config?.baseUrl);
        const start = Date.now();
        const res = await provider.chat({
          model: 'qwen2.5:0.5b',
          messages: [{ role: 'user', content: 'Responda exatamente: FENIX_PROVIDER_OK' }],
          temperature: 0.1,
          maxTokens: 20
        });
        console.log('PROVIDER DURATION (ms):', Date.now() - start);
        console.log('PROVIDER RESULT:', JSON.stringify(res));
      } catch (err) {
        console.error('PROVIDER ERROR:', err);
      }
    }
    run();
  `;
  const b64 = Buffer.from(nodeProviderTest).toString('base64');
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

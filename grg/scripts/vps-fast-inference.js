const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const payload = JSON.stringify({
    model: 'qwen2.5:0.5b',
    messages: [
      { role: 'system', content: 'Você é o assistente Fênix.' },
      { role: 'user', content: 'Responda somente: FENIX_INFERENCE_READY' }
    ]
  });
  const cmd = `curl -s -X POST http://209.50.241.22:3001/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ap_199924c0bf797f7885b06cc2f0be743ef145a7e3be1733bd" \
    -d '${payload}'`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log('\nCurl exited with code:', code);
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

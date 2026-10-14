const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    time curl -s http://127.0.0.1:11434/api/generate -d '{"model":"qwen2.5:0.5b","prompt":"Responda somente: FENIX_OLLAMA_OK","stream":false}'
  `;
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

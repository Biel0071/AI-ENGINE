const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== DOCKER PS ==="
    docker ps -a --filter "name=api-platform-api-1" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo "=== RESTART COUNT ==="
    docker inspect api-platform-api-1 --format 'RestartCount: {{.RestartCount}}, OOMKilled: {{.State.OOMKilled}}, Status: {{.State.Status}}'
    echo "=== PROCESS INSIDE CONTAINER ==="
    docker top api-platform-api-1
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

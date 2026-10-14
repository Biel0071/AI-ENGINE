const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    echo "=== CPU & LOAD ==="
    uptime
    nproc
    echo "=== VMSTAT (check steal time 'st') ==="
    vmstat 1 3
    echo "=== TOP CPU PROCESSES ==="
    ps -eo pid,ppid,%cpu,%mem,cmd --sort=-%cpu | head -n 10
  `;
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

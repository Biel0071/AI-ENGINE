const { Client } = require('ssh2');

function runRemote(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code, signal) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (data) => {
          stdout += data;
        }).stderr.on('data', (data) => {
          stderr += data;
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: '209.50.241.22',
      port: 22,
      username: 'root',
      password: 'S53yi4RYq8j4DCGp',
      readyTimeout: 15000
    });
  });
}

const cmd = process.argv.slice(2).join(' ') || 'uptime; docker ps; pm2 list';
console.log(`Executing on VPS: ${cmd}`);
runRemote(cmd).then(res => {
  console.log('EXIT CODE:', res.code);
  if (res.stdout) console.log('STDOUT:\n' + res.stdout);
  if (res.stderr) console.log('STDERR:\n' + res.stderr);
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

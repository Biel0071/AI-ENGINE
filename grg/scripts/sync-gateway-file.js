const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const localPath = 'c:/Users/Dell/Documents/API GRATIS/apps/api/dist/services/execution-gateway.service.js';
const remotePath = '/tmp/execution-gateway.service.js';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connection ready, starting SFTP...');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const readStream = fs.createReadStream(localPath);
    const writeStream = sftp.createWriteStream(remotePath);

    writeStream.on('close', () => {
      console.log('SFTP Upload complete. Executing docker cp and restart...');
      const cmd = `docker cp /tmp/execution-gateway.service.js api-platform-api-1:/app/apps/api/dist/services/execution-gateway.service.js && docker restart api-platform-api-1`;
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
          console.log(`Docker cp and restart finished with code ${code}`);
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });

    readStream.pipe(writeStream);
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('C:/Users/Dell/.ssh/grg_fenix_vps'),
  readyTimeout: 15000,
});

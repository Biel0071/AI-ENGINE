import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const base = 'http://209.50.241.22:3000';
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login sem sessão');
const connection = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-X', 'POST', '-H', `authorization: Bearer ${session.token}`, `${base}/api/fenix/projects/api-platform-live/git/connection`], { encoding: 'utf8', timeout: 35000 }));
console.log(JSON.stringify({ supported: connection.supported, connected: connection.connected, repository: connection.repository, fingerprint: connection.publicKey ? crypto.createHash('sha256').update(connection.publicKey).digest('hex').slice(0, 16) : null }));

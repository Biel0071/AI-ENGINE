import { execFileSync } from 'node:child_process';

const host = 'http://209.50.241.22:3000';
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${host}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login sem sessão');
function probe(path, input) {
  const args = ['-sS', '--max-time', '70', '-H', `authorization: Bearer ${session.token}`, '-H', 'content-type: application/json', '-w', '\nHTTP:%{http_code} TIME:%{time_total}'];
  if (input) args.push('--data-binary', '@-');
  args.push(`${host}${path}`);
  const output = execFileSync('curl.exe', args, { input: input ? JSON.stringify(input) : undefined, encoding: 'utf8', timeout: 75000 });
  const match = output.match(/\nHTTP:(\d+) TIME:([\d.]+)$/);
  const body = output.slice(0, match?.index || 0);
  let data; try { data = JSON.parse(body); } catch { data = { malformed: true }; }
  return { http: Number(match?.[1]), seconds: Number(match?.[2]), ok: Boolean(data.ok), status: data.status || null, error: data.error || null, model: data.data?.model || null, responsePresent: Boolean(data.data?.choices?.[0]?.message?.content) };
}
console.log(JSON.stringify({ health: probe('/api/v2/api-platform/health'), chat: probe('/api/v2/api-platform/test-chat', { message: 'Responda apenas: Fenix API OK' }) }));

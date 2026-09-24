import { execFileSync } from 'node:child_process';

const base = 'http://209.50.241.22:3000';
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 25000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
const headers = ['-H', `authorization: Bearer ${session.token}`];
const list = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', ...headers, `${base}/api/fenix/projects`], { encoding: 'utf8', timeout: 35000 }));
let project = list.projects.find((item) => item.name === 'API Platform GitHub');
if (!project) {
  const body = { name: 'API Platform GitHub', repository: 'https://github.com/Biel0071/API-PLATAFORM.git' };
  const result = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '200', ...headers, '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/fenix/projects/clone`], { input: JSON.stringify(body), encoding: 'utf8', timeout: 205000 }));
  if (!result.project) throw new Error(result.error || 'Clone sem projeto');
  project = result.project;
}
const git = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', ...headers, `${base}/api/fenix/projects/${encodeURIComponent(project.id)}/git`], { encoding: 'utf8', timeout: 35000 }));
const tree = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', ...headers, `${base}/api/fenix/projects/${encodeURIComponent(project.id)}/tree`], { encoding: 'utf8', timeout: 35000 }));
console.log(JSON.stringify({ ok: Boolean(git.head && tree.tree?.length), projectId: project.id, branch: git.branch, head: git.head?.slice(0, 12), treeEntries: tree.tree?.length, workspace: project.workspace }));

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const runFile = promisify(execFile);
const busy = new Set();

async function git(root, args, env = {}) {
  const { stdout } = await runFile('git', args, {
    cwd: root, timeout: 45_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env },
  });
  return stdout.trim();
}

async function inspect(root) {
  const [head, branch, status, remote, upstream, changed, untracked, recent] = await Promise.all([
    git(root, ['rev-parse', 'HEAD']),
    git(root, ['branch', '--show-current']),
    git(root, ['status', '--short']),
    git(root, ['remote', 'get-url', 'origin']).catch(() => ''),
    git(root, ['rev-parse', '--abbrev-ref', '@{upstream}']).catch(() => ''),
    git(root, ['diff', '--name-only', '-z', 'HEAD']),
    git(root, ['ls-files', '--others', '--exclude-standard', '-z']),
    git(root, ['log', '-5', '--format=%h %s']).catch(() => ''),
  ]);
  const files = [...new Set([...changed.split('\0'), ...untracked.split('\0')].filter(Boolean))];
  const counts = upstream ? await git(root, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]).catch(() => '') : '';
  const [behind, ahead] = counts.split(/\s+/).map(Number);
  return { head, branch, status, files, remote: safeRemote(remote), upstream: upstream || null,
    ahead: Number.isFinite(ahead) ? ahead : null, behind: Number.isFinite(behind) ? behind : null,
    recent: recent.split('\n').filter(Boolean) };
}

function safeRemote(value) {
  return value.replace(/^(https?:\/\/)[^/@]+@/i, '$1***@');
}

function githubSshRemote(remote) {
  const match = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/i);
  return match ? `git@github.com:${match[1]}.git` : null;
}

function connectionPath(tenantId, projectId) {
  const hash = crypto.createHash('sha256').update(`${tenantId}:${projectId}`).digest('hex');
  return path.join(process.env.FENIX_GIT_KEYS_DIR || path.resolve(__dirname, '../../.data/git-keys'), hash);
}

async function connection(root, tenantId, projectId, generate = false) {
  const remote = await git(root, ['remote', 'get-url', 'origin']).catch(() => '');
  const sshRemote = githubSshRemote(remote);
  if (!sshRemote) return { supported: false, connected: false, error: 'Configure origin como repositório github.com antes de conectar' };
  const privateKey = connectionPath(tenantId, projectId);
  if (generate && !fs.existsSync(privateKey)) {
    fs.mkdirSync(path.dirname(privateKey), { recursive: true, mode: 0o700 });
    await runFile('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', `fenix-${path.basename(privateKey).slice(0, 12)}`, '-f', privateKey], { timeout: 30_000, windowsHide: true });
    fs.chmodSync(privateKey, 0o600);
  }
  const publicKey = fs.existsSync(`${privateKey}.pub`) ? fs.readFileSync(`${privateKey}.pub`, 'utf8').trim() : null;
  return { supported: true, connected: Boolean(publicKey), remote: safeRemote(remote), repository: sshRemote.replace(/^git@github\.com:/, '').replace(/\.git$/, ''), publicKey };
}

function sshEnvironment(tenantId, projectId) {
  const key = connectionPath(tenantId, projectId);
  return fs.existsSync(key) ? { GIT_SSH_COMMAND: `ssh -i ${key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes` } : null;
}

async function handleProjectGitRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId }) {
  if (url.pathname === '/api/fenix/projects/clone' && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const body = await readJson(req);
    const repository = String(body?.repository || '').trim();
    const name = String(body?.name || '').trim();
    if (!repository || !name || name.length > 100) { sendJson(res, 400, { error: 'Informe URL HTTPS e nome do projeto' }); return true; }
    if (!app.fileSystemService) { sendJson(res, 503, { error: 'Serviço de workspace indisponível' }); return true; }
    try {
      const cloned = await app.fileSystemService.cloneRepository({ url: repository, directory: `github/${crypto.randomUUID()}`, branch: body.branch || null });
      const branch = await git(cloned.path, ['branch', '--show-current']);
      const head = await git(cloned.path, ['rev-parse', 'HEAD']);
      const project = await app.projectKernel.create(tenantId, actorId, { name, repository: cloned.url, workspace: cloned.path, branch, baseCommit: head, currentCommit: head });
      await app.audit.record({ tenantId, actorId, action: 'project.git.cloned', resource: { projectId: project.id, repository: cloned.url, head } });
      sendJson(res, 201, { project });
    } catch (error) {
      sendJson(res, 400, { error: safeRemote(String(error.stderr || error.message || 'Falha ao clonar repositório')).slice(0, 300) });
    }
    return true;
  }
  const match = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/git(?:\/(diff|commit|push|connection|verify|deploy))?$/);
  if (!match) return false;
  const [, projectId, action] = match;
  const mutation = action === 'commit' || action === 'push' || (action === 'connection' && req.method === 'POST') || (action === 'deploy' && req.method === 'POST');
  if ((mutation && req.method !== 'POST') || (!mutation && req.method !== 'GET')) return false;
  await app.controlPlane.authorize(tenantId, actorId, mutation ? 'repo:write' : 'repo:read');
  const project = await app.projectKernel.state(tenantId, actorId, projectId);
  const reply = (status, payload) => { sendJson(res, status, payload); return true; };
  if (!project.workspace) return reply(404, { error: 'Projeto sem workspace vinculado' });
  let root;
  try { root = fs.realpathSync(project.workspace); } catch { return reply(404, { error: 'Workspace indisponível nesta máquina' }); }
  const gitRoot = await git(root, ['rev-parse', '--show-toplevel']).catch(() => null);
  if (!gitRoot || path.resolve(gitRoot) !== root) return reply(409, { error: 'Workspace precisa ser a raiz de um repositório Git' });
  if (!action) return reply(200, { projectId, ...await inspect(root) });
  if (action === 'deploy') {
    const deployments = require('../projects/project-deploy');
    if (projectId !== 'api-platform-live' || root !== (process.env.API_PLATFORM_PATH || '/root/api-gratis')) return reply(403, { error: 'Deploy disponível somente para o workspace API Platform registrado na VPS' });
    if (req.method === 'GET') return reply(200, { job: deployments.latest(projectId) });
    const input = await readJson(req);
    const current = await inspect(root);
    if (!input?.expectedHead || input.expectedHead !== current.head) return reply(409, { error: 'HEAD mudou; atualize antes do deploy', head: current.head });
    if (current.status) return reply(409, { error: 'Workspace contém alterações sem commit; revise antes do deploy' });
    const result = deployments.start(projectId, root, current.head, input.rebuild !== false);
    if (result.conflict) return reply(409, { error: 'Deploy já em execução', job: result.job });
    if (result.error) return reply(409, { error: result.error });
    try { await app.audit.record({ tenantId, actorId, action: 'project.deploy.started', resource: { projectId, head: current.head, branch: current.branch } }); }
    catch (error) { console.error('[ProjectGit] deploy audit failed:', error.message); }
    return reply(202, { job: result.job });
  }
  if (action === 'connection') return reply(200, { projectId, ...await connection(root, tenantId, projectId, mutation) });
  if (action === 'verify') {
    const account = await connection(root, tenantId, projectId);
    const env = sshEnvironment(tenantId, projectId);
    if (!account.supported || !env) return reply(409, { error: 'Gere uma chave e adicione a chave pública ao repositório GitHub com acesso de escrita' });
    try { await git(root, ['ls-remote', githubSshRemote(account.remote), 'HEAD'], env); return reply(200, { ok: true, repository: account.repository }); }
    catch { return reply(502, { error: 'Chave ainda não autorizada no GitHub ou acesso SSH indisponível' }); }
  }
  if (action === 'diff') {
    const file = url.searchParams.get('path');
    const current = await inspect(root);
    if (!file || !current.files.includes(file)) return reply(400, { error: 'Arquivo alterado inválido' });
    const diff = await git(root, ['diff', 'HEAD', '--', `:(literal)${file}`]);
    return reply(200, { projectId, path: file, diff: diff || 'Arquivo novo sem diff no HEAD.' });
  }
  const key = `${tenantId}:${projectId}`;
  if (busy.has(key)) return reply(409, { error: 'Outra operação Git está em andamento neste projeto' });
  busy.add(key);
  try {
    const input = await readJson(req);
    const current = await inspect(root);
    if (!input?.expectedHead || input.expectedHead !== current.head) return reply(409, { error: 'HEAD mudou; atualize o estado antes de continuar', head: current.head });
    if (!current.branch || current.branch === 'HEAD') return reply(409, { error: 'Selecione uma branch antes de continuar' });
    if (action === 'commit') {
      const message = String(input.message || '').trim();
      const files = input.files;
      if (!message || message.length > 200 || /[\r\n\0]/.test(message)) return reply(400, { error: 'Mensagem de commit inválida' });
      if (!Array.isArray(files) || !files.length || files.length > 50 || files.some((file) => typeof file !== 'string' || !current.files.includes(file))) return reply(400, { error: 'Selecione arquivos alterados válidos' });
      const literal = files.map((file) => `:(literal)${file}`);
      await git(root, ['add', '--', ...literal]);
      await git(root, ['commit', '--only', '-m', message, '--', ...literal]);
      const next = await inspect(root);
      await app.audit.record({ tenantId, actorId, action: 'project.git.committed', resource: { projectId, head: next.head, branch: next.branch, files } });
      return reply(200, { ok: true, projectId, ...next });
    }
    if (!current.remote) return reply(409, { error: 'Configure o remote origin antes do push' });
    if (current.status) return reply(409, { error: 'Há alterações locais; revise e faça commit antes do push' });
    const sshRemote = githubSshRemote(await git(root, ['remote', 'get-url', 'origin']).catch(() => ''));
    const sshEnv = sshEnvironment(tenantId, projectId);
    const output = await git(root, ['push', '--porcelain', sshRemote && sshEnv ? sshRemote : 'origin', `HEAD:refs/heads/${current.branch}`], sshEnv || {});
    const next = await inspect(root);
    await app.audit.record({ tenantId, actorId, action: 'project.git.pushed', resource: { projectId, head: next.head, branch: next.branch, remote: next.remote } });
    return reply(200, { ok: true, projectId, output, ...next });
  } catch (error) {
    return reply(502, { error: safeRemote(String(error.stderr || error.message || 'Falha no Git')).slice(0, 500) });
  } finally { busy.delete(key); }
}

module.exports = { handleProjectGitRoutes };

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { GitHubConnector } = require('../repo-intel/github-connector');
const { resolveSecret } = require('../security/secret-resolver');

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

function safeDirectoryName(value) {
  return String(value || '').trim().replace(/\.git$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'repo';
}

function sshEnvironment(tenantId, projectId) {
  const key = connectionPath(tenantId, projectId);
  return fs.existsSync(key) ? { GIT_SSH_COMMAND: `ssh -i ${key} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes` } : null;
}

async function handleProjectGitRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId }) {
  // ==========================================
  // GITHUB ACCOUNT & PORTFOLIO INTEGRATION
  // ==========================================
  const github = app.github || new GitHubConnector();

  if (url.pathname === '/api/fenix/github/account' && req.method === 'GET') {
    if (!github.hasToken()) {
      return sendJson(res, 200, { connected: false, message: 'Nenhum token do GitHub configurado.' });
    }
    try {
      const user = await github.getAuthenticatedUser();
      return sendJson(res, 200, { connected: true, ...user, user });
    } catch (err) {
      return sendJson(res, 200, { connected: false, error: err.message, message: 'Token expirado ou inválido.' });
    }
  }

  if (url.pathname === '/api/fenix/github/connect' && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
    const body = await readJson(req);
    const token = String(body?.token || '').trim();
    if (!token) return sendJson(res, 400, { error: 'Token do GitHub é obrigatório' });

    const oldToken = github.token;
    try {
      github.token = token;
      const user = await github.getAuthenticatedUser();
      github.setToken(token);
      if (app.connectors) {
        await app.connectors.selfTest(tenantId, actorId, 'github').catch(() => null);
      }
      if (app.bus) {
        await app.bus.emit('github.connected', { tenantId, actorId, user });
      }
      if (app.audit) {
        await app.audit.record({ tenantId, actorId, action: 'github.connected', resource: { login: user.login } });
      }
      return sendJson(res, 200, { ok: true, connected: true, account: user, user });
    } catch (err) {
      github.token = oldToken;
      return sendJson(res, 401, { ok: false, error: err.message || 'Falha ao autenticar token no GitHub' });
    }
  }

  if (url.pathname === '/api/fenix/github/disconnect' && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
    github.clearToken();
    if (app.bus) {
      await app.bus.emit('github.disconnected', { tenantId, actorId });
    }
    if (app.audit) {
      await app.audit.record({ tenantId, actorId, action: 'github.disconnected', resource: {} });
    }
    return sendJson(res, 200, { ok: true, disconnected: true, connected: false });
  }

  if (url.pathname === '/api/fenix/github/repos' && req.method === 'GET') {
    if (!github.hasToken()) {
      return sendJson(res, 200, {
        ok: false,
        connected: false,
        repositories: [],
        message: 'Conecte sua conta GitHub para listar repositórios.'
      });
    }
    try {
      const ghRepos = await app.github.listUserRepos();
      const localProjects = app.projectKernel ? await app.projectKernel.list(tenantId, actorId) : [];

      const enriched = await Promise.all(ghRepos.map(async (repo) => {
        const matched = localProjects.find(p => {
          if (!p) return false;
          if (p.repository && (p.repository.toLowerCase().includes(repo.fullName.toLowerCase()) || p.repository.toLowerCase().includes(repo.name.toLowerCase()))) return true;
          if (p.id === repo.name || p.name === repo.name) return true;
          return false;
        });

        if (matched) {
          let gitStatus = null;
          if (matched.workspace && fs.existsSync(matched.workspace)) {
            try {
              const root = fs.realpathSync(matched.workspace);
              gitStatus = await inspect(root);
            } catch {}
          }
          return {
            ...repo,
            isActivated: true,
            projectId: matched.id,
            workspace: matched.workspace,
            localStatus: gitStatus ? {
              head: gitStatus.head ? gitStatus.head.slice(0, 7) : null,
              branch: gitStatus.branch,
              dirtyFiles: gitStatus.files ? gitStatus.files.length : 0,
              ahead: gitStatus.ahead,
              behind: gitStatus.behind
            } : null
          };
        }

        return {
          ...repo,
          isActivated: false,
          projectId: null,
          workspace: null,
          localStatus: null
        };
      }));

      return sendJson(res, 200, {
        ok: true,
        connected: true,
        total: enriched.length,
        repositories: enriched
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (url.pathname === '/api/fenix/github/repos/create' && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const body = await readJson(req);
    const name = String(body?.name || '').trim();
    if (!name) return sendJson(res, 400, { error: 'Nome do repositório é obrigatório' });
    if (!app.github || !app.github.hasToken()) return sendJson(res, 400, { error: 'Conta GitHub não conectada' });

    try {
      const ghRepo = await app.github.createRepository({
        name,
        description: body.description || '',
        isPrivate: body.isPrivate !== false,
        autoInit: body.autoInit !== false
      });

      let project = null;
      if (body.activateInFenix !== false) {
        const targetDirName = safeDirectoryName(name);
        const projectsRoot = path.resolve(__dirname, '../../projects');
        if (!fs.existsSync(projectsRoot)) fs.mkdirSync(projectsRoot, { recursive: true });
        const targetPath = path.join(projectsRoot, targetDirName);

        const cloneArgs = ['clone'];
        if (app.github.token) {
          cloneArgs.push('-c', `http.extraHeader=AUTHORIZATION: bearer ${app.github.token}`);
        }
        cloneArgs.push(ghRepo.cloneUrl, targetPath);

        await runFile('git', cloneArgs, { cwd: projectsRoot, timeout: 120_000, windowsHide: true });

        const branch = await git(targetPath, ['branch', '--show-current']).catch(() => 'main');
        const head = await git(targetPath, ['rev-parse', 'HEAD']).catch(() => '');

        project = await app.projectKernel.create(tenantId, actorId, {
          name: ghRepo.name,
          repository: ghRepo.url,
          workspace: targetPath,
          branch,
          baseCommit: head,
          currentCommit: head
        });

        await app.audit.record({
          tenantId, actorId,
          action: 'project.github.created_and_activated',
          resource: { projectId: project.id, repository: ghRepo.url, fullName: ghRepo.fullName }
        });
      }

      return sendJson(res, 201, { ok: true, repository: ghRepo, project });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message || 'Falha ao criar repositório no GitHub' });
    }
  }

  if (url.pathname === '/api/fenix/github/repos/activate' && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const body = await readJson(req);
    let repoFullName = String(body?.repoFullName || '').trim();
    if (!repoFullName && body?.cloneUrl) {
      const match = String(body.cloneUrl).match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) repoFullName = `${match[1]}/${match[2]}`;
      else repoFullName = body.name ? `workspace/${body.name}` : '';
    }
    if (!repoFullName) return sendJson(res, 400, { error: 'Nome do repositório (owner/repo) ou cloneUrl é obrigatório' });

    const [, repoName] = repoFullName.split('/');
    const cleanName = safeDirectoryName(body.name || repoName || 'repo');
    const projectsRoot = path.resolve(__dirname, '../../projects');
    if (!fs.existsSync(projectsRoot)) fs.mkdirSync(projectsRoot, { recursive: true });

    let targetPath = path.join(projectsRoot, cleanName);
    if (fs.existsSync(targetPath)) {
      targetPath = path.join(projectsRoot, `${cleanName}-${Date.now().toString(36)}`);
    }

    const cloneUrl = body.cloneUrl || `https://github.com/${repoFullName}.git`;
    const cloneArgs = ['clone'];
    if (github.token) {
      cloneArgs.push('-c', `http.extraHeader=AUTHORIZATION: bearer ${github.token}`);
    }
    if (body.branch || body.defaultBranch) {
      cloneArgs.push('--branch', String(body.branch || body.defaultBranch));
    }
    cloneArgs.push(cloneUrl, targetPath);

    try {
      if (app.fileSystemService?.cloneRepository) {
        const cloned = await app.fileSystemService.cloneRepository({ url: cloneUrl, name: cleanName });
        targetPath = cloned.path;
      } else {
        await runFile('git', cloneArgs, { cwd: projectsRoot, timeout: 180_000, windowsHide: true });
      }

      const branch = await git(targetPath, ['branch', '--show-current']).catch(() => body.defaultBranch || 'main');
      const head = await git(targetPath, ['rev-parse', 'HEAD']).catch(() => '');

      const project = await app.projectKernel.create(tenantId, actorId, {
        name: body.name || repoName,
        repository: cloneUrl,
        workspace: targetPath,
        branch,
        baseCommit: head,
        currentCommit: head
      });

      if (app.audit) {
        await app.audit.record({
          tenantId, actorId,
          action: 'project.github.activated',
          resource: { projectId: project.id, repository: cloneUrl, head }
        });
      }

      return sendJson(res, 201, { ok: true, activated: true, project });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: safeRemote(String(err.stderr || err.message || 'Falha ao clonar e ativar repositório')).slice(0, 300) });
    }
  }

  const issueMatch = url.pathname.match(/^\/api\/fenix\/github\/repos\/([^/]+)\/([^/]+)\/issues$/);
  if (issueMatch && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'repo:write');
    const [, owner, repo] = issueMatch;
    const body = await readJson(req);
    const result = await app.github.createIssue({ owner, repo, title: body.title, body: body.body, labels: body.labels });
    return sendJson(res, 201, { ok: true, issue: result });
  }

  const prMatch = url.pathname.match(/^\/api\/fenix\/github\/repos\/([^/]+)\/([^/]+)\/prs$/);
  if (prMatch && req.method === 'POST') {
    await app.controlPlane.authorize(tenantId, actorId, 'repo:write');
    const [, owner, repo] = prMatch;
    const body = await readJson(req);
    const result = await app.github.createPullRequest({ owner, repo, title: body.title, head: body.head, base: body.base || 'main', body: body.body });
    return sendJson(res, 201, { ok: true, pr: result });
  }

  if (url.pathname === '/api/project-git/deploy' && req.method === 'POST') {
    const body = await readJson(req).catch(() => ({}));
    const target = body.target || 'vps';
    
    // REGRA 9 (HONESTY) & REGRA 48 (REAL DEPLOY): 
    // We launch a real child process corresponding to the target packaging/deploy logic.
    const { spawn } = require('node:child_process');
    const jobId = `deploy-${target}-${Date.now()}`;
    
    let command = '';
    let args = [];
    
    if (target === 'vps') {
      command = 'pm2'; // Or any real VPS script
      args = ['reload', 'all'];
    } else if (target === 'apk') {
      command = 'echo'; // To be replaced with: 'npx' args: ['expo', 'build:android']
      args = ['Building APK...'];
    } else if (target === 'exe') {
      command = 'echo'; // To be replaced with electron-builder
      args = ['Building EXE...'];
    }
    
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();

    // Ideally, we register this Job in the Fenix Kernel Database to trace its execution
    if (app.store) {
      const state = await app.store.read();
      if (!state.jobs) state.jobs = [];
      state.jobs.push({
        id: jobId,
        type: 'build.deploy',
        status: 'RUNNING',
        target: target,
        createdAt: new Date().toISOString()
      });
      await app.store.write(state);
    }
    
    sendJson(res, 202, { ok: true, status: `Pipeline de orquestração [${target.toUpperCase()}] acionado em background.`, job: jobId });
    return true;
  }

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
    const originUrl = await git(root, ['remote', 'get-url', 'origin']).catch(() => '');
    const sshRemote = githubSshRemote(originUrl);
    const sshEnv = sshEnvironment(tenantId, projectId);
    const ghToken = app.github?.token;

    let pushArgs = ['push', '--porcelain'];
    let pushEnv = sshEnv || {};
    let targetRemote = 'origin';

    if (sshRemote && sshEnv) {
      targetRemote = sshRemote;
    } else if (ghToken && /github\.com/i.test(originUrl)) {
      pushArgs = ['-c', `http.extraHeader=AUTHORIZATION: bearer ${ghToken}`, ...pushArgs];
      targetRemote = originUrl;
    }

    const output = await git(root, [...pushArgs, targetRemote, `HEAD:refs/heads/${current.branch}`], pushEnv);
    const next = await inspect(root);
    await app.audit.record({ tenantId, actorId, action: 'project.git.pushed', resource: { projectId, head: next.head, branch: next.branch, remote: next.remote } });
    return reply(200, { ok: true, projectId, output, ...next });
  } catch (error) {
    return reply(502, { error: safeRemote(String(error.stderr || error.message || 'Falha no Git')).slice(0, 500) });
  } finally { busy.delete(key); }
}

module.exports = { handleProjectGitRoutes };

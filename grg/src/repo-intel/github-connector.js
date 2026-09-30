// Conector real da API do GitHub para o Fênix OS.
// Suporta autenticação dinâmica via token ou SecretManager, leitura de perfil autenticado,
// listagem de repositórios (públicos e privados), criação de repositórios, branches,
// commits, pull requests e issues.
// Usa https nativo (sem dependências).
const https = require('node:https');
const { resolveSecret, storeSecret, deleteSecret } = require('../security/secret-resolver');

function apiRequest(path, { method = 'GET', body = null, token = null, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = {
      'User-Agent': 'Fenix-OS-Kernel/2.1.0',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...headers
    };
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request({ host: 'api.github.com', path, method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        const rateLimit = {
          remaining: res.headers['x-ratelimit-remaining'] ? Number(res.headers['x-ratelimit-remaining']) : null,
          limit: res.headers['x-ratelimit-limit'] ? Number(res.headers['x-ratelimit-limit']) : null,
          reset: res.headers['x-ratelimit-reset'] ? Number(res.headers['x-ratelimit-reset']) : null,
          used: res.headers['x-ratelimit-used'] ? Number(res.headers['x-ratelimit-used']) : null,
          resource: res.headers['x-ratelimit-resource'] || 'core'
        };
        const scopes = res.headers['x-oauth-scopes']
          ? res.headers['x-oauth-scopes'].split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!data && res.statusCode === 204) {
            return resolve({ status: res.statusCode, data: {}, rateLimit, scopes });
          }
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed, rateLimit, scopes, rawHeaders: res.headers });
          } catch (e) {
            reject(new Error('bad json from github'));
          }
        } else {
          let errMsg = `GitHub API ${res.statusCode}`;
          try {
            const errObj = JSON.parse(data);
            if (errObj.message) errMsg += `: ${errObj.message}`;
          } catch {
            errMsg += `: ${data.slice(0, 120)}`;
          }
          const err = new Error(errMsg);
          err.statusCode = res.statusCode;
          err.rateLimit = rateLimit;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('github api timeout')));
    if (payload) req.write(payload);
    req.end();
  });
}

class GitHubConnector {
  constructor({ token } = {}) {
    this.token = token || resolveSecret('github_token') || process.env.GITHUB_TOKEN || null;
    this.lastRateLimit = null;
    this.lastScopes = [];
  }

  hasToken() {
    return Boolean(this.token && String(this.token).trim().length > 0);
  }

  setToken(token) {
    const clean = String(token || '').trim();
    if (!clean) throw new Error('Token do GitHub não pode ser vazio');
    this.token = clean;
    process.env.GITHUB_TOKEN = clean;
    storeSecret('github_token', clean);
    return true;
  }

  clearToken() {
    this.token = null;
    delete process.env.GITHUB_TOKEN;
    deleteSecret('github_token');
    return true;
  }

  // Consulta o usuário autenticado da conta conectada
  async getAuthenticatedUser() {
    if (!this.hasToken()) throw new Error('Nenhum token do GitHub configurado');
    const res = await apiRequest('/user', { token: this.token });
    this.lastRateLimit = res.rateLimit;
    this.lastScopes = res.scopes;
    const r = res.data;
    return {
      login: r.login,
      id: r.id,
      name: r.name || r.login,
      avatarUrl: r.avatar_url,
      htmlUrl: r.html_url,
      bio: r.bio || '',
      company: r.company || '',
      location: r.location || '',
      email: r.email || '',
      publicRepos: r.public_repos || 0,
      totalPrivateRepos: r.total_private_repos || 0,
      ownedPrivateRepos: r.owned_private_repos || 0,
      followers: r.followers || 0,
      following: r.following || 0,
      createdAt: r.created_at,
      scopes: res.scopes,
      rateLimit: res.rateLimit
    };
  }

  // Lista repos de um usuário (ou do token owner se username omitido). Pagina até 100.
  async listUserRepos(username, options = {}) {
    const sort = options.sort || 'pushed';
    const perPage = options.per_page || 100;
    const path = username
      ? `/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&sort=${sort}`
      : `/user/repos?per_page=${perPage}&sort=${sort}&affiliation=owner,collaborator`;
    const res = await apiRequest(path, { token: this.token });
    const repos = res.data;
    if (!Array.isArray(repos)) throw new Error('unexpected github response');
    this.lastRateLimit = res.rateLimit;
    this.lastScopes = res.scopes;
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login || '',
      url: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      private: Boolean(r.private),
      description: r.description || '',
      language: r.language || 'Unknown',
      sizeKb: r.size || 0,
      defaultBranch: r.default_branch || 'main',
      pushedAt: r.pushed_at,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
      empty: (r.size === 0),
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      openIssues: r.open_issues_count || 0,
      archived: Boolean(r.archived)
    }));
  }

  // Cria um novo repositório na conta do usuário autenticado
  async createRepository({ name, description = '', isPrivate = true, autoInit = true, gitignoreTemplate = null }) {
    if (!this.hasToken()) throw new Error('Token do GitHub é obrigatório para criar repositórios');
    const cleanName = String(name || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
    if (!cleanName) throw new Error('Nome de repositório inválido');
    const body = {
      name: cleanName,
      description: String(description || '').trim(),
      private: Boolean(isPrivate),
      auto_init: Boolean(autoInit)
    };
    if (gitignoreTemplate) body.gitignore_template = gitignoreTemplate;
    const res = await apiRequest('/user/repos', { method: 'POST', body, token: this.token });
    const r = res.data;
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      url: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      private: r.private,
      defaultBranch: r.default_branch || 'main',
      createdAt: r.created_at
    };
  }

  // Obtém detalhes de um repositório
  async getRepository(owner, repo) {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const res = await apiRequest(path, { token: this.token });
    return res.data;
  }

  // Lista branches do repositório
  async listBranches(owner, repo) {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`;
    const res = await apiRequest(path, { token: this.token });
    return Array.isArray(res.data) ? res.data.map(b => ({
      name: b.name,
      commitSha: b.commit?.sha,
      protected: Boolean(b.protected)
    })) : [];
  }

  // Lista commits recentes
  async listCommits(owner, repo, { branch, limit = 15 } = {}) {
    let path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=${limit}`;
    if (branch) path += `&sha=${encodeURIComponent(branch)}`;
    const res = await apiRequest(path, { token: this.token });
    return Array.isArray(res.data) ? res.data.map(c => ({
      sha: c.sha,
      message: c.commit?.message,
      author: c.commit?.author?.name || c.author?.login,
      date: c.commit?.author?.date,
      url: c.html_url
    })) : [];
  }

  // Cria um Pull Request no repositório
  async createPullRequest({ owner, repo, title, head, base = 'main', body = '' }) {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
    const res = await apiRequest(path, {
      method: 'POST',
      body: { title, head, base, body },
      token: this.token
    });
    return {
      number: res.data.number,
      url: res.data.html_url,
      state: res.data.state,
      title: res.data.title,
      createdAt: res.data.created_at
    };
  }

  // Cria uma Issue no repositório
  async createIssue({ owner, repo, title, body = '', labels = [] }) {
    const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
    const res = await apiRequest(path, {
      method: 'POST',
      body: { title, body, labels },
      token: this.token
    });
    return {
      number: res.data.number,
      url: res.data.html_url,
      state: res.data.state,
      title: res.data.title,
      labels: (res.data.labels || []).map(l => typeof l === 'string' ? l : l.name),
      createdAt: res.data.created_at
    };
  }

  // Consulta taxa de uso (rate limit)
  async getRateLimit() {
    const res = await apiRequest('/rate_limit', { token: this.token });
    return res.data;
  }
}

module.exports = { GitHubConnector };

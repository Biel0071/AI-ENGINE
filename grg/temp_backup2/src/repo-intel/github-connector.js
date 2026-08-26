// Conector real da API do GitHub. Lista repositórios de um usuário/org.
// Sem token: só repos públicos (limite de rate menor). Com token (env GITHUB_TOKEN): inclui
// privados e rate maior. Usa https nativo (sem dependências).
const https = require('node:https');

function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'grg-services-os', Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = https.request({ host: 'api.github.com', path, method: 'GET', headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('bad json from github')); }
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${body.slice(0, 120)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('github api timeout')));
    req.end();
  });
}

class GitHubConnector {
  constructor({ token } = {}) { this.token = token || process.env.GITHUB_TOKEN || null; }

  // Lista repos de um usuário (ou do token owner se username omitido). Pagina até 100.
  async listUserRepos(username) {
    const path = username
      ? `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`
      : '/user/repos?per_page=100&sort=pushed&affiliation=owner';
    const repos = await apiGet(path, this.token);
    if (!Array.isArray(repos)) throw new Error('unexpected github response');
    return repos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      cloneUrl: r.clone_url,
      private: r.private,
      language: r.language,
      sizeKb: r.size,
      defaultBranch: r.default_branch,
      pushedAt: r.pushed_at,
      empty: r.size === 0,
    }));
  }
}

module.exports = { GitHubConnector };

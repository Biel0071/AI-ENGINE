// Ports da Repository Intelligence. Adapters reais (GitHub App, GitLab, Bitbucket) implementam
// a mesma interface. O LocalGitHostAdapter abaixo permite rodar tudo offline nos testes/dev.

// GitHostPort: fetchTree(url) -> { revision, files: [{ path, content }] }
class LocalGitHostAdapter {
  // repos: { [url]: { revision, files: { path: content } } }
  constructor(repos = {}) { this.repos = repos; }

  register(url, revision, files) {
    this.repos[url] = { revision, files };
    return this;
  }

  async fetchTree(url) {
    const repo = this.repos[url];
    if (!repo) {
      const err = new Error(`Repository not reachable by adapter: ${url}`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      revision: repo.revision,
      files: Object.entries(repo.files).map(([path, content]) => ({ path, content })),
    };
  }
}

module.exports = { LocalGitHostAdapter };

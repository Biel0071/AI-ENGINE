// GitHostPort que clona de verdade sob demanda (shallow, efêmero) e reusa o FsGitHostAdapter
// para ler a árvore. Usado pelo ChatAgent para acoplar repos por conversa.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { FsGitHostAdapter } = require('./fs-git-host');

class CloningGitHostAdapter {
  constructor({ baseDir } = {}) {
    this.baseDir = baseDir || path.join(os.tmpdir(), 'grg-clones');
    this.fs = new FsGitHostAdapter();
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  slugFromUrl(url) {
    return String(url).replace(/\.git$/, '').split('/').slice(-2).join('__').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  async fetchTree(url) {
    const dest = path.join(this.baseDir, this.slugFromUrl(url));
    if (!fs.existsSync(dest)) {
      const clean = String(url).replace(/\.git$/, '');
      execSync(`git clone --depth 1 --single-branch "${clean}.git" "${dest}"`, { stdio: 'pipe', timeout: 180000 });
    }
    this.fs.register(url, dest);
    const tree = await this.fs.fetchTree(url);
    return tree;
  }

  // remove o clone efêmero (arquitetura: só metadados persistem)
  cleanup(url) {
    const dest = path.join(this.baseDir, this.slugFromUrl(url));
    try { fs.rmSync(dest, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

module.exports = { CloningGitHostAdapter };

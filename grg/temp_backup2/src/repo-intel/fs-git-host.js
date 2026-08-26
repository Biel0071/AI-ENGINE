// Adapter real de GitHostPort que lê de um clone local no filesystem (checkout efêmero).
// Mesma interface do LocalGitHostAdapter: fetchTree(url) -> { revision, files:[{path,content}] }.
// Filtra binários, node_modules, .git e arquivos grandes para manter a análise barata.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', 'graphify-out', 'archive']);
const TEXT_EXT = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.sql', '.css', '.scss',
  '.html', '.md', '.yml', '.yaml', '.sh', '.env', '.example', '.conf', '.txt',
  '.py', '.go', '.rb', '.java', '.php', '.prisma', '.toml', '.ini',
]);
const MAX_FILE_BYTES = 512 * 1024; // 512KB por arquivo

class FsGitHostAdapter {
  // mapping: { [url]: localPath }
  constructor(mapping = {}) { this.mapping = mapping; }

  register(url, localPath) { this.mapping[url] = localPath; return this; }

  async fetchTree(url) {
    const root = this.mapping[url];
    if (!root || !fs.existsSync(root)) {
      const err = new Error(`No local checkout for ${url}`); err.code = 'NOT_FOUND'; throw err;
    }
    let revision = 'unknown';
    try { revision = execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); } catch { /* not a git dir */ }

    const files = [];
    walk(root, root, files);
    return { revision, files };
  }
}

function walk(dir, root, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), root, out);
    } else if (entry.isFile()) {
      const full = path.join(dir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      const rel = path.relative(root, full).split(path.sep).join('/');
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      // sempre registra o caminho (para contagem/estrutura); só lê conteúdo de texto pequeno
      if (TEXT_EXT.has(ext) && stat.size <= MAX_FILE_BYTES) {
        try { out.push({ path: rel, content: fs.readFileSync(full, 'utf8') }); }
        catch { out.push({ path: rel, content: '' }); }
      } else {
        out.push({ path: rel, content: '' });
      }
    }
  }
}

module.exports = { FsGitHostAdapter };

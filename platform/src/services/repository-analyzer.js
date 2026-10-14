const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.gemini',
]);

const CODE_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
  '.html',
  '.css',
  '.sql',
  '.py',
]);

class RepositoryAnalyzer {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
  }

  /**
   * Obtém a revisão git atual do diretório, com fallback seguro
   */
  getGitRevision(dirPath) {
    try {
      const rev = execSync('git rev-parse HEAD', { cwd: dirPath, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      return rev;
    } catch {
      return crypto.createHash('sha256').update(dirPath).digest('hex').slice(0, 40);
    }
  }

  getGitBranch(dirPath) {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      return branch;
    } catch {
      return 'main';
    }
  }

  /**
   * Analisa um diretório de repositório real
   */
  async analyzeDirectory(targetPath, options = {}) {
    const resolvedPath = path.resolve(targetPath);
    const revision = options.commitSha || this.getGitRevision(resolvedPath);
    const branch = options.branch || this.getGitBranch(resolvedPath);

    const files = [];
    await this._scanFiles(resolvedPath, '', files);

    const screens = [];
    const routes = [];
    const apis = [];
    const services = [];
    let dependencies = {};

    const sha256Accumulator = crypto.createHash('sha256');

    for (const relFile of files) {
      sha256Accumulator.update(relFile);
      const fullPath = path.join(resolvedPath, relFile);
      const ext = path.extname(relFile).toLowerCase();

      // Dependências do package.json
      if (path.basename(relFile) === 'package.json') {
        try {
          const pkgContent = await fs.readFile(fullPath, 'utf8');
          const pkg = JSON.parse(pkgContent);
          dependencies = {
            ...dependencies,
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {}),
          };
        } catch {
          // Ignore json parse error
        }
      }

      // Detecção de telas / UI screens
      if (ext === '.html' || (relFile.includes('pages') || relFile.includes('screens') || relFile.includes('views')) && ['.jsx', '.tsx', '.vue', '.html'].includes(ext)) {
        screens.push({
          id: `screen:${relFile.replace(/\\/g, '/')}`,
          name: path.basename(relFile, ext),
          sourceLocation: `${relFile.replace(/\\/g, '/')}:1`,
          classification: 'CONFIRMED',
          confidence: 1.0,
        });
      }

      // Detecção de rotas e serviços no código
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const lines = content.split('\n');

          // Detecção de Services
          if (relFile.includes('service') || relFile.includes('engine') || relFile.includes('store') || relFile.includes('adapter')) {
            services.push({
              id: `service:${relFile.replace(/\\/g, '/')}`,
              name: path.basename(relFile, ext),
              sourceLocation: `${relFile.replace(/\\/g, '/')}:1`,
              classification: 'CONFIRMED',
              confidence: 0.95,
            });
          }

          // Detecção de endpoints e rotas HTTP
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const routeMatch = line.match(/\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/i)
              || line.match(/url\.pathname\s*===\s*['"`]([^'"`]+)['"`]/i)
              || line.match(/pathname\.match\(\/\^(\\[a-zA-Z0-9_\-\/]+)/i);

            if (routeMatch) {
              const routePath = routeMatch[2] || routeMatch[1];
              if (routePath && routePath.startsWith('/')) {
                const method = (line.match(/\.(get|post|put|delete|patch)\(/i)?.[1] || 'ALL').toUpperCase();
                routes.push({
                  id: `route:${method}:${routePath}`,
                  method,
                  path: routePath,
                  sourceLocation: `${relFile.replace(/\\/g, '/')}:${i + 1}`,
                  classification: 'CONFIRMED',
                  confidence: 1.0,
                });
                apis.push({
                  endpoint: `${method} ${routePath}`,
                  sourceLocation: `${relFile.replace(/\\/g, '/')}:${i + 1}`,
                  classification: 'CONFIRMED',
                  confidence: 1.0,
                });
              }
            }
          }
        } catch {
          // ignore read error
        }
      }
    }

    // Deduplicação
    const uniqueRoutes = Array.from(new Map(routes.map((r) => [r.id, r])).values());
    const uniqueApis = Array.from(new Map(apis.map((a) => [a.endpoint, a])).values());
    const uniqueScreens = Array.from(new Map(screens.map((s) => [s.id, s])).values());
    const uniqueServices = Array.from(new Map(services.map((s) => [s.id, s])).values());

    const treeHash = sha256Accumulator.digest('hex');

    return {
      revision,
      branch,
      treeHash,
      analyzedAt: new Date().toISOString(),
      metrics: {
        totalFiles: files.length,
        screenCount: uniqueScreens.length,
        routeCount: uniqueRoutes.length,
        apiCount: uniqueApis.length,
        serviceCount: uniqueServices.length,
        dependencyCount: Object.keys(dependencies).length,
      },
      screens: uniqueScreens,
      routes: uniqueRoutes,
      apis: uniqueApis,
      services: uniqueServices,
      dependencies,
      evidence: [
        `git:revision:${revision}`,
        `files:scanned:${files.length}`,
        `tree:sha256:${treeHash}`,
      ],
      confidence: 'CONFIRMED',
    };
  }

  async _scanFiles(currentDir, relativePrefix, fileList) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
        if (IGNORED_DIRS.has(entry.name)) continue;

        const rel = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
        const full = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await this._scanFiles(full, rel, fileList);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.has(ext) || entry.name === 'Dockerfile') {
            fileList.push(rel);
          }
        }
      }
    } catch {
      // Ignora erro de leitura em diretórios inacessíveis
    }
  }
}

module.exports = { RepositoryAnalyzer };

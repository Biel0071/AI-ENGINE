/**
 * FÊNIX OS — Deep Multi-Stack Project Scanner (Project Understanding)
 * Analyzes repository structure, detects framework stacks, entry points, schemas, and routes.
 */

const fs = require('fs/promises');
const path = require('path');

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'logs',
  'tmp'
]);

class ProjectUnderstandingScanner {
  constructor(options = {}) {
    this.maxFiles = options.maxFiles || 25000;
  }

  /**
   * Scans a target directory and returns deep project understanding metadata
   */
  async scan(rootPath) {
    const absoluteRoot = path.resolve(rootPath);
    const files = [];
    const structure = { files: [], folders: {} };

    await this.walk(absoluteRoot, absoluteRoot, files, structure);

    const detectedStack = this.detectStack(files);
    const entryPoints = this.findEntryPoints(files);
    const routes = this.detectRoutes(files);
    const database = this.detectDatabase(files);
    const components = this.detectComponents(files);
    const integrations = this.detectIntegrations(files);

    return {
      rootPath: absoluteRoot,
      totalFiles: files.length,
      detectedStack,
      entryPoints,
      routes,
      database,
      components,
      integrations,
      scannedAt: new Date().toISOString()
    };
  }

  async walk(root, current, files, structure) {
    if (files.length >= this.maxFiles) return;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        const subDir = path.join(current, entry.name);
        const relDir = path.relative(root, subDir).replace(/\\/g, '/');
        structure.folders[entry.name] = { files: [], folders: {} };
        await this.walk(root, subDir, files, structure.folders[entry.name]);
      } else if (entry.isFile()) {
        const full = path.join(current, entry.name);
        const rel = path.relative(root, full).replace(/\\/g, '/');
        let stat = { size: 0 };
        try { stat = await fs.stat(full); } catch { /* ignore */ }

        files.push({
          path: rel,
          name: entry.name,
          extension: path.extname(entry.name).toLowerCase(),
          size: stat.size
        });
        structure.files.push(entry.name);
      }
    }
  }

  detectStack(files) {
    const scores = new Map();
    const addScore = (stack, score) => scores.set(stack, (scores.get(stack) || 0) + score);

    for (const f of files) {
      const p = f.path.toLowerCase();
      if (f.name === 'package.json') addScore('nodejs', 0.9);
      if (f.name.startsWith('tsconfig') || p.endsWith('.ts') || p.endsWith('.tsx')) addScore('typescript', 0.8);
      if (p.endsWith('.tsx') || p.endsWith('.jsx') || p.includes('react')) addScore('react', 0.9);
      if (p.includes('next.config') || p.includes('/app/') || p.includes('/pages/')) addScore('nextjs', 0.85);
      if (p.includes('vite.config')) addScore('vite', 0.9);
      if (p.endsWith('.vue')) addScore('vue', 0.9);
      if (f.name === 'docker-compose.yml' || f.name.toLowerCase() === 'dockerfile') addScore('docker', 0.9);
      if (f.name === 'requirements.txt' || f.name === 'pyproject.toml' || p.endsWith('.py')) addScore('python', 0.9);
      if (p.includes('fastapi') || p.includes('uvicorn')) addScore('fastapi', 0.8);
      if (p.includes('supabase') || p.includes('schema.prisma')) addScore('supabase_or_prisma', 0.85);
      if (p.includes('lovable') || p.includes('@lovable')) addScore('lovable', 0.95);
    }

    return Array.from(scores.entries())
      .map(([name, score]) => ({ name, confidence: Math.min(1, Number((score).toFixed(2))) }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  findEntryPoints(files) {
    const candidates = ['index.js', 'index.ts', 'server.js', 'server.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'src/main.tsx', 'src/App.tsx', 'src/index.tsx'];
    return files
      .filter(f => candidates.includes(f.path) || candidates.includes(f.name))
      .map(f => ({ path: f.path, type: f.path.includes('src/') ? 'frontend_entry' : 'backend_entry' }));
  }

  detectRoutes(files) {
    return files
      .filter(f => f.path.includes('/routes/') || f.path.includes('/api/') || f.path.includes('/controllers/'))
      .map(f => ({ file: f.path, inferredScope: f.path.includes('/admin/') ? 'admin' : 'public' }));
  }

  detectDatabase(files) {
    const schemas = files.filter(f => f.name.endsWith('.prisma') || f.name.endsWith('.sql') || f.path.includes('/migrations/') || f.name.includes('schema'));
    return {
      detected: schemas.length > 0,
      schemaFiles: schemas.map(s => s.path),
      type: schemas.some(s => s.name.endsWith('.prisma')) ? 'Prisma' : schemas.some(s => s.name.endsWith('.sql')) ? 'SQL' : 'Unknown'
    };
  }

  detectComponents(files) {
    return files
      .filter(f => f.path.includes('/components/') || f.path.includes('/views/') || f.path.includes('/pages/'))
      .map(f => ({ file: f.path, componentName: path.basename(f.name, f.extension) }));
  }

  detectIntegrations(files) {
    const integrations = [];
    for (const f of files) {
      if (f.path.includes('stripe')) integrations.push({ name: 'Stripe', file: f.path });
      if (f.path.includes('whatsapp') || f.path.includes('baileys')) integrations.push({ name: 'WhatsApp', file: f.path });
      if (f.path.includes('openai')) integrations.push({ name: 'OpenAI', file: f.path });
      if (f.path.includes('supabase')) integrations.push({ name: 'Supabase', file: f.path });
    }
    return integrations;
  }
}

module.exports = { ProjectUnderstandingScanner };

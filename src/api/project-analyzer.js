const fs = require('fs/promises');
const path = require('path');
const { analyzeWithAI } = require('../../intelligence/ai');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage']);
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectPackageHints(pkg = {}) {
  const dependencies = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  const keys = Object.keys(dependencies);

  return {
    hasReact: keys.some((name) => ['react', 'next', 'vite'].includes(name)),
    hasTailwind: keys.includes('tailwindcss'),
    hasBackendRuntime: keys.some((name) => ['express', 'fastify', '@nestjs/core', 'koa', 'hono'].includes(name)),
    raw: keys,
  };
}

function inferLayer(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();

  if (normalized.includes('/frontend/') || normalized.startsWith('frontend/')) {
    return 'frontend';
  }

  if (normalized.includes('/backend/') || normalized.startsWith('backend/')) {
    return 'backend';
  }

  if (normalized.includes('/api/') || normalized.startsWith('api/')) {
    return 'backend';
  }

  return 'shared';
}

class ProjectAnalyzer {
  constructor(options = {}) {
    this.maxFiles = Number(options.maxFiles || 3000);
    this.aiOptions = options.aiOptions || {};
  }

  async walk(rootPath, currentPath = rootPath, accumulator = []) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, absolutePath);

      if (entry.isDirectory()) {
        await this.walk(rootPath, absolutePath, accumulator);
      } else {
        accumulator.push({
          absolutePath,
          relativePath,
          ext: path.extname(entry.name).toLowerCase(),
          layer: inferLayer(relativePath),
        });
      }

      if (accumulator.length >= this.maxFiles) {
        return accumulator;
      }
    }

    return accumulator;
  }

  async detectRoutes(files) {
    const routes = [];
    const routeCandidates = files.filter((file) => {
      if (!SOURCE_EXTENSIONS.has(file.ext)) {
        return false;
      }

      const rel = file.relativePath.toLowerCase();
      return rel.includes('route') || rel.includes('router') || rel.includes('server') || rel.includes('controller');
    });

    const matcher = /(app|router|fastify)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

    for (const file of routeCandidates) {
      let content = '';
      try {
        content = await fs.readFile(file.absolutePath, 'utf8');
      } catch {
        continue;
      }

      let match = matcher.exec(content);
      while (match) {
        routes.push({
          method: String(match[2] || '').toUpperCase(),
          path: match[3],
          source: file.relativePath,
        });
        match = matcher.exec(content);
      }

      if (file.relativePath.replace(/\\/g, '/').includes('app/api/')) {
        const normalized = file.relativePath.replace(/\\/g, '/');
        const apiRoute = normalized
          .replace(/^.*app\/api\//, '/api/')
          .replace(/\/route\.[^.]+$/, '')
          .replace(/\/(page|layout)\.[^.]+$/, '');

        if (apiRoute.startsWith('/api/')) {
          routes.push({
            method: 'INFERRED',
            path: apiRoute,
            source: file.relativePath,
          });
        }
      }
    }

    return routes;
  }

  async detectComponents(files) {
    const componentFiles = files.filter((file) => {
      const rel = file.relativePath.replace(/\\/g, '/').toLowerCase();
      return (
        SOURCE_EXTENSIONS.has(file.ext) &&
        (rel.includes('/components/') || rel.endsWith('.tsx') || rel.endsWith('.jsx')) &&
        file.layer !== 'backend'
      );
    });

    const components = [];
    const exportMatcher = /export\s+(default\s+)?function\s+([A-Z][A-Za-z0-9_]*)|export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*=|function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g;

    for (const file of componentFiles) {
      let content = '';
      try {
        content = await fs.readFile(file.absolutePath, 'utf8');
      } catch {
        continue;
      }

      let match = exportMatcher.exec(content);
      while (match) {
        const componentName = match[2] || match[3] || match[4];
        if (componentName) {
          components.push({
            name: componentName,
            source: file.relativePath,
          });
        }
        match = exportMatcher.exec(content);
      }
    }

    return components;
  }

  async analyze(projectPath) {
    const root = path.resolve(projectPath || process.cwd());
    const files = await this.walk(root);

    const packageJson = await readJson(path.join(root, 'package.json'));
    const hints = collectPackageHints(packageJson || {});

    const frontendFiles = files.filter((file) => file.layer === 'frontend');
    const backendFiles = files.filter((file) => file.layer === 'backend');

    const routes = await this.detectRoutes(files);
    const components = await this.detectComponents(files);

    let aiAnalysis = {
      enabled: false,
      skipped: true,
      insights: {
        summary: 'AI disabled or unavailable.',
        risks: [],
        opportunities: [],
        architectureHints: [],
      },
    };

    try {
      aiAnalysis = await analyzeWithAI(
        {
          root,
          summary: {
            totalFiles: files.length,
            frontendFiles: frontendFiles.length,
            backendFiles: backendFiles.length,
          },
          routes,
          components,
          dependencies: hints.raw,
        },
        this.aiOptions,
      );
    } catch {
      aiAnalysis = {
        enabled: false,
        skipped: true,
        insights: {
          summary: 'AI analysis failed and fallback was used.',
          risks: [],
          opportunities: [],
          architectureHints: [],
        },
      };
    }

    return {
      root,
      summary: {
        totalFiles: files.length,
        frontendFiles: frontendFiles.length,
        backendFiles: backendFiles.length,
        detectedFrontend: hints.hasReact || frontendFiles.length > 0,
        detectedBackend: hints.hasBackendRuntime || backendFiles.length > 0,
      },
      frontend: {
        detected: hints.hasReact || frontendFiles.length > 0,
        usesTailwind: hints.hasTailwind,
        fileCount: frontendFiles.length,
      },
      backend: {
        detected: hints.hasBackendRuntime || backendFiles.length > 0,
        fileCount: backendFiles.length,
      },
      routes,
      components,
      files: files.map((entry) => ({
        path: entry.relativePath,
        layer: entry.layer,
      })),
      dependencies: hints.raw,
      ai: aiAnalysis,
    };
  }
}

module.exports = {
  ProjectAnalyzer,
};

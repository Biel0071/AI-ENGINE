'use strict';
/**
 * Project Mirror — Screen Extractor
 * Descobre telas/views de frontends reais:
 * - HTML com data-view (FÊNIX pattern)
 * - React Router (Route path=...)
 * - Next.js pages/ or app/
 * - Vue Router (router/index.js)
 * - Express views
 *
 * NUNCA inventa telas. Tudo vem de parsing real de arquivos.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const SCREEN_ICON_MAP = {
  dashboard: 'ph-chart-line-up',
  login: 'ph-sign-in',
  home: 'ph-house',
  settings: 'ph-gear',
  profile: 'ph-user',
  agents: 'ph-users-three',
  jobs: 'ph-briefcase',
  runtime: 'ph-activity',
  memory: 'ph-brain',
  knowledge: 'ph-graph',
  city: 'ph-buildings',
  ide: 'ph-code',
  operations: 'ph-kanban',
  projects: 'ph-folders',
  mcp: 'ph-plug',
  browser: 'ph-browser',
  observability: 'ph-chart-line',
  terminal: 'ph-terminal',
  command: 'ph-squares-four',
  inbox: 'ph-inbox',
  crm: 'ph-address-book',
  analytics: 'ph-chart-pie',
  workers: 'ph-cpu',
  queues: 'ph-queue',
  'ai': 'ph-robot',
};

function inferIcon(name) {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SCREEN_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return 'ph-rectangle';
}

function lineAt(content, offset) {
  return content.slice(0, Math.max(0, offset)).split(/\r?\n/).length;
}

function htmlLabel(content, viewName) {
  const match = content.match(new RegExp(`<[^>]+data-view=["']${viewName}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : viewName;
}

function htmlViewEvidence(content, rel, viewName) {
  const marker = new RegExp(`<([a-z0-9-]+)[^>]*id=["']view-${viewName}["'][^>]*>`, 'i').exec(content);
  if (!marker) return { sourceLine: null, components: [] };
  const sourceLine = lineAt(content, marker.index);
  const nextView = content.slice(marker.index + marker[0].length).search(/<[a-z0-9-]+[^>]*id=["']view-[^"']+["']/i);
  const blockEnd = nextView < 0 ? content.length : marker.index + marker[0].length + nextView;
  const block = content.slice(marker.index, blockEnd);
  const components = [];
  for (const match of block.matchAll(/<([a-z0-9-]+)[^>]*\sid=["']([^"']+)["'][^>]*>/gi)) {
    const id = match[2];
    components.push({
      id,
      name: id,
      type: `dom-${match[1].toLowerCase()}`,
      file: rel,
      line: sourceLine + lineAt(block, match.index || 0) - 1,
      discoveredBy: 'html-id',
    });
  }
  return { sourceLine, components: components.slice(0, 80) };
}

/**
 * Extract screens from FÊNIX-style HTML (data-view attributes).
 */
async function extractFromHtml(projectPath, scanResult = null) {
  const screens = [];
  const discoveredHtml = (scanResult?.files?.list || scanResult?.filePaths || [])
    .filter((file) => /(^|\/)public\/(?:index|app)\.html$/i.test(file));
  const htmlFiles = [...new Set(['public/index.html', 'index.html', 'public/app.html', ...discoveredHtml])];
  for (const rel of htmlFiles) {
    const filePath = path.join(projectPath, rel);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // data-view="name" on nav buttons
      const navMatches = [...content.matchAll(/data-view="([^"]+)"/g)];
      const viewIds = [...new Set(navMatches.map(([, v]) => v))];

      // id="view-name" divs
      const viewDivs = [...content.matchAll(/id="view-([^"]+)"/g)].map(([, v]) => v);
      const allViews = [...new Set([...viewIds, ...viewDivs])];
      const hashRoutes = [...content.matchAll(/<a[^>]+href=["']#\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      for (const match of hashRoutes) {
        const viewName = match[1].replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home';
        if (!allViews.includes(viewName)) allViews.push(viewName);
      }
      const loadedSources = [...content.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']\/([^"'?]+)[^"']*["']/gi)]
        .map((match) => ({ file: `public/${match[1]}`.replace(/^public\/public\//, 'public/'), line: lineAt(content, match.index || 0) }))
        .filter((source) => /\.(?:js|css)$/i.test(source.file));
      for (const match of content.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^/][^"'?]+)[^"']*["']/gi)) {
        if (!/\.(?:js|css)$/i.test(match[1])) continue;
        loadedSources.push({ file: path.posix.join(path.posix.dirname(rel), match[1]), line: lineAt(content, match.index || 0) });
      }

      for (const viewName of allViews) {
        const routeMatch = hashRoutes.find((match) => match[1].replace(/^\/+|\/+$/g, '').replace(/\//g, '-') === viewName);
        const anchorLabel = routeMatch?.[2]
          ? routeMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          : '';
        const label = anchorLabel || htmlLabel(content, viewName);
        const evidence = htmlViewEvidence(content, rel, viewName);
        const route = routeMatch ? `#/${routeMatch[1]}` : `/app#${viewName}`;
        screens.push({
          id: viewName,
          name: label || viewName,
          type: 'html-view',
          file: rel,
          sourceLine: evidence.sourceLine,
          sourceFiles: [{ file: rel, line: evidence.sourceLine }, ...loadedSources],
          components: evidence.components,
          apiDependencies: [],
          route,
          previewTarget: { type: 'PROJECT_HTML', path: route, file: rel },
          icon: inferIcon(viewName),
          discoveredBy: 'html-data-view',
        });
      }
      // Continue: monorepos can contain more than one real frontend.
    } catch { /* skip */ }
  }
  return screens;
}

/**
 * Extract screens from React Router v5/v6 patterns.
 */
async function extractFromReactRouter(projectPath) {
  const screens = [];
  const candidates = [
    'src/App.jsx', 'src/App.tsx', 'src/App.js',
    'src/router.jsx', 'src/router.tsx', 'src/router.js',
    'src/routes.jsx', 'src/routes.tsx', 'src/routes.js',
  ];

  for (const rel of candidates) {
    try {
      const content = await fs.readFile(path.join(projectPath, rel), 'utf8');
      // <Route path="/dashboard" element={...} />
      // <Route path="/dashboard" component={...} />
      const routeMatches = [...content.matchAll(/<Route[^>]+path=["'`]([^"'`]+)["'`]/g)];
      for (const [, routePath] of routeMatches) {
        const name = routePath.replace(/^\//, '').replace(/\//g, '-') || 'home';
        screens.push({
          id: name,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          type: 'react-route',
          file: rel,
          sourceLine: lineAt(content, routeMatches.find((match) => match[1] === routePath)?.index || 0),
          sourceFiles: [{ file: rel, line: lineAt(content, routeMatches.find((match) => match[1] === routePath)?.index || 0) }],
          components: [],
          apiDependencies: [],
          route: routePath,
          previewTarget: { type: 'FULL_APP', path: routePath },
          icon: inferIcon(name),
          discoveredBy: 'react-router',
        });
      }
    } catch { /* skip */ }
  }
  return screens;
}

/**
 * Extract screens from Next.js pages/ or app/ directory.
 */
async function extractFromNextJs(projectPath) {
  const screens = [];
  for (const pagesDir of ['pages', 'src/pages', 'app', 'src/app']) {
    const dirPath = path.join(projectPath, pagesDir);
    try {
      await fs.access(dirPath);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
          const base = entry.name.replace(/\.(jsx?|tsx?)$/, '');
          if (base.startsWith('_') || base.startsWith('[')) continue;
          const route = base === 'index' ? '/' : `/${base}`;
          screens.push({
            id: base,
            name: base.charAt(0).toUpperCase() + base.slice(1),
            type: 'nextjs-page',
            file: `${pagesDir}/${entry.name}`,
            sourceLine: 1,
            sourceFiles: [{ file: `${pagesDir}/${entry.name}`, line: 1 }],
            components: [],
            apiDependencies: [],
            route,
            previewTarget: { type: 'FULL_APP', path: route },
            icon: inferIcon(base),
            discoveredBy: 'nextjs-pages',
          });
        }
      }
      if (screens.length > 0) break;
    } catch { /* skip */ }
  }
  return screens;
}

/**
 * Extract screens from Vue Router.
 */
async function extractFromVueRouter(projectPath) {
  const screens = [];
  const candidates = ['src/router/index.js', 'src/router/index.ts', 'src/router.js', 'src/router.ts'];
  for (const rel of candidates) {
    try {
      const content = await fs.readFile(path.join(projectPath, rel), 'utf8');
      const routeMatches = [...content.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)];
      const nameMatches = [...content.matchAll(/name:\s*['"`]([^'"`]+)['"`]/g)];
      for (let i = 0; i < routeMatches.length; i++) {
        const [, routePath] = routeMatches[i];
        const name = nameMatches[i]?.[1] || routePath.replace(/^\//, '').replace(/\//g, '-') || 'home';
        screens.push({
          id: name,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          type: 'vue-route',
          file: rel,
          sourceLine: lineAt(content, routeMatches[i]?.index || 0),
          sourceFiles: [{ file: rel, line: lineAt(content, routeMatches[i]?.index || 0) }],
          components: [],
          apiDependencies: [],
          route: routePath,
          previewTarget: { type: 'FULL_APP', path: routePath },
          icon: inferIcon(name),
          discoveredBy: 'vue-router',
        });
      }
      if (screens.length > 0) break;
    } catch { /* skip */ }
  }
  return screens;
}

/**
 * Main screen extraction function.
 * @param {string} projectPath - Absolute path to the project root.
 * @param {object} [scanResult] - Optional: result from scanner.js (used to detect tech).
 * @returns {Promise<Array>} List of screen objects.
 */
async function extractScreens(projectPath, scanResult = null) {
  const tech = scanResult?.tech?.frontend;

  // Try all extractors and use whichever finds the most screens
  const [htmlScreens, reactScreens, nextScreens, vueScreens] = await Promise.all([
    extractFromHtml(projectPath, scanResult),
    tech !== 'vue' && tech !== 'angular' ? extractFromReactRouter(projectPath) : Promise.resolve([]),
    extractFromNextJs(projectPath),
    tech === 'vue' ? extractFromVueRouter(projectPath) : Promise.resolve([]),
  ]);

  // Deduplicate by route, prefer more specific extractors
  const all = [...htmlScreens, ...nextScreens, ...reactScreens, ...vueScreens];
  const seen = new Map();
  for (const screen of all) {
    if (!seen.has(screen.route)) seen.set(screen.route, screen);
  }
  return [...seen.values()];
}

module.exports = { extractScreens };

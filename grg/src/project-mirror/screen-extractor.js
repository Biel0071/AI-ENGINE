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

/**
 * Extract screens from FÊNIX-style HTML (data-view attributes).
 */
async function extractFromHtml(projectPath) {
  const screens = [];
  const htmlFiles = ['public/index.html', 'index.html', 'public/app.html'];
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

      for (const viewName of allViews) {
        const navBtn = content.match(new RegExp(`data-view="${viewName}"[^>]*>([^<]*)`));
        const label = navBtn ? navBtn[1].trim().replace(/<[^>]+>/g, '').trim() : viewName;
        screens.push({
          id: viewName,
          name: label || viewName,
          type: 'html-view',
          file: rel,
          route: `#${viewName}`,
          icon: inferIcon(viewName),
          discoveredBy: 'html-data-view',
        });
      }
      if (screens.length > 0) break; // found our main html
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
          route: routePath,
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
            route,
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
          route: routePath,
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
    extractFromHtml(projectPath),
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

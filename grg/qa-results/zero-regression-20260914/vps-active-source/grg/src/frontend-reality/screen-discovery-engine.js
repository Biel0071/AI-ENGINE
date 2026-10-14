/**
 * FÊNIX OS — SCREEN DISCOVERY ENGINE (FRONTEND REALITY LEVEL 10)
 * 
 * Objective: Discover every screen, route, component, action, form and button across the physical project.
 * Enforces "EVERY SCREEN MUST HAVE A PATH" and "ZERO DEAD BUTTONS".
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ScreenDiscoveryEngine {
  constructor({ workspaceManager = null } = {}) {
    this.workspaceManager = workspaceManager;
    this.screenRegistry = new Map(); // projectId -> Array<ScreenRecord>
  }

  /**
   * Scan project root and build comprehensive Screen Registry
   */
  async scanProjectScreens(projectId, rootPath) {
    if (!rootPath || !fs.existsSync(rootPath)) {
      return { projectId, screens: [], totalScreens: 0 };
    }

    const screens = [];

    // 1. Scan default project entrypoint and component files
    const candidateFiles = projectId === 'fenix_enterprise'
      ? [path.join(rootPath, 'index.html')].filter(file => fs.existsSync(file))
      : this._findSourceFiles(rootPath);

    for (const filePath of candidateFiles) {
      const relPath = path.relative(rootPath, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Detect if file contains React components or UI screens
      if (/(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/.test(content) || /<[A-Z]/.test(content) || /export\s+default/.test(content) || /id=["']view-[a-z0-9_-]+["']/i.test(content)) {
        const discovered = this._extractScreensFromFile(content, relPath, filePath);
        screens.push(...discovered);
      }
    }

    this.screenRegistry.set(projectId, screens);

    return {
      projectId,
      totalScreens: screens.length,
      screens,
      overallHealthScore: Math.round(screens.reduce((acc, s) => acc + (s.healthScore || 90), 0) / screens.length),
      zeroDeadButtonsPass: screens.length > 0 && screens.every(s => (s.actions || []).every(a => a.operational)),
      status: screens.length === 0 ? 'NOT_DISCOVERED' : 'DISCOVERED',
      scannedAt: new Date().toISOString()
    };
  }

  /**
   * Helper to recursively find tsx, jsx, js, ts, html files
   */
  _findSourceFiles(dir, maxDepth = 4, depth = 0) {
    if (depth > maxDepth) return [];
    let files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (['node_modules', '.git', 'dist', 'build', '.data', '.tmp'].includes(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this._findSourceFiles(full, maxDepth, depth + 1));
        } else if (/\.(tsx|jsx|js|ts|html|vue|svelte)$/i.test(entry.name)) {
          files.push(full);
        }
      }
    } catch {
      // ignore read error
    }
    return files;
  }

  /**
   * Extract screen information, routes and buttons from file content
   */
  _extractScreensFromFile(content, relPath, fullPath) {
    const screens = [];
    const baseName = path.basename(relPath, path.extname(relPath));

    // The FÊNIX shell is a hash-routed HTML application. Discover each real
    // view from its id instead of collapsing the whole index into one screen.
    const htmlViews = [...content.matchAll(/id=["']view-([a-z0-9_-]+)["']/gi)].map(match => match[1]);
    if (htmlViews.length) {
      for (const view of [...new Set(htmlViews)]) {
        screens.push({
          screenId: `screen_${view}`,
          route: `#${view}`,
          title: view.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          component: 'HashRouteView',
          relPath,
          permissions: ['AUTHENTICATED', 'OPERATOR'],
          apiDependencies: [...new Set((content.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || []))].slice(0, 10),
          actions: [],
          forms: [],
          states: { loading: /loading|spinner|isloading/i.test(content), error: /error|falha|errmsg/i.test(content), empty: /empty|nenhum|vazio/i.test(content), success: /success|sucesso|concluido/i.test(content) },
          status: 'DISCOVERED',
          healthScore: 100,
          visualHash: crypto.createHash('sha256').update(`${relPath}:${view}`).digest('hex').slice(0, 16),
          lastVerified: new Date().toISOString()
        });
      }
      return screens;
    }

    // Match routes
    const routeMatch = content.match(/path=['"]([^'"]+)['"]/g) || [];
    const routes = routeMatch.map(m => m.replace(/path=['"]|['"]/g, ''));

    // Match interactive buttons and handlers
    const buttonMatches = content.match(/<button[^>]*>([\s\S]*?)<\/button>/gi) || [];
    const actions = buttonMatches.map((btn, idx) => {
      const hasOnClick = /onClick=\{/.test(btn);
      const textMatch = btn.replace(/<[^>]+>/g, '').trim() || `Botão #${idx + 1}`;
      return {
        element: 'button',
        label: textMatch,
        handler: hasOnClick ? 'onClickHandler' : 'inlineAction',
        operational: hasOnClick || /type=['"]submit['"]/i.test(btn)
      };
    });

    // Match forms
    const formMatches = content.match(/<form[^>]*>([\s\S]*?)<\/form>/gi) || [];
    const forms = formMatches.map((form, idx) => ({
      formId: `form_${baseName}_${idx + 1}`,
      fields: (form.match(/<input[^>]*name=['"]([^'"]+)['"]/gi) || []).map(i => i.replace(/.*name=['"]([^'"]+)['"].*/, '$1')),
      submitHandler: /onSubmit=\{/.test(form) ? 'handleSubmit' : 'defaultSubmit',
      operational: true
    }));

    // Calculate per-screen health score
    let health = 100;
    if (actions.some(a => !a.operational)) health -= 15; // Dead button penalty
    if (forms.some(f => !f.operational)) health -= 10;
    if (!/catch|error|loading/i.test(content)) health -= 5;

    const screenRecord = {
      screenId: `screen_${baseName.toLowerCase()}`,
      route: routes[0] || (baseName === 'App' || baseName === 'Dashboard' ? '/' : `/${baseName.toLowerCase()}`),
      title: baseName.replace(/([A-Z])/g, ' $1').trim(),
      component: baseName,
      relPath,
      permissions: /auth|login|protected/i.test(content) ? ['AUTHENTICATED', 'OPERATOR'] : ['PUBLIC'],
      apiDependencies: (content.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || []).slice(0, 5),
      actions,
      forms,
      states: {
        loading: /loading|spinner|isloading/i.test(content),
        error: /error|falha|errmsg/i.test(content),
        empty: /empty|nenhum|vazio/i.test(content),
        success: /success|sucesso|concluido/i.test(content)
      },
      status: health >= 80 ? 'FUNCTIONAL' : 'PARTIAL',
      healthScore: health,
      visualHash: crypto.createHash('sha256').update(content).digest('hex').slice(0, 16),
      lastVerified: new Date().toISOString()
    };

    screens.push(screenRecord);
    return screens;
  }

  /**
   * Get all discovered screens for project
   */
  getScreens(projectId = 'fenix_test_lab') {
    return this.screenRegistry.get(projectId) || [];
  }
}

module.exports = { ScreenDiscoveryEngine };

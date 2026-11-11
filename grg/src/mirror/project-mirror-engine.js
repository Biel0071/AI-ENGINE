'use strict';
/**
 * FÊNIX OS — PROJECT MIRROR & SCREEN REGISTRY ENGINE
 * 
 * Capabilities:
 * 1. Project Discovery & Static Introspection (Code, Routes, Components, APIs)
 * 2. Visual Truth Scanner with Playwright (Headless Chromium on VPS)
 * 3. Screen Registry (Screens, DOM Elements, Handlers, Visual Proof)
 * 4. Action Mapping (Element -> Handler -> API -> Service)
 * 5. Persistence (project-mirror.json, screen-registry.json, visual-truth.json)
 * 6. Zero Production Mocks Policy: VERIFIED REAL vs UNVERIFIED
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = '/opt/fenix-os/grg/data';
const SCREENSHOTS_PUBLIC = '/opt/fenix-os/public/screenshots/projects';
const SCREENSHOTS_GRG = '/opt/fenix-os/grg/public/screenshots/projects';

const MIRROR_FILE = path.join(DATA_DIR, 'project-mirror.json');
const REGISTRY_FILE = path.join(DATA_DIR, 'screen-registry.json');
const VISUAL_TRUTH_FILE = path.join(DATA_DIR, 'visual-truth.json');

const KNOWN_PROJECTS = {
  'fenix-os': {
    id: 'fenix-os',
    name: 'FÊNIX OS',
    displayName: 'FÊNIX HQ',
    organization: 'GRG AI Systems',
    description: 'Autonomous Engineering OS — Dual-Lane Fast Engine, City, Memory, Agents & Unified Shell',
    baseUrl: 'http://localhost:3000',
    internalPort: 4410,
    publicPort: 3000,
    vpsPath: '/opt/fenix-os',
    codePath: '/opt/fenix-os/grg',
    frontend: {
      framework: 'Vanilla ES6 + PixiJS 8 (Single Shell)',
      path: '/opt/fenix-os/grg/public',
      entrypoint: 'index.html',
      canonical: true
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Native HTTP Kernel + BullMQ',
      entrypoint: 'src/server.js',
      pm2Name: 'fenix-backend',
      port: 4410
    },
    healthUrl: 'http://127.0.0.1:4410/health',
    screens: [
      { id: 'command', title: 'Início (Command Center)', route: '#/command', view: 'command', source: 'public/index.html#view-command' },
      { id: 'city', title: 'AI City 2.0', route: '#/city', view: 'city', source: 'public/index.html#view-city' },
      { id: 'agents', title: 'Agentes Autônomos', route: '#/agents', view: 'agents', source: 'public/index.html#view-agents' },
      { id: 'operations', title: 'Tarefas & Jobs', route: '#/operations', view: 'operations', source: 'public/index.html#view-operations' },
      { id: 'ide', title: 'Workflows & IDE', route: '#/ide', view: 'ide', source: 'public/index.html#view-ide' },
      { id: 'terminal', title: 'Automação & Terminal', route: '#/terminal', view: 'terminal', source: 'public/index.html#view-terminal' },
      { id: 'projects', title: 'Project Mirror & IDE', route: '#/projects', view: 'projects', source: 'public/index.html#view-projects' },
      { id: 'memory', title: 'Memória & Experiências', route: '#/memory', view: 'memory', source: 'public/index.html#view-memory' },
      { id: 'knowledge', title: 'Skills & Conhecimento', route: '#/knowledge', view: 'knowledge', source: 'public/index.html#view-knowledge' },
      { id: 'mcp', title: 'Provedores & Conectores MCP', route: '#/mcp', view: 'mcp', source: 'public/index.html#view-mcp' },
      { id: 'runtime', title: 'Monitoramento & Serviços', route: '#/runtime', view: 'runtime', source: 'public/index.html#view-runtime' },
      { id: 'observability', title: 'Eventos & Observabilidade', route: '#/observability', view: 'observability', source: 'public/index.html#view-observability' },
      { id: 'project', title: 'Infraestrutura & Stack', route: '#/project', view: 'project', source: 'public/index.html#view-project' },
      { id: 'browser', title: 'Runtime QA & Playwright', route: '#/browser', view: 'browser', source: 'public/index.html#view-browser' }
    ],
    components: [
      { name: 'CommandCenter', type: 'View Controller', file: 'public/fenix-core-controller.js', exportName: 'loadDashboardState' },
      { name: 'IsoCityRenderer', type: 'Canvas Engine', file: 'public/iso-city.js', exportName: 'FenixLivingCity' },
      { name: 'ProjectHub', type: 'Hub Controller', file: 'public/project-hub-controller.js', exportName: 'ProjectHubController' },
      { name: 'LiveRuntimeEngine', type: 'WebSocket Client', file: 'public/live-runtime.js', exportName: 'FENIX.live' },
      { name: 'OperationalOS', type: 'OS Inspector Layer', file: 'public/fenix-operational-os.js', exportName: 'fenixOpenInspector' },
      { name: 'CommandPalette', type: 'UI Navigation', file: 'public/fenix-command-palette.js', exportName: 'FenixCommandPalette' }
    ],
    apis: [
      { method: 'GET', endpoint: '/api/v2/reality/summary', desc: 'Resumo completo da infraestrutura host, containers e serviços', category: 'Reality' },
      { method: 'GET', endpoint: '/api/v2/reality/score', desc: 'Reality score auditável e contagem de testes reais', category: 'Reality' },
      { method: 'GET', endpoint: '/api/v2/living-city/agents', desc: 'Lista e telemetria de todos os 15 agentes da AI City', category: 'Living City' },
      { method: 'GET', endpoint: '/api/v2/living-city/state', desc: 'Estado global, distritos e métricas da cidade viva', category: 'Living City' },
      { method: 'POST', endpoint: '/api/v2/conversation', desc: 'Chat interativo dual-lane com o Assistente Fênix Kernel', category: 'AI Assistant', defaultBody: '{"message": "Status do sistema"}' },
      { method: 'GET', endpoint: '/api/v2/runtime/full-status', desc: 'Status completo de memória, CPU e workers BullMQ', category: 'Runtime' },
      { method: 'GET', endpoint: '/api/v2/runtime/jobs', desc: 'Fila BullMQ ativa com jobs concluídos e pendentes', category: 'Runtime' },
      { method: 'POST', endpoint: '/api/v2/runtime/tick', desc: 'Disparo de ciclo autônomo do kernel Fênix', category: 'Runtime', defaultBody: '{}' },
      { method: 'GET', endpoint: '/api/v2/mirror/projects', desc: 'Catálogo geral de projetos e métricas registradas', category: 'Mirror' },
      { method: 'GET', endpoint: '/api/v2/mirror/project/fenix-os', desc: 'Espelho detalhado com telas, rotas e componentes do Fênix OS', category: 'Mirror' },
      { method: 'GET', endpoint: '/api/v2/mirror/screen/command/inspect', desc: 'Inspeção profunda de DOM, botões e inputs da tela Command', category: 'Mirror' },
      { method: 'GET', endpoint: '/api/v2/graph/stats', desc: 'Métricas da malha de conhecimento e nós do Graph Brain', category: 'Memory' },
      { method: 'GET', endpoint: '/api/v2/knowledge/skills', desc: 'Skills científicas e operacionais registradas', category: 'Knowledge' },
      { method: 'GET', endpoint: '/api/v2/mcp/servers', desc: 'Servidores MCP conectados e catálogo de ferramentas', category: 'MCP' },
      { method: 'GET', endpoint: '/api/v2/browser/audit', desc: 'Resultados da auditoria visual e Playwright QA', category: 'QA' },
      { method: 'GET', endpoint: '/health', desc: 'Healthcheck de integridade do gateway HTTP', category: 'System' }
    ],
  },
  'zapai-crm': {
    id: 'zapai-crm',
    name: 'ZapAI CRM',
    displayName: 'ZapAI Tower',
    organization: 'Biel0071 SaaS',
    description: 'CRM Omnichannel WhatsApp Multi-Device & Automações de Campanhas',
    baseUrl: 'http://localhost:4025',
    internalPort: 4025,
    publicPort: 4025,
    vpsPath: '/opt/zapai',
    codePath: '/opt/zapai',
    frontend: {
      framework: 'React 18 + Vite + Tailwind CSS',
      path: '/opt/zapai/frontend-official',
      distPath: '/opt/zapai/releases/current/dist',
      entrypoint: 'index.html',
      canonical: false
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Express + Socket.IO + Baileys',
      entrypoint: 'backend/server.js',
      pm2Name: 'zapflow-api',
      port: 4025
    },
    components: [
      { name: 'AppRouter', type: 'React Router', file: 'src/App.tsx' },
      { name: 'ChatInbox', type: 'UI Component', file: 'src/pages/Inbox.tsx' },
      { name: 'CampaignBuilder', type: 'UI Component', file: 'src/pages/Campaigns.tsx' },
      { name: 'WhatsAppConnector', type: 'Baileys Client', file: 'backend/services/whatsapp.js' }
    ],
    apis: [
      { method: 'GET', endpoint: '/api/health', desc: 'Healthcheck do serviço ZapFlow API', category: 'System' },
      { method: 'GET', endpoint: '/api/contacts', desc: 'Lista de contatos e tags de clientes WhatsApp', category: 'CRM' },
      { method: 'GET', endpoint: '/api/campaigns', desc: 'Campanhas ativas de disparo em massa', category: 'Marketing' },
      { method: 'GET', endpoint: '/api/connections', desc: 'Sessões Baileys WhatsApp conectadas', category: 'WhatsApp' },
      { method: 'GET', endpoint: '/api/flows', desc: 'Fluxos conversacionais automatizados', category: 'Automation' },
      { method: 'POST', endpoint: '/api/messages/send', desc: 'Disparo de mensagem via API para contato', category: 'Messaging', defaultBody: '{"to": "5511999999999", "message": "Olá!"}' },
      { method: 'GET', endpoint: '/api/analytics/overview', desc: 'Métricas de engajamento e conversão de leads', category: 'Analytics' }
    ],
    healthUrl: 'http://127.0.0.1:4025/api/health',
    screens: [
      { id: 'dashboard', title: 'Dashboard CRM', route: '/dashboard', source: 'src/pages/Dashboard.tsx' },
      { id: 'inbox', title: 'Inbox de Conversas', route: '/inbox', source: 'src/pages/Inbox.tsx' },
      { id: 'contacts', title: 'Contatos & Tags', route: '/contacts', source: 'src/pages/Contacts.tsx' },
      { id: 'campaigns', title: 'Disparo de Campanhas', route: '/campaigns', source: 'src/pages/Campaigns.tsx' },
      { id: 'connections', title: 'Instâncias WhatsApp', route: '/connections', source: 'src/pages/Connections.tsx' },
      { id: 'flows', title: 'Fluxos de Automação', route: '/flows', source: 'src/pages/Flows.tsx' },
      { id: 'analytics', title: 'Métricas & Relatórios', route: '/analytics', source: 'src/pages/Analytics.tsx' },
      { id: 'settings', title: 'Configurações CRM', route: '/settings', source: 'src/pages/Settings.tsx' }
    ]
  },
  'api-platform': {
    id: 'api-platform',
    name: 'API Platform',
    displayName: 'AI Platform Tower',
    organization: 'Biel0071 Systems',
    description: 'Multi-Provider AI Gateway — Qwen 2.5, Ollama, BullMQ Workers & Telemetria',
    baseUrl: 'http://209.50.241.22:3001',
    internalPort: 3000,
    publicPort: 3001,
    dashboardPort: 8081,
    vpsPath: '/opt/grg-fenix/workspaces/AI-PLATFORM',
    codePath: '/opt/grg-fenix/workspaces/AI-PLATFORM',
    frontend: {
      framework: 'Vanilla JS / Dashboard Static',
      path: '/opt/grg-fenix/workspaces/AI-PLATFORM/apps/dashboard',
      entrypoint: 'public/index.html',
      canonical: false
    },
    backend: {
      runtime: 'Node.js 22',
      framework: 'Fastify + TypeScript + Prisma',
      entrypoint: 'apps/api/src/server.ts',
      dockerContainer: 'api-platform-api-1',
      port: 3001
    },
    components: [
      { name: 'FastifyGateway', type: 'API Gateway', file: 'apps/api/src/server.ts' },
      { name: 'ModelRouter', type: 'Routing Engine', file: 'apps/api/src/routes/models.ts' },
      { name: 'BullMQWorkerPool', type: 'Queue Worker Pool', file: 'apps/worker/src/index.ts' },
      { name: 'DashboardApp', type: 'Vanilla SPA', file: 'apps/dashboard/public/index.html' }
    ],
    apis: [
      { method: 'GET', endpoint: '/health', desc: 'Healthcheck do Fastify Gateway', category: 'System' },
      { method: 'GET', endpoint: '/api/v1/models', desc: 'Catálogo de modelos LLM (Qwen, Ollama, DeepSeek)', category: 'Gateway' },
      { method: 'GET', endpoint: '/api/v1/providers', desc: 'Provedores de inferência e status de latência', category: 'Providers' },
      { method: 'GET', endpoint: '/api/v1/keys', desc: 'Gerenciamento de API keys e rate limits', category: 'Security' },
      { method: 'GET', endpoint: '/api/v1/workers', desc: 'Workers distribuídos BullMQ para inferência assíncrona', category: 'Workers' },
      { method: 'GET', endpoint: '/api/v1/metrics', desc: 'Telemetria Prometheus de latência e throughput', category: 'Observability' },
      { method: 'POST', endpoint: '/api/v1/chat/completions', desc: 'Endpoint OpenAI-compatible para inferência de texto', category: 'Inference', defaultBody: '{"model": "qwen2.5:14b", "messages": [{"role": "user", "content": "ping"}]}' }
    ],
    healthUrl: 'http://209.50.241.22:3001/health',
    screens: [
      { id: 'overview', title: 'Visão Geral AI Gateway', route: '/admin/overview', source: 'apps/dashboard/src/pages/Overview' },
      { id: 'providers', title: 'Provedores LLM & Modelos', route: '/admin/providers', source: 'apps/dashboard/src/pages/Providers' },
      { id: 'keys', title: 'Chaves de API & Rate Limits', route: '/admin/keys', source: 'apps/dashboard/src/pages/Keys' },
      { id: 'workers', title: 'BullMQ Workers & Filas', route: '/admin/workers', source: 'apps/dashboard/src/pages/Workers' },
      { id: 'observability', title: 'Latência & Telemetria', route: '/admin/observability', source: 'apps/dashboard/src/pages/Observability' }
    ]
  }
};

function ensureDirs() {
  [DATA_DIR, SCREENSHOTS_PUBLIC, SCREENSHOTS_GRG].forEach(d => {
    if (!fs.existsSync(d)) {
      try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
    }
  });
}

function loadRegistry() {
  ensureDirs();
  if (fs.existsSync(REGISTRY_FILE)) {
    try { return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')); } catch (e) {}
  }
  return { lastUpdated: new Date().toISOString(), totalScreens: 0, verifiedScreens: 0, screens: [] };
}

function saveRegistry(data) {
  ensureDirs();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function loadMirror() {
  ensureDirs();
  if (fs.existsSync(MIRROR_FILE)) {
    try { return JSON.parse(fs.readFileSync(MIRROR_FILE, 'utf8')); } catch (e) {}
  }
  return { lastUpdated: new Date().toISOString(), projects: {} };
}

function saveMirror(data) {
  ensureDirs();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MIRROR_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getGitInfo(repoPath) {
  try {
    const branch = execSync(`git -C ${repoPath} rev-parse --abbrev-ref HEAD 2>/dev/null`, { timeout: 3000 }).toString().trim();
    const lastCommit = execSync(`git -C ${repoPath} log --oneline -1 2>/dev/null`, { timeout: 3000 }).toString().trim();
    const lastDate = execSync(`git -C ${repoPath} log -1 --format=%ci 2>/dev/null`, { timeout: 3000 }).toString().trim();
    return { branch: branch || 'main', lastCommit: lastCommit || null, lastDate: lastDate || null };
  } catch (e) {
    return { branch: 'unknown', lastCommit: null, lastDate: null };
  }
}

async function checkHealth(url) {
  if (!url) return { status: 'UNKNOWN', latencyMs: 0 };
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const latencyMs = Date.now() - start;
    if (res.ok) return { status: 'ONLINE', latencyMs, code: res.status };
    return { status: 'DEGRADED', latencyMs, code: res.status };
  } catch (e) {
    return { status: 'OFFLINE', latencyMs: Date.now() - start, error: e.message };
  }
}

/**
 * Scan a project using Playwright headless Chromium on the VPS
 */
async function scanProjectScreens(projectId) {
  const project = KNOWN_PROJECTS[projectId];
  if (!project) throw new Error(`Unknown project ID: ${projectId}`);

  console.log(`[ProjectMirror] Initiating real Playwright scan for project: ${project.name} (${projectId})...`);
  ensureDirs();

  let playwright;
  try {
    playwright = require('/opt/fenix-os/grg/node_modules/playwright');
  } catch (e) {
    playwright = require('playwright');
  }

  const browser = await playwright.chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const scannedScreens = [];

  try {
    if (projectId === 'fenix-os') {
      // Fênix OS Single Shell Navigation
      console.log(`[ProjectMirror] Navigating Fênix OS at ${project.baseUrl}...`);
      await page.goto(project.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      for (const def of project.screens) {
        console.log(`[ProjectMirror] Scanning Fênix screen: ${def.id} (${def.title})...`);
        const apisCalled = [];

        const requestHandler = req => {
          const u = req.url();
          if (u.includes('/api/')) apisCalled.push({ method: req.method(), url: u });
        };
        page.on('request', requestHandler);

        // Switch to the target view
        await page.evaluate(v => {
          if (typeof window.showView === 'function') {
            window.showView(v);
          } else {
            const btn = document.querySelector(`[data-view="${v}"]`);
            if (btn) btn.click();
          }
        }, def.view);

        await page.waitForTimeout(1200);
        page.off('request', requestHandler);

        // Screenshot filename
        const shotName = `fenix-os_${def.id}.png`;
        const pubShotPath = path.join(SCREENSHOTS_PUBLIC, shotName);
        const grgShotPath = path.join(SCREENSHOTS_GRG, shotName);

        await page.screenshot({ path: pubShotPath });
        try { fs.copyFileSync(pubShotPath, grgShotPath); } catch (e) {}

        // Inspect DOM
        const domAnalysis = await page.evaluate(v => {
          const el = document.getElementById(`view-${v}`) || document.querySelector(`.view.active`);
          if (!el) return { found: false, error: 'Element #view-' + v + ' not found' };

          const buttons = Array.from(el.querySelectorAll('button, .btn, [role="button"]')).map(b => ({
            text: (b.innerText || b.textContent || b.title || '').trim().slice(0, 40),
            id: b.id || null,
            classes: b.className || '',
            hasAction: Boolean(b.getAttribute('onclick') || b.getAttribute('data-action'))
          })).filter(b => b.text.length > 0).slice(0, 20);

          const inputs = Array.from(el.querySelectorAll('input, select, textarea')).map(i => ({
            id: i.id || null,
            name: i.name || null,
            type: i.type || 'text',
            placeholder: i.placeholder || ''
          })).slice(0, 10);

          const cards = el.querySelectorAll('.card, .metric-card, .v10-card, .panel').length;
          const text = (el.innerText || '').trim();

          return {
            found: true,
            visible: window.getComputedStyle(el).display !== 'none',
            childCount: el.children.length,
            buttonsCount: el.querySelectorAll('button, .btn').length,
            inputsCount: inputs.length,
            cardsCount: cards,
            textPreview: text.slice(0, 200),
            hasContent: text.length > 25,
            buttons,
            inputs
          };
        }, def.view);

        const isVerified = domAnalysis.found && domAnalysis.visible && domAnalysis.hasContent;

        const screenRecord = {
          id: `${projectId}_${def.id}`,
          screenId: def.id,
          projectId,
          projectName: project.name,
          title: def.title,
          route: def.route,
          view: def.view,
          sourceFile: def.source,
          screenshotUrl: `/screenshots/projects/${shotName}`,
          status: isVerified ? 'VERIFIED REAL' : 'UNVERIFIED',
          lastVerified: new Date().toISOString(),
          dom: domAnalysis,
          apisCalled: Array.from(new Set(apisCalled.map(a => `${a.method} ${a.url.split('?')[0]}`))).slice(0, 10),
          actionsCount: (domAnalysis.buttons || []).length
        };

        scannedScreens.push(screenRecord);
      }
    } else {
      // General Project Scan (ZapAI CRM or API Platform)
      const health = await checkHealth(project.healthUrl);
      console.log(`[ProjectMirror] Scanning external project: ${project.name}, Health: ${health.status}...`);

      for (const def of project.screens) {
        const shotName = `${projectId}_${def.id}.png`;
        const pubShotPath = path.join(SCREENSHOTS_PUBLIC, shotName);
        const grgShotPath = path.join(SCREENSHOTS_GRG, shotName);

        let isVerified = false;
        let domAnalysis = { found: false, hasContent: false };

        if (health.status === 'ONLINE' || health.status === 'DEGRADED') {
          try {
            const screenUrl = `${project.baseUrl}${def.route}`;
            console.log(`[ProjectMirror] Opening ${screenUrl}...`);
            await page.goto(screenUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(1500);

            await page.screenshot({ path: pubShotPath });
            try { fs.copyFileSync(pubShotPath, grgShotPath); } catch (e) {}

            domAnalysis = await page.evaluate(() => {
              const text = (document.body.innerText || '').trim();
              const buttons = Array.from(document.querySelectorAll('button, .btn')).map(b => (b.innerText || '').trim()).filter(Boolean).slice(0, 15);
              return {
                found: true,
                hasContent: text.length > 30,
                textPreview: text.slice(0, 200),
                buttonsCount: buttons.length,
                buttons
              };
            });
            isVerified = domAnalysis.hasContent;
          } catch (err) {
            console.log(`[ProjectMirror] Warning: Could not navigate ${def.route}: ${err.message}`);
          }
        }

        const screenRecord = {
          id: `${projectId}_${def.id}`,
          screenId: def.id,
          projectId,
          projectName: project.name,
          title: def.title,
          route: def.route,
          sourceFile: def.source,
          screenshotUrl: fs.existsSync(pubShotPath) ? `/screenshots/projects/${shotName}` : null,
          status: isVerified ? 'VERIFIED REAL' : 'UNVERIFIED',
          lastVerified: new Date().toISOString(),
          dom: domAnalysis,
          actionsCount: (domAnalysis.buttons || []).length
        };

        scannedScreens.push(screenRecord);
      }
    }
  } finally {
    await browser.close();
  }

  // Update Registry & Mirror Stores
  const registry = loadRegistry();
  // Filter out previous screens of this project and append new
  registry.screens = registry.screens.filter(s => s.projectId !== projectId).concat(scannedScreens);
  registry.totalScreens = registry.screens.length;
  registry.verifiedScreens = registry.screens.filter(s => s.status === 'VERIFIED REAL').length;
  saveRegistry(registry);

  const mirror = loadMirror();
  const git = getGitInfo(project.vpsPath);
  const health = await checkHealth(project.healthUrl);

  mirror.projects[projectId] = {
    ...project,
    git,
    health,
    screensCount: scannedScreens.length,
    verifiedCount: scannedScreens.filter(s => s.status === 'VERIFIED REAL').length,
    lastScanned: new Date().toISOString()
  };
  saveMirror(mirror);

  console.log(`[ProjectMirror] Scan finished for ${project.name}: ${scannedScreens.length} screens scanned, ${scannedScreens.filter(s => s.status === 'VERIFIED REAL').length} verified real.`);
  return { projectId, screens: scannedScreens };
}

/**
 * Full ecosystem scan of all projects
 */
async function scanAll() {
  console.log('[ProjectMirror] Starting full ecosystem scan...');
  const results = {};
  for (const pid of Object.keys(KNOWN_PROJECTS)) {
    try {
      results[pid] = await scanProjectScreens(pid);
    } catch (e) {
      console.error(`[ProjectMirror] Error scanning ${pid}:`, e.message);
      results[pid] = { error: e.message };
    }
  }
  return results;
}

/**
 * Get full project mirror status for API
 */
async function getProjectsMirrorData() {
  const registry = loadRegistry();
  const mirror = loadMirror();
  const projectsList = [];

  for (const [pid, def] of Object.entries(KNOWN_PROJECTS)) {
    const cached = mirror.projects[pid] || {};
    const git = cached.git || getGitInfo(def.vpsPath);
    const health = await checkHealth(def.healthUrl);
    const projectScreens = registry.screens.filter(s => s.projectId === pid);
    const screensList = projectScreens.length > 0 ? projectScreens : (def.screens || []).map(s => ({
      ...s,
      projectId: pid,
      screenId: s.id,
      title: s.title || s.id,
      route: s.route || '#/' + s.id,
      sourceFile: s.source || s.sourceFile || '',
      status: 'DISCOVERED'
    }));

    projectsList.push({
      ...def,
      apis: def.apis || [],
      components: def.components || [],
      git,
      health,
      screensCount: def.screens ? def.screens.length : 0,
      scannedScreensCount: projectScreens.length,
      verifiedScreensCount: projectScreens.filter(s => s.status === 'VERIFIED REAL').length,
      screens: screensList,
      lastScanned: cached.lastScanned || null
    });
  }

  return {
    ok: true,
    totalProjects: projectsList.length,
    totalScreens: registry.screens.length,
    verifiedScreens: registry.screens.filter(s => s.status === 'VERIFIED REAL').length,
    projects: projectsList
  };
}

/**
 * Inspect single screen details
 */
function inspectScreen(screenId) {
  const registry = loadRegistry();
  const screen = registry.screens.find(s => s.id === screenId || s.screenId === screenId);
  if (!screen) return { ok: false, error: 'Screen not found' };
  return { ok: true, screen };
}

module.exports = {
  KNOWN_PROJECTS,
  scanProjectScreens,
  scanAll,
  getProjectsMirrorData,
  loadRegistry,
  inspectScreen
};

if (require.main === module) {
  const cmd = process.argv[2] || 'all';
  if (cmd === 'all') {
    scanAll().then(r => console.log('Scan complete:', Object.keys(r)));
  } else {
    scanProjectScreens(cmd).then(r => console.log('Project scan complete:', r.screens.length, 'screens'));
  }
}

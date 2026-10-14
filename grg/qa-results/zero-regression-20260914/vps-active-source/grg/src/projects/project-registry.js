'use strict';
/**
 * FÊNIX OS V8.3 — Universal Project Registry & Intelligence Store
 * Single source of truth for all ecosystem projects.
 * Supports multi-project querying, Git metadata, services, pages, APIs, health scoring,
 * dynamic project registration, favorites, and recent history tracking.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const CANONICAL_PROJECTS = [
  {
    id: 'fenix-os',
    projectId: 'fenix-os',
    name: 'FÊNIX OS',
    displayName: 'FÊNIX HQ',
    organization: 'GRG AI Systems',
    description: 'Autonomous Engineering OS — Orchestrator, Memory, Agents, City, Dual-Lane Fast Engine',
    repository: 'https://github.com/Biel0071/AI-ENGINE.git',
    github: 'Biel0071/AI-ENGINE',
    branch: 'master',
    localPath: 'C:\\projetos\\ai-engine-core',
    vpsPath: '/opt/fenix-os',
    productionPath: '/opt/fenix-os/grg',
    frontend: {
      framework: 'Vanilla ES6 + PixiJS 8 (Isometric 2.5D)',
      path: '/opt/fenix-os/public',
      port: 3000,
      entry: 'index.html',
      pagesCount: 8,
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Native HTTP Kernel + WebSocket',
      path: '/opt/fenix-os/grg/src',
      port: 4410,
      pm2Name: 'fenix-backend',
    },
    database: {
      primary: 'PostgreSQL 17 (port 5432)',
      cache: 'Redis 7.2 (port 6379)',
      vector: 'Qdrant (port 6333)',
      objectStorage: 'MinIO (port 9000)',
    },
    services: ['orchestrator', 'fast-lane', 'job-queue', 'memory', 'agents', 'city', 'redis', 'postgres', 'ollama', 'qdrant'],
    apis: ['/api/login', '/api/v2/conversation', '/api/v2/models', '/api/v2/jobs', '/api/v2/projects', '/api/v2/city/state', '/api/v2/events/stream'],
    pages: ['/', '/#city', '/#projects', '/#orchestrator', '/#jobs', '/#ide', '/#cockpit', '/#connections'],
    routes: ['/api/v2/conversation', '/api/v2/models', '/api/v2/jobs', '/api/v2/projects-registry', '/api/v2/events/stream'],
    components: ['CityCanvas', 'FastLaneBar', 'JobQueueDrawer', 'VisualIDE', 'MonacoEditor', 'CommandCenter', 'TerminalEmulator'],
    tests: ['test_v82_verification.js', 'test-autonomous-dev-maturity.js', 'test-real-product-validation.js'],
    deployment: {
      type: 'pm2',
      processId: 16,
      port: 4410,
      containerPort: 4400,
      sslDomain: 'fenix.209-50-241-22.sslip.io',
    },
    health: 'http://127.0.0.1:4410/health',
    status: 'ONLINE',
    agents: ['Gabriel', 'Lucas', 'Sofia', 'Rafael', 'Beatriz', 'Bruno', 'Clara', 'Thiago', 'Elena'],
    jobs: { queue: 'fenix-jobs', concurrency: 2 },
    knowledge: { qdrantCollection: 'fenix_knowledge' },
    memory: { redis: 'fenix-memory' },
    currentVersion: '8.3.0',
    color: '#4488ff',
    palette: ['#4488ff', '#ffd700', '#001133'],
    buildingType: 'headquarters',
    icon: '🏛️',
    tags: ['core', 'ai', 'orchestrator', 'fast-lane', 'city'],
  },
  {
    id: 'zapai-crm',
    projectId: 'zapai-crm',
    name: 'ZapAI CRM',
    displayName: 'ZapAI Tower',
    organization: 'Biel0071 SaaS',
    description: 'CRM Conversacional — WhatsApp Multi-Device, Campanhas, Inbox Omnichannel, Automações',
    repository: 'https://github.com/Biel0071/ZAPAI-FINAL.git',
    github: 'Biel0071/ZAPAI-FINAL',
    branch: 'main',
    localPath: 'C:\\projetos\\ZAPAI-FINAL',
    vpsPath: '/opt/zapai',
    productionPath: '/opt/zapai',
    frontend: {
      framework: 'React 18 + Vite + TypeScript + Tailwind CSS',
      path: '/opt/zapai/frontend-official',
      port: 4025,
      entry: 'src/main.tsx',
      pagesCount: 23,
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Express + Socket.IO + Baileys',
      path: '/opt/zapai/backend',
      port: 4025,
      pm2Name: 'zapflow-api',
    },
    database: {
      primary: 'PostgreSQL / SQLite',
      cache: 'Redis',
    },
    services: ['crm', 'whatsapp', 'whatsapp-gateway', 'campaigns', 'inbox', 'contacts', 'analytics', 'flows', 'quick-replies'],
    apis: ['/api/whatsapp', '/api/messages', '/api/conversations', '/api/contacts', '/api/campaignDispatch', '/api/automation', '/api/sessions'],
    pages: ['/dashboard', '/inbox', '/contacts', '/campaigns', '/connections', '/flows', '/analytics', '/ai', '/settings', '/queue', '/operations'],
    routes: ['/api/whatsapp', '/api/messages', '/api/conversations', '/api/contacts', '/api/campaignDispatch'],
    components: ['ActiveChatPane', 'ChatListPanel', 'ConversationRow', 'FlowExecutionBanner', 'MessageRow', 'QuickResponseModal', 'SidebarPanel'],
    tests: ['frontend-official/tests/ui/hardening-stress.spec.ts', 'scripts/run-e2e-smoke.js'],
    deployment: {
      type: 'pm2',
      processId: 0,
      port: 4025,
    },
    health: 'http://127.0.0.1:4025/api/health',
    status: 'ONLINE',
    agents: ['Lucas', 'Sofia', 'Rafael', 'Beatriz'],
    jobs: { queue: 'zapflow-messages' },
    knowledge: { domain: 'whatsapp-crm' },
    memory: { contextKey: 'zapai-conversations' },
    currentVersion: '1.0.0',
    color: '#e67e22',
    palette: ['#e67e22', '#e74c3c', '#1a0500'],
    buildingType: 'crm-tower',
    icon: '📱',
    tags: ['crm', 'whatsapp', 'saas', 'react', 'tailwind'],
  },
  {
    id: 'api-platform',
    projectId: 'api-platform',
    name: 'API Platform',
    displayName: 'AI Platform Tower',
    organization: 'Biel0071 Systems',
    description: 'Multi-Provider AI Engine — Qwen 2.5, Ollama, BullMQ Workers, Image Processing & Telemetry',
    repository: 'https://github.com/Biel0071/API-PLATAFORM.git',
    github: 'Biel0071/API-PLATAFORM',
    branch: 'main',
    localPath: 'C:\\projetos\\ai-engine-core\\projects\\API-PLATAFORM',
    vpsPath: '/opt/grg-fenix/workspaces/AI-PLATFORM',
    productionPath: '/opt/grg-fenix/workspaces/AI-PLATFORM/apps/api',
    frontend: {
      framework: 'Vanilla JS / Dashboard Static',
      path: '/opt/grg-fenix/workspaces/AI-PLATFORM/apps/dashboard',
      port: 8081,
      entry: 'public/index.html',
      pagesCount: 7,
    },
    backend: {
      runtime: 'Node.js 22',
      framework: 'Fastify + TypeScript + Prisma ORM',
      path: '/opt/grg-fenix/workspaces/AI-PLATFORM/apps/api',
      port: 3001,
      dockerContainer: 'api-platform-api-1',
    },
    database: {
      primary: 'PostgreSQL 16 (port 5433, container api-platform-postgres-1)',
      cache: 'Redis 7 (port 6380, container api-platform-redis-1)',
    },
    services: ['ai-gateway', 'qwen-provider', 'ollama-bridge', 'bullmq-workers', 'image-generator', 'observability', 'reverse-poller'],
    apis: ['/v1/text', '/v1/chat', '/v1/memory', '/admin/overview', '/admin/providers', '/admin/keys', '/admin/workflows', '/admin/observability'],
    pages: ['/overview', '/providers', '/keys', '/workflows', '/observability', '/images', '/prompts'],
    routes: ['/v1/text', '/v1/chat', '/admin/providers', '/admin/keys', '/admin/observability'],
    components: ['OverviewWidget', 'ProviderCard', 'KeyManager', 'WorkflowTimeline', 'ObservabilityGrid', 'ImageGallery'],
    tests: ['tests/api.test.ts', 'tests/worker.test.ts'],
    deployment: {
      type: 'docker-compose',
      containers: ['api-platform-api-1', 'api-platform-dashboard-1', 'api-platform-worker-1', 'api-platform-postgres-1', 'api-platform-redis-1'],
      port: 3001,
      dashboardPort: 8081,
    },
    health: 'http://209.50.241.22:3001/health',
    status: 'ONLINE',
    agents: ['Sofia', 'Gabriel', 'Rafael', 'Bruno'],
    jobs: { queue: 'api-platform-tasks', workers: ['image-worker', 'text-worker'] },
    knowledge: { domain: 'llm-infrastructure' },
    memory: { vector: 'qdrant' },
    currentVersion: '1.2.0',
    color: '#9b59b6',
    palette: ['#9b59b6', '#2ecc71', '#0a0015'],
    buildingType: 'tower',
    icon: '🤖',
    tags: ['ai', 'api', 'provider', 'fastify', 'docker', 'qwen'],
  },
  {
    id: 'ai-engine',
    projectId: 'ai-engine',
    name: 'AI Engine Core',
    displayName: 'Genomic Lab',
    organization: 'Biel0071 Core',
    description: '4-DNA Genomic Architecture, Digital Twin & Living Organism Baseline',
    repository: 'https://github.com/Biel0071/AI-ENGINE.git',
    github: 'Biel0071/AI-ENGINE',
    branch: 'FENIX_GOLDEN_BASELINE',
    localPath: 'C:\\projetos\\ai-engine-core\\ai-engine',
    vpsPath: '/opt/AI-ENGINE',
    productionPath: '/opt/AI-ENGINE',
    frontend: {
      framework: 'PixiJS + HTML5 Canvas',
      path: '/opt/AI-ENGINE/public',
      port: 3000,
      pagesCount: 5,
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Fênix Core Engine',
      path: '/opt/AI-ENGINE',
      port: null,
    },
    database: {
      primary: 'SQLite / JSON',
    },
    services: ['digital-twin', 'genome-builder', 'visual-ide', 'mind'],
    apis: ['/api/v2/dna', '/api/v2/digital-twin'],
    pages: ['/ide', '/twin', '/genome'],
    routes: ['/api/v2/dna'],
    components: ['GenomeVisualizer', 'TwinInspector'],
    tests: ['test/genome.test.js'],
    deployment: { type: 'library' },
    health: null,
    status: 'ONLINE',
    agents: ['Gabriel', 'Elena'],
    jobs: {},
    knowledge: { domain: 'genomics' },
    memory: {},
    currentVersion: '1.0.0',
    color: '#1abc9c',
    palette: ['#1abc9c', '#16a085', '#002b24'],
    buildingType: 'lab',
    icon: '🧬',
    tags: ['dna', 'twin', 'engine'],
  },
];

const DATA_DIR = path.join(__dirname, '..', '.data');
const CUSTOM_PROJECTS_FILE = path.join(DATA_DIR, 'custom_projects.json');
const FAVORITES_FILE = path.join(DATA_DIR, 'project_favorites.json');
const RECENTS_FILE = path.join(DATA_DIR, 'project_recents.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadCustomProjects() {
  ensureDataDir();
  try {
    if (fs.existsSync(CUSTOM_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_PROJECTS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveCustomProjects(projs) {
  ensureDataDir();
  try {
    fs.writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(projs, null, 2), 'utf8');
  } catch (e) {}
}

function loadFavorites() {
  ensureDataDir();
  try {
    if (fs.existsSync(FAVORITES_FILE)) {
      return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8'));
    }
  } catch (e) {}
  return ['zapai-crm', 'fenix-os'];
}

function saveFavorites(favs) {
  ensureDataDir();
  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favs, null, 2), 'utf8');
  } catch (e) {}
}

function loadRecents() {
  ensureDataDir();
  try {
    if (fs.existsSync(RECENTS_FILE)) {
      return JSON.parse(fs.readFileSync(RECENTS_FILE, 'utf8'));
    }
  } catch (e) {}
  return ['zapai-crm', 'fenix-os', 'api-platform'];
}

function saveRecents(recents) {
  ensureDataDir();
  try {
    fs.writeFileSync(RECENTS_FILE, JSON.stringify(recents, null, 2), 'utf8');
  } catch (e) {}
}

function getGitInfo(vpsPath) {
  try {
    const branch = execSync('git -C ' + vpsPath + ' rev-parse --abbrev-ref HEAD 2>/dev/null', { timeout: 3000 }).toString().trim();
    const lastCommit = execSync('git -C ' + vpsPath + ' log --oneline -1 2>/dev/null', { timeout: 3000 }).toString().trim();
    const lastSync = execSync('git -C ' + vpsPath + ' log -1 --format=%ci 2>/dev/null', { timeout: 3000 }).toString().trim();
    const lastDate = execSync('git -C ' + vpsPath + ' log -1 --format=%ct 2>/dev/null', { timeout: 3000 }).toString().trim();
    return { branch: branch || 'main', lastCommit: lastCommit || null, lastSync: lastSync || null, lastCommitEpoch: parseInt(lastDate || '0', 10) };
  } catch (e) {
    return { branch: 'unknown', lastCommit: null, lastSync: null, lastCommitEpoch: 0 };
  }
}

function countFiles(dir, ext) {
  try {
    const cmd = ext
      ? 'find ' + dir + ' -name "*.' + ext + '" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l'
      : 'find ' + dir + ' -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l';
    return parseInt(execSync(cmd, { timeout: 5000 }).toString().trim(), 10);
  } catch (e) {
    return 0;
  }
}

function getActivityGroup(lastCommitEpoch) {
  if (!lastCommitEpoch) return 'active-14d'; // Default recently active if repository current
  const daysAgo = (Date.now() / 1000 - lastCommitEpoch) / (24 * 3600);
  if (daysAgo <= 14) return 'active-14d';
  if (daysAgo <= 60) return 'active-60d';
  return 'inactive-60d';
}

function getProjectSnapshot(project) {
  const targetPath = project.vpsPath || project.localPath;
  const gitInfo = targetPath ? getGitInfo(targetPath) : {};
  const fileCount = fs.existsSync(targetPath) ? countFiles(targetPath, null) : (project.frontend?.pagesCount || 15);
  const jsCount = fs.existsSync(targetPath) ? countFiles(targetPath, 'js') : 0;
  const tsCount = fs.existsSync(targetPath) ? countFiles(targetPath, 'ts') : 0;

  const activityGroup = getActivityGroup(gitInfo.lastCommitEpoch);
  const favorites = loadFavorites();
  const isFavorite = favorites.includes(project.id) || favorites.includes(project.projectId);

  // Check if screenshot exists
  const pid = project.id || project.projectId;
  const ssFile = `/opt/fenix-os/public/screenshots/${pid}_screenshot.png`;
  const hasScreenshot = fs.existsSync(ssFile);
  const screenshotUrl = hasScreenshot ? `/screenshots/${pid}_screenshot.png` : null;

  return Object.assign({}, project, gitInfo, {
    metrics: { totalFiles: fileCount, jsFiles: jsCount, tsFiles: tsCount },
    lastUpdated: new Date().toISOString(),
    activityGroup,
    isFavorite,
    screenshotUrl
  });
}

async function checkHealth(project) {
  if (!project.health) return 'UNKNOWN';
  try {
    const res = await fetch(project.health, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return 'ONLINE';
    return 'DEGRADED';
  } catch (e) {
    return 'OFFLINE';
  }
}

function computeHealthScore(p, healthStatus) {
  let score = 30;
  if (healthStatus === 'ONLINE') score += 40;
  else if (healthStatus === 'DEGRADED') score += 20;

  if (p.metrics?.totalFiles > 50) score += 15;
  else if (p.metrics?.totalFiles > 10) score += 8;

  if ((p.apis || []).length > 3) score += 5;
  if ((p.components || []).length > 3) score += 5;
  if (p.branch && p.branch !== 'unknown') score += 5;

  return Math.min(score, 98);
}

function getAllConfiguredProjects() {
  const custom = loadCustomProjects();
  const all = [...CANONICAL_PROJECTS];
  for (const c of custom) {
    if (!all.some(p => (p.id === c.id || p.projectId === c.projectId))) {
      all.push(c);
    }
  }
  return all;
}

async function getAllProjects() {
  const allConfigured = getAllConfiguredProjects();
  const results = [];
  for (const p of allConfigured) {
    const snapshot = getProjectSnapshot(p);
    const healthStatus = await checkHealth(p).catch(function() { return 'UNKNOWN'; });
    const healthScore = computeHealthScore(snapshot, healthStatus);
    results.push(Object.assign({}, snapshot, {
      runtimeStatus: healthStatus,
      healthScore,
      health: snapshot.health
    }));
  }
  return results;
}

function getProjectById(id) {
  if (!id) return null;
  const lower = id.toLowerCase();
  const all = getAllConfiguredProjects();
  return all.find(function(p) {
    return p.id === id
      || p.projectId === id
      || p.id.toLowerCase() === lower
      || (p.projectId && p.projectId.toLowerCase() === lower)
      || p.name.toLowerCase().includes(lower)
      || (p.displayName && p.displayName.toLowerCase().includes(lower));
  }) || null;
}

function registerProject(data) {
  if (!data || !data.name) throw new Error('Project name is required');
  const id = (data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/-+/g, '-').replace(/^-|-$/g, '');

  const existing = getProjectById(id);
  if (existing) throw new Error(`Project with ID ${id} already exists`);

  const vpsPath = data.vpsPath || data.path || `/opt/${id}`;
  if (!fs.existsSync(vpsPath)) {
    throw new Error(`Directory does not exist on host: ${vpsPath}`);
  }

  const newProject = {
    id,
    projectId: id,
    name: data.name,
    displayName: data.displayName || data.name,
    organization: data.organization || 'Custom Projects',
    description: data.description || `Registered custom project: ${data.name}`,
    repository: data.repository || null,
    github: data.github || null,
    branch: data.branch || 'main',
    vpsPath,
    localPath: data.localPath || vpsPath,
    frontend: {
      framework: data.frontendFramework || 'Auto-Detected',
      path: path.join(vpsPath, 'frontend'),
      port: data.frontendPort || null,
    },
    backend: {
      runtime: 'Node.js',
      framework: data.backendFramework || 'Auto-Detected',
      path: path.join(vpsPath, 'backend'),
      port: data.backendPort || null,
    },
    database: { primary: data.database || 'PostgreSQL / SQLite' },
    services: data.services || ['core'],
    apis: data.apis || [],
    pages: data.pages || ['/'],
    components: data.components || [],
    status: 'ONLINE',
    agents: ['Gabriel', 'Lucas'],
    color: data.color || '#38bdf8',
    icon: data.icon || '📦',
    tags: data.tags || ['custom', 'local'],
    registeredAt: new Date().toISOString()
  };

  const custom = loadCustomProjects();
  custom.push(newProject);
  saveCustomProjects(custom);

  return newProject;
}

function toggleFavorite(projectId) {
  const favs = loadFavorites();
  const idx = favs.indexOf(projectId);
  let isFav = false;
  if (idx >= 0) {
    favs.splice(idx, 1);
    isFav = false;
  } else {
    favs.push(projectId);
    isFav = true;
  }
  saveFavorites(favs);
  return { ok: true, projectId, isFavorite: isFav, favorites: favs };
}

function touchRecent(projectId) {
  let recents = loadRecents();
  recents = recents.filter(r => r !== projectId);
  recents.unshift(projectId);
  if (recents.length > 8) recents = recents.slice(0, 8);
  saveRecents(recents);
  return recents;
}

function getProjectsByService(serviceName) {
  if (!serviceName) return [];
  const lower = serviceName.toLowerCase();
  return getAllConfiguredProjects().filter(p => (p.services || []).some(s => s.toLowerCase().includes(lower)));
}

function getProjectsByStack(tech) {
  if (!tech) return [];
  const lower = tech.toLowerCase();
  return getAllConfiguredProjects().filter(p =>
    (p.tags || []).some(t => t.toLowerCase().includes(lower)) ||
    (p.frontend && p.frontend.framework.toLowerCase().includes(lower)) ||
    (p.backend && p.backend.framework.toLowerCase().includes(lower))
  );
}

module.exports = {
  PROJECTS: CANONICAL_PROJECTS,
  getAllProjects,
  getProjectById,
  getProjectSnapshot,
  getProjectsByService,
  getProjectsByStack,
  checkHealth,
  registerProject,
  toggleFavorite,
  touchRecent,
  loadFavorites,
  loadRecents,
  computeHealthScore
};

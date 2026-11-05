'use strict';
/**
 * FÊNIX OS V8.3 — Universal Project Registry
 * Single source of truth for all ecosystem projects.
 * Supports multi-project querying, Git metadata, services, pages, APIs, and health.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECTS = [
  {
    id: 'fenix-os',
    projectId: 'fenix-os',
    aliases: ['ai-engine', 'ai-engine-core', 'AI Engine Core', 'Fênix OS'],
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
      framework: 'Vanilla ES modules + Three.js WebGL / Canvas 2D fallback',
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
    capabilities: ['orchestrator', 'fast-lane', 'job-queue', 'memory', 'agents', 'city', 'digital-twin', 'genome-builder', 'visual-ide', 'mind'],
    services: ['orchestrator', 'fast-lane', 'job-queue', 'memory', 'agents', 'city', 'digital-twin', 'genome-builder', 'visual-ide', 'mind', 'redis', 'postgres', 'ollama', 'qdrant'],
    apis: ['/api/login', '/api/v2/conversation', '/api/v2/models', '/api/v2/jobs', '/api/v2/projects', '/api/v2/city/state', '/api/v2/events/stream'],
    pages: ['/', '/#city', '/#projects', '/#orchestrator', '/#jobs', '/#ide', '/#cockpit', '/#connections'],
    routes: ['/api/v2/conversation', '/api/v2/models', '/api/v2/jobs', '/api/v2/projects-registry', '/api/v2/events/stream'],
    components: ['CityCanvas', 'FastLaneBar', 'JobQueueDrawer', 'VisualIDE', 'MonacoEditor', 'CommandCenter', 'TerminalEmulator'],
    tests: ['test_v82_verification.js', 'test-autonomous-dev-maturity.js', 'test-real-product-validation.js'],
    deployment: {
      type: 'pm2',
      processId: 16,
      port: 4410,
      sslDomain: 'fenix.209-50-241-22.sslip.io',
      bindings: [
        { label: 'Entrada principal HTTPS', address: '443', port: 443, target: 'OpenResty → 127.0.0.1:3000', url: 'https://209.50.241.22/' },
        { label: 'Frontend gateway direto', address: '0.0.0.0', port: 3000, target: 'frontend-gateway.js', url: 'http://209.50.241.22:3000/app' },
      ],
    },
    health: 'http://localhost:4410/health',
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
    tags: ['core', 'ai', 'orchestrator', 'fast-lane', 'city', 'dna', 'twin', 'engine'],
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
      servedPath: '/www/zapai',
      port: 1000,
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
    services: ['crm', 'whatsapp-gateway', 'campaigns', 'inbox', 'contacts', 'analytics', 'flows', 'quick-replies'],
    apis: ['/api/whatsapp', '/api/messages', '/api/conversations', '/api/contacts', '/api/campaignDispatch', '/api/automation', '/api/sessions'],
    pages: ['/dashboard', '/inbox', '/contacts', '/campaigns', '/connections', '/flows', '/analytics', '/ai', '/settings', '/queue', '/operations'],
    routes: ['/api/whatsapp', '/api/messages', '/api/conversations', '/api/contacts', '/api/campaignDispatch'],
    components: ['ActiveChatPane', 'ChatListPanel', 'ConversationRow', 'FlowExecutionBanner', 'MessageRow', 'QuickResponseModal', 'SidebarPanel'],
    tests: ['frontend-official/tests/ui/hardening-stress.spec.ts', 'scripts/run-e2e-smoke.js'],
    deployment: {
      type: 'pm2',
      processId: 0,
      port: 1000,
      backendPort: 4025,
      bindings: [
        { label: 'Frontend HTTPS', address: '0.0.0.0', port: 1000, target: 'OpenResty TLS → /www/zapai', url: 'https://209.50.241.22:1000/' },
        { label: 'API health', address: '0.0.0.0', port: 4025, target: '/health', url: 'http://209.50.241.22:4025/health' },
      ],
    },
    health: 'http://localhost:4025/health',
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
    branch: 'fenix/fenix-ide-20261009',
    localPath: 'C:\\projetos\\ai-engine-core\\projects\\API-PLATAFORM',
    vpsPath: '/app/workspaces/api-platform',
    productionPath: '/app/workspaces/api-platform/apps/api',
    frontend: {
      framework: 'Vanilla JS / Dashboard Static',
      path: '/app/workspaces/api-platform/apps/dashboard',
      port: 8081,
      entry: 'public/index.html',
      pagesCount: 7,
    },
    backend: {
      runtime: 'Node.js 22',
      framework: 'Fastify + TypeScript + Prisma ORM',
      path: '/app/workspaces/api-platform/apps/api',
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
      bindings: [
        { label: 'API Platform health', address: '209.50.241.22', port: 3001, target: 'api-platform-api-1:3000', url: 'http://209.50.241.22:3001/health' },
        { label: 'Dashboard', address: '0.0.0.0', port: 8081, target: 'api-platform-dashboard-1:80', url: 'http://209.50.241.22:8081/' },
      ],
    },
    health: 'http://localhost:3001/health',
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
    id: 'mf-atacadista',
    projectId: 'mf-atacadista',
    name: 'MF Atacadista',
    displayName: 'Mania Fashion Pavilion',
    organization: 'Mania Fashion Atacado',
    description: 'E-commerce B2B de Moda Feminina — Grade Atacado, Provador Virtual IA, Catálogo Inteligente, AllowPay e Orçamentos',
    repository: 'https://github.com/Biel0071/formalize-magic-ddaf0047.git',
    github: 'Biel0071/formalize-magic-ddaf0047',
    branch: 'main',
    localPath: 'C:\\Users\\Dell\\Documents\\antigravity\\charming-einstein',
    vpsPath: '/opt/mf-atacadista',
    productionPath: '/opt/mf-atacadista',
    frontend: {
      framework: 'React 18 + Vite + TypeScript + Tailwind CSS + Radix UI',
      path: 'C:\\Users\\Dell\\Documents\\antigravity\\charming-einstein',
      port: 5173,
      entry: 'src/main.tsx',
      pagesCount: 38,
    },
    backend: {
      runtime: 'Node.js / Supabase Edge Functions',
      framework: 'REST API + Edge Functions (fashion-virtual-tryon, allowpay, tracking)',
      port: 54321,
    },
    database: {
      primary: 'PostgreSQL / Supabase',
    },
    services: ['catalog', 'try-on-ai', 'bulk-image-search', 'creative-studio-ai', 'higgsfield-video-engine', 'adobe-psd-bridge', 'orders', 'wholesale-rules', 'allowpay', 'tracking'],
    apis: ['/api/products', '/api/orders', '/api/banners', '/api/fashion-virtual-tryon', '/api/allowpay', '/api/v2/creative-studio/stack', '/api/v2/creative-studio/export/psd', '/api/v2/creative-studio/export/premiere-xml'],
    pages: [
      '/', '/loja', '/loja/:slug', '/produto/:slug', '/carrinho', '/checkout',
      '/ofertas', '/pedidos', '/conta', '/rastreio/:id', '/fashion/try-on',
      '/admin/dashboard', '/admin/produtos', '/admin/produtos/novo', '/admin/produtos/imagens',
      '/admin/estudio-criativo', '/admin/pedidos', '/admin/banners', '/admin/clientes', '/admin/inteligencia'
    ],
    routes: ['/api/products', '/api/orders', '/api/banners', '/api/fashion-virtual-tryon', '/api/allowpay', '/api/v2/creative-studio/stack'],
    components: ['StoreHome', 'StoreCatalog', 'ProductPage', 'FashionTryOn', 'AdminCreativeStudio', 'AdminBulkImageSearch', 'AdminOrders', 'AdminProductsList'],
    tests: ['tests/e2e-smoke.spec.ts'],
    deployment: { type: 'vite-spa', port: 5173 },
    health: 'http://localhost:5173/',
    status: 'ONLINE',
    agents: ['Camila', 'Beatriz', 'Sofia', 'Lucas'],
    jobs: { queue: 'mf-image-jobs', workers: ['fashion-worker'] },
    knowledge: { domain: 'fashion-wholesale-ecommerce' },
    memory: { contextKey: 'mf-atacadista-context' },
    currentVersion: '2.5.0',
    color: '#e84393',
    palette: ['#e84393', '#fd79a8', '#2d3436'],
    buildingType: 'fashion-pavilion',
    icon: '👗',
    tags: ['ecommerce', 'atacado', 'fashion', 'try-on-ai', 'creative-studio', 'react', 'tailwind'],
  },
  {
    id: 'dview',
    projectId: 'dview',
    name: 'DroidView MDM',
    displayName: 'DroidView Support Tower',
    organization: 'Biel0071 Mobility',
    description: 'Sistema de Suporte Remoto Consentido e Gestão Administrativa de Dispositivos Android (MDM, MediaProjection, QR Pairing, Electron Admin & Kotlin Agent)',
    repository: 'https://github.com/Biel0071/dview.git',
    github: 'Biel0071/dview',
    branch: 'main',
    localPath: 'C:\\projetos\\dview',
    vpsPath: '/opt/dview',
    productionPath: '/opt/dview',
    frontend: {
      framework: 'React 18 + TypeScript + Vite + Electron Desktop',
      path: 'C:\\projetos\\dview\\apps\\web-panel',
      port: 5174,
      entry: 'src/main.tsx',
      pagesCount: 6,
    },
    backend: {
      runtime: 'Node.js 20 + TypeScript',
      framework: 'Fastify + Socket.IO + JWT + 2FA',
      path: 'C:\\projetos\\dview\\apps\\backend',
      port: 3333,
    },
    database: {
      primary: 'SQLite / In-Memory Store',
    },
    services: ['remote-support', 'android-mdm', 'media-projection', 'apk-pairing-qr', 'apps-manager', 'audit-logs', 'electron-admin'],
    apis: ['/api/auth/login', '/api/auth/2fa', '/api/devices', '/api/sessions', '/api/apps', '/api/pairing/qr', '/api/audit'],
    pages: ['/login', '/dashboard', '/devices', '/remote-session', '/apps-manager', '/apk-generator', '/audit-logs'],
    routes: ['/api/auth/login', '/api/devices', '/api/sessions', '/api/pairing/qr', '/api/audit'],
    components: ['DeviceDashboard', 'RemoteScreenViewer', 'AppsManager', 'ApkQrGenerator', 'AuditLogTable', 'ConsentBanner'],
    tests: ['apps/backend/test', 'apps/web-panel/test'],
    deployment: { type: 'docker-compose', port: 8080 },
    health: 'http://localhost:3333/health',
    status: 'ONLINE',
    agents: ['Rafael', 'Lucas', 'Thiago'],
    jobs: { queue: 'dview-sessions' },
    knowledge: { domain: 'android-mdm-remote-support' },
    memory: { contextKey: 'dview-devices' },
    currentVersion: '0.1.0',
    color: '#10b981',
    palette: ['#10b981', '#059669', '#022c22'],
    buildingType: 'tower',
    icon: '📲',
    tags: ['android', 'mdm', 'remote-support', 'kotlin', 'electron', 'fastify', 'react'],
  },
  {
    id: 'task-board',
    projectId: 'task-board',
    name: 'Task Board Ops',
    displayName: 'Task Board Hub',
    organization: 'GRG AI Systems',
    description: 'Microserviço de Quadros Operacionais Kanban, Sprints e Sincronização de Tarefas com Missões do Fênix OS',
    repository: 'https://github.com/Biel0071/AI-ENGINE.git',
    github: 'Biel0071/AI-ENGINE',
    branch: 'master',
    localPath: 'C:\\projetos\\ai-engine-core\\projects\\task-board',
    vpsPath: '/opt/fenix-os/projects/task-board',
    productionPath: '/opt/fenix-os/projects/task-board',
    frontend: {
      framework: 'Vanilla ES6 Kanban UI',
      path: 'C:\\projetos\\ai-engine-core\\projects\\task-board\\public',
      port: 4100,
      entry: 'index.html',
      pagesCount: 2,
    },
    backend: {
      runtime: 'Node.js 20',
      framework: 'Express / Native HTTP REST',
      path: 'C:\\projetos\\ai-engine-core\\projects\\task-board\\src',
      port: 4100,
    },
    database: {
      primary: 'JSON Persistent Store',
    },
    services: ['kanban-board', 'task-sync', 'sprint-tracker'],
    apis: ['/api/tasks', '/api/boards', '/api/health'],
    pages: ['/', '/board'],
    routes: ['/api/tasks', '/api/boards'],
    components: ['KanbanBoard', 'TaskCard', 'SprintHeader'],
    tests: ['tests/tasks.test.js'],
    deployment: { type: 'service', port: 4100 },
    health: null,
    status: 'ONLINE',
    agents: ['Beatriz', 'Clara'],
    jobs: { queue: 'task-board-sync' },
    knowledge: { domain: 'project-management' },
    memory: { contextKey: 'task-board-state' },
    currentVersion: '1.0.0',
    color: '#38bdf8',
    palette: ['#38bdf8', '#0284c7', '#082f49'],
    buildingType: 'lab',
    icon: '📋',
    tags: ['kanban', 'tasks', 'operations', 'microservice'],
  },
  {
    id: 'gerar-ficha',
    projectId: 'gerar-ficha',
    name: 'Gerar Ficha',
    displayName: 'Gerar Ficha',
    organization: 'GRG AI Systems',
    description: 'Serviço FastAPI para geração de fichas; documentação OpenAPI disponível no ambiente da VPS.',
    vpsPath: '/root/gerar-ficha',
    productionPath: '/root/gerar-ficha/backend',
    backend: {
      runtime: 'Python',
      framework: 'FastAPI + Uvicorn',
      path: '/root/gerar-ficha/backend',
      port: 8000,
      serviceManager: 'gerar-ficha.service',
    },
    services: ['gerar-ficha-api'],
    deployment: {
      type: 'systemd',
      service: 'gerar-ficha.service',
      port: 8000,
      bindings: [
        { label: 'Documentação OpenAPI', address: '0.0.0.0', port: 8000, target: 'FastAPI /docs', url: 'http://209.50.241.22:8000/docs' },
      ],
    },
    health: 'http://localhost:8000/health',
    status: 'DISCOVERED',
    currentVersion: null,
    color: '#38bdf8',
    palette: ['#38bdf8', '#0284c7', '#082f49'],
    buildingType: 'service',
    icon: '📄',
    tags: ['fastapi', 'python', 'documents'],
  },
];

function getGitInfo(vpsPath) {
  if (!vpsPath || !fs.existsSync(vpsPath)) {
    return { branch: 'main', lastCommit: null, lastSync: null };
  }
  try {
    const branch = execSync('git -C "' + vpsPath + '" rev-parse --abbrev-ref HEAD', { timeout: 3000, stdio: 'pipe' }).toString().trim();
    const lastCommit = execSync('git -C "' + vpsPath + '" log --oneline -1', { timeout: 3000, stdio: 'pipe' }).toString().trim();
    const lastSync = execSync('git -C "' + vpsPath + '" log -1 --format=%ci', { timeout: 3000, stdio: 'pipe' }).toString().trim();
    return { branch: branch || 'main', lastCommit: lastCommit || null, lastSync: lastSync || null };
  } catch (e) {
    return { branch: 'main', lastCommit: null, lastSync: null };
  }
}

const PROJECT_SNAPSHOT_CACHE_TTL_MS = 10 * 60_000;
const projectSnapshotCache = new WeakMap();

function countProjectFiles(dir) {
  if (!dir || !fs.existsSync(dir)) return { totalFiles: 0, jsFiles: 0, tsFiles: 0 };
  try {
    const metrics = { totalFiles: 0, jsFiles: 0, tsFiles: 0 };
    const walk = (d) => {
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const it of items) {
        if (it.name === 'node_modules' || it.name === '.git') continue;
        const full = path.join(d, it.name);
        if (it.isDirectory()) walk(full);
        else {
          metrics.totalFiles += 1;
          if (it.name.endsWith('.js')) metrics.jsFiles += 1;
          if (it.name.endsWith('.ts')) metrics.tsFiles += 1;
        }
      }
    };
    walk(dir);
    return metrics;
  } catch (e) {
    return { totalFiles: 0, jsFiles: 0, tsFiles: 0 };
  }
}

function getProjectSnapshot(project) {
  const targetPath = project.vpsPath || project.localPath;
  const now = Date.now();
  let snapshot = projectSnapshotCache.get(project);
  if (!snapshot || snapshot.targetPath !== targetPath || now - snapshot.cachedAt >= PROJECT_SNAPSHOT_CACHE_TTL_MS) {
    snapshot = {
      targetPath,
      cachedAt: now,
      gitInfo: targetPath ? getGitInfo(targetPath) : {},
      metrics: countProjectFiles(targetPath),
    };
    projectSnapshotCache.set(project, snapshot);
  }
  return Object.assign({}, project, snapshot.gitInfo, {
    id: project.id,
    name: project.name,
    slug: project.slug || project.id,
    companyId: project.companyId || null,
    workspaceId: project.workspaceId || project.id,
    repository: project.repository || null,
    path: targetPath,
    status: project.status || 'ONLINE',
    runtime: project.backend?.runtime || 'Node.js',
    technology: project.frontend?.framework || project.technology || 'Fullstack',
    createdAt: project.createdAt || null,
    updatedAt: project.updatedAt || null,
    metrics: snapshot.metrics,
    lastUpdated: new Date().toISOString(),
  });
}

const PROJECT_HEALTH_CACHE_TTL_MS = 15_000;
const projectHealthCache = new Map();

async function checkHealth(project) {
  if (!project.health) return 'UNKNOWN';
  const cacheKey = project.id || project.health;
  const cached = projectHealthCache.get(cacheKey);
  if (cached && (Date.now() - cached.at < PROJECT_HEALTH_CACHE_TTL_MS)) {
    return cached.status;
  }
  try {
    const res = await fetch(project.health, { signal: AbortSignal.timeout(1200) });
    const status = res.ok ? 'ONLINE' : 'DEGRADED';
    projectHealthCache.set(cacheKey, { at: Date.now(), status });
    return status;
  } catch (e) {
    projectHealthCache.set(cacheKey, { at: Date.now(), status: 'OFFLINE' });
    return 'OFFLINE';
  }
}

async function getAllProjects() {
  return Promise.all(PROJECTS.map(async (p) => {
    const snapshot = getProjectSnapshot(p);
    const healthStatus = await checkHealth(p).catch(function() { return 'UNKNOWN'; });
    return Object.assign({}, snapshot, { runtimeStatus: healthStatus });
  }));
}

function getProjectById(id) {
  if (!id) return null;
  const lower = id.toLowerCase();
  return PROJECTS.find(function(p) {
    return p.id === id
      || p.projectId === id
      || p.id.toLowerCase() === lower
      || p.name.toLowerCase().includes(lower)
      || (p.displayName && p.displayName.toLowerCase().includes(lower))
      || (p.aliases || []).some(function(alias) { return String(alias).toLowerCase() === lower; });
  }) || null;
}

function getProjectsByService(serviceName) {
  if (!serviceName) return [];
  const lower = serviceName.toLowerCase();
  return PROJECTS.filter(p => (p.services || []).some(s => s.toLowerCase().includes(lower)));
}

function getProjectsByStack(tech) {
  if (!tech) return [];
  const lower = tech.toLowerCase();
  return PROJECTS.filter(p =>
    (p.tags || []).some(t => t.toLowerCase().includes(lower)) ||
    (p.frontend && p.frontend.framework.toLowerCase().includes(lower)) ||
    (p.backend && p.backend.framework.toLowerCase().includes(lower))
  );
}

module.exports = {
  PROJECTS,
  getAllProjects,
  getProjectById,
  getProjectSnapshot,
  getProjectsByService,
  getProjectsByStack,
  checkHealth,
};

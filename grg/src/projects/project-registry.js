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
    health: 'http://localhost:4410/api/health',
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
    services: ['crm', 'whatsapp-gateway', 'campaigns', 'inbox', 'contacts', 'analytics', 'flows', 'quick-replies'],
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
    health: 'http://localhost:4025/api/system/health',
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

function countFiles(dir, ext) {
  if (!dir || !fs.existsSync(dir)) return 0;
  try {
    let count = 0;
    const walk = (d) => {
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const it of items) {
        if (it.name === 'node_modules' || it.name === '.git') continue;
        const full = path.join(d, it.name);
        if (it.isDirectory()) walk(full);
        else if (!ext || it.name.endsWith('.' + ext)) count++;
      }
    };
    walk(dir);
    return count;
  } catch (e) {
    return 0;
  }
}

function getProjectSnapshot(project) {
  const targetPath = project.vpsPath || project.localPath;
  const gitInfo = targetPath ? getGitInfo(targetPath) : {};
  const fileCount = fs.existsSync(targetPath) ? countFiles(targetPath, null) : 0;
  const jsCount = fs.existsSync(targetPath) ? countFiles(targetPath, 'js') : 0;
  const tsCount = fs.existsSync(targetPath) ? countFiles(targetPath, 'ts') : 0;
  return Object.assign({}, project, gitInfo, {
    metrics: { totalFiles: fileCount, jsFiles: jsCount, tsFiles: tsCount },
    lastUpdated: new Date().toISOString(),
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

async function getAllProjects() {
  const results = [];
  for (const p of PROJECTS) {
    const snapshot = getProjectSnapshot(p);
    const healthStatus = await checkHealth(p).catch(function() { return 'UNKNOWN'; });
    results.push(Object.assign({}, snapshot, { runtimeStatus: healthStatus }));
  }
  return results;
}

function getProjectById(id) {
  if (!id) return null;
  const lower = id.toLowerCase();
  return PROJECTS.find(function(p) {
    return p.id === id
      || p.projectId === id
      || p.id.toLowerCase() === lower
      || p.name.toLowerCase().includes(lower)
      || (p.displayName && p.displayName.toLowerCase().includes(lower));
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

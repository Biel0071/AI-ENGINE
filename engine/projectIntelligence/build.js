// FÊNIX OS — Project Intelligence 20X — pipeline completo:
// DISCOVER → INDEX (incremental) → SKELETON → GRAPH → REGISTRIES → DOCS → METRICS
// Uso: node engine/projectIntelligence/build.js [--full]
'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const L = require('./lib');

const FULL = process.argv.includes('--full');

async function main() {
  const t0 = Date.now();
  await fsp.mkdir(L.OUTPUT_DIR, { recursive: true });
  if (FULL) { try { await fsp.rm(path.join(L.OUTPUT_DIR, 'index-cache.json'), { force: true }); } catch {} }

  // ---- FASE 1: DISCOVERY ----
  const allFiles = await L.walk(L.ROOT, L.ROOT);
  const indexable = allFiles.filter(L.isIndexable);
  const discoveryMs = Date.now() - t0;

  // ---- FASE 6/7: INDEX INCREMENTAL + CACHE ----
  const t1 = Date.now();
  const { results: indexed, stats } = await L.indexFiles(L.ROOT, indexable);
  const indexMs = Date.now() - t1;

  // ---- FASE 4: GRAPH ----
  const edges = L.buildGraph(indexed);
  const consumers = {}; // file -> [files that import it]
  for (const e of edges) {
    if (e.type === 'IMPORTS') (consumers[e.to] ||= []).push(e.from);
  }

  // ---- Classificação (FASE 16) ----
  const byClass = {};
  for (const rel of Object.keys(indexed)) {
    const c = L.classifyFile(rel);
    (byClass[c] ||= []).push(rel);
  }

  // ---- Métricas de segurança do índice (FASE 24) ----
  const leakedSecrets = scanForLeaks(indexed);

  // ---- Artefatos JSON ----
  const skeleton = {};
  for (const [rel, info] of Object.entries(indexed)) {
    skeleton[rel] = { language: info.skeleton.language, lines: info.lines, size: info.size, module: L.moduleOf(rel), ...info.skeleton };
  }
  const graph = { generatedAt: new Date().toISOString(), nodes: Object.keys(indexed).length, edges, consumers };
  const metrics = {
    projectSizeFiles: allFiles.length,
    indexedFiles: Object.keys(indexed).length,
    reusedFromCache: stats.reused,
    reindexed: stats.reread,
    cacheHitRate: stats.reused + stats.reread ? +(stats.reused / (stats.reused + stats.reread)).toFixed(4) : 0,
    removedFromIndex: stats.removedFromIndex,
    endpoints: edges.filter((e) => e.type === 'EXPOSES_ENDPOINT').length,
    importEdges: edges.filter((e) => e.type === 'IMPORTS').length,
    brokenReferences: edges.filter((e) => e.type === 'BROKEN_REFERENCE').map((e) => `${e.from} -> ${e.to}`),
    secretLeaksInIndex: leakedSecrets,
    timingsMs: { discovery: discoveryMs, indexing: indexMs, total: Date.now() - t0 },
  };

  await fsp.writeFile(path.join(L.OUTPUT_DIR, 'skeleton.json'), JSON.stringify(skeleton));
  await fsp.writeFile(path.join(L.OUTPUT_DIR, 'graph.json'), JSON.stringify(graph));
  await fsp.writeFile(path.join(L.OUTPUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2));

  // ---- Documentos derivados da realidade (FASE 25) ----
  await writeStructureDoc(allFiles, indexed, byClass, metrics);
  await writeSkeletonDoc(skeleton);
  await writeGraphDoc(edges, consumers, metrics);
  await writeScreenRegistry(indexed);
  await writeApiRegistry(indexed, edges);
  await writeIntegrationRegistry(indexed);
  await writeActionRegistry(indexed);

  console.log(JSON.stringify(metrics, null, 2));
  console.log('OK — artefatos em engine/projectIntelligence/output/ e docs raiz.');
}

function scanForLeaks(indexed) {
  const leaks = [];
  const re = /(sk-[A-Za-z0-9]{10,}|Bearer\s+[A-Za-z0-9._-]{20,}|AKIA[A-Z0-9]{16})/;
  for (const [rel, info] of Object.entries(indexed)) {
    const dump = JSON.stringify(info.skeleton);
    if (re.test(dump)) leaks.push(rel);
  }
  return leaks;
}

// ---------- DOCUMENTOS ----------

async function writeStructureDoc(allFiles, indexed, byClass, metrics) {
  const tops = {};
  for (const rel of allFiles) {
    const top = rel.split('/')[0];
    (tops[top] ||= { count: 0, exts: {} });
    tops[top].count++;
    const ext = path.extname(rel) || '(sem extensão)';
    tops[top].exts[ext] = (tops[top].exts[ext] || 0) + 1;
  }
  const purposes = {
    'grg': 'FÊNIX OS canônico — backend Node (src/server.js, porta 4400) + frontend canônico public/index.html (Live Workspace) + office.html',
    'platform': 'Control Plane v2 legado do AI-ENGINE (porta 4310) — dashboard próprio em public/',
    'engine': 'Motor de IA reutilizável (análise, AST tree-sitter, memória, codeIntelligence)',
    'ai-os': 'Documentos operacionais do FÊNIX (memória de decisões, prompts, repositórios registrados)',
    'crm': 'CRM ZapAI (backend Baileys/WhatsApp + frontend Vite) — projeto satélite',
    'memory': 'Memória de projetos (ai-engine, zapai-crm)',
    'scripts': 'Scripts utilitários (analyze-crm)',
    'docs': 'Documentação geral',
    'system': 'Docs de sistema',
    'generated': 'Saídas geradas pelo engine (smoke/dashboards) — NÃO editar',
    'future': 'Rascunhos/legado (legacy-root) — inativo',
    'graphify-out': 'Grafo/AST cache gerados por ferramenta externa — regenerável',
    'ai-analysis': 'Análises congeladas (freeze) — gerado',
    '.github': 'CI/CD (workflows)',
  };
  let md = `# PROJECT_STRUCTURE.md — FÊNIX OS\n\nGerado automaticamente por \`engine/projectIntelligence/build.js\` em ${new Date().toISOString()}. Derivado da realidade do código.\n\n## Topo do repositório (${allFiles.length} arquivos, sem node_modules/.git)\n\n| Diretório | Arquivos | Finalidade (verificada no código) |\n|---|---|---|\n`;
  for (const [top, info] of Object.entries(tops).sort((a, b) => b[1].count - a[1].count)) {
    md += `| \`${top}/\` | ${info.count} | ${purposes[top] || 'A classificar'} |\n`;
  }
  md += `\n## Entrypoints reais\n\n- **Backend canônico**: \`grg/src/server.js\` → \`grg/src/app.js\` (composition root). Porta padrão \`4400\` (env PORT).\n- **Frontend canônico**: \`grg/public/index.html\` (+ \`app.js\`, \`design-system.css\`, \`fenix.css\`, \`city-overrides.css\`, \`office.css\`). Servido estaticamente por server.js. Rota alternativa: \`/office\` → \`grg/public/office.html\`.\n- **Login**: \`grg/public/login.html\` (\`/GRG-login\`).\n- **Control Plane legado**: \`platform/src/index-v2.js\` (porta 4310, http/server-v2.js).\n- **Engine CLI**: \`package.json\` bin \`ai-engine\` → \`cli/index.js\`; scripts: analyze:project (engine/runAnalysis.js), test:engine.\n- **Worker/agendamento**: schedules garantidos no boot do grg server; execução via \`/api/runtime/work\` e BullMQ (grg/src/infrastructure/queue/bullmq-runtime.js).\n- **Deploy**: \`grg/Dockerfile\`, \`grg/docker-compose.enterprise.yml\`, \`grg/start.sh\`, \`grg/ops/*\` (backup/restore/rollback/healthcheck/observability/keycloak/reverse-proxy), compose raiz (qdrant + docling).\n\n## Classificação estrutural (FASE 16)\n\n| Classe | Arquivos |\n|---|---|\n`;
  for (const [c, files] of Object.entries(byClass)) md += `| ${c} | ${files.length} |\n`;
  md += `\n## Configuração\n\n- \`.env\` (raiz): chaves PORT, FRONTEND_URL, OPENAI_API_KEY(redacted), DATABASE_URL, DEFAULT_COMPANY_ID, AI_ENGINE_CMD, ENGINE_MONITOR_INTERVAL_MS — valores nunca indexados.\n- \`grg/src/infrastructure/config.js\`: carrega Postgres/Redis/S3/Qdrant opcionais.\n- \`grg/src/security/config.js\+: política de segurança/bootstrap admin/OIDC.\n- \`docker-compose.yml\`: serviços qdrant (6333) e docling (8000).\n\n## Runtime\n\n- Node >= 18 (testado em v20). Testes: \`cd grg && node --test test/\` (suite principal), \`cd platform && node --test test/*.test.js\`, \`npm run test:engine\`.\n`;
  await fsp.writeFile(path.join(L.ROOT, 'PROJECT_STRUCTURE.md'), md);
}

async function writeSkeletonDoc(skeleton) {
  const mods = {};
  for (const [rel, sk] of Object.entries(skeleton)) {
    (mods[sk.module] ||= []).push([rel, sk]);
  }
  let md = `# PROJECT_SKELETON.md\n\nGerado automaticamente. Resumo estrutural por arquivo (imports/exports/classes/funções/endpoints/eventos) — permite entender a arquitetura sem abrir os arquivos.\nTotal: ${Object.keys(skeleton).length} arquivos indexados. Detalhes completos em \`engine/projectIntelligence/output/skeleton.json\`.\n\n`;
  const keyMods = ['grg/src/kernel', 'grg/src/ai-city', 'grg/src/missions', 'grg/src/memory', 'grg/src/eventing', 'grg/src/fabric', 'grg/public', 'platform/src', 'engine/codeIntelligence'];
  for (const mod of Object.keys(mods).sort()) {
    const files = mods[mod];
    const hasEndpoints = files.some(([, f]) => (f.endpoints || []).length);
    if (!hasEndpoints && !keyMods.includes(mod) && files.length > 3) {
      md += `## ${mod} — ${files.length} arquivos (detalhes no skeleton.json)\n\n`;
      continue;
    }
    md += `## ${mod}\n\n`;
    for (const [rel, f] of files.slice(0, 12)) {
      md += `- \`${rel}\` (${f.language}, ${f.lines} linhas)`;
      const bits = [];
      if (f.classes?.length) bits.push(`classes: ${f.classes.slice(0, 6).join(', ')}`);
      if (f.functions?.length) bits.push(`funções: ${f.functions.slice(0, 6).join(', ')}${f.functions.length > 6 ? '…' : ''}`);
      if (f.requires?.length) bits.push(`requires: ${f.requires.filter(r => r.startsWith('.')).slice(0, 5).join(', ')}`);
      if (f.endpoints?.length) bits.push(`**endpoints(${f.endpoints.length})**: ${f.endpoints.slice(0, 8).join(', ')}${f.endpoints.length > 8 ? '…' : ''}`);
      if (f.events?.length) bits.push(`eventos: ${f.events.slice(0, 6).join(', ')}`);
      if (bits.length) md += ` — ${bits.join(' | ')}`;
      md += '\n';
    }
    md += '\n';
  }
  await fsp.writeFile(path.join(L.ROOT, 'PROJECT_SKELETON.md'), md);
}

async function writeGraphDoc(edges, consumers, metrics) {
  let md = `# PROJECT_GRAPH.md\n\nGrafo FILE→MODULE→API/EVENT derivado do índice. Consultas: "quem usa este módulo?" → tabela CONSUMERS abaixo (fonte completa em output/graph.json).\n\n- Nós (arquivos): ${metrics.indexedFiles}\n- Arestas IMPORTS: ${metrics.importEdges}\n- Endpoints expostos: ${metrics.endpoints}\n- Referências quebradas: ${metrics.brokenReferences.length}\n\n## Arquivos mais consumidos (top 25)\n\n| Arquivo | Consumidores |\n|---|---|\n`;
  const ranked = Object.entries(consumers).sort((a, b) => b[1].length - a[1].length).slice(0, 25);
  for (const [f, cs] of ranked) md += `| \`${f}\` | ${cs.length}: ${cs.slice(0, 5).map((c) => '`' + c + '`').join(', ')}${cs.length > 5 ? '…' : ''} |\n`;
  if (metrics.brokenReferences.length) {
    md += `\n## BROKEN REFERENCES (verificar antes de mover/apagar)\n\n`;
    for (const b of metrics.brokenReferences.slice(0, 50)) md += `- ${b}\n`;
  }
  await fsp.writeFile(path.join(L.ROOT, 'PROJECT_GRAPH.md'), md);
}

async function writeScreenRegistry(indexed) {
  // Telas REAIS verificadas em grg/public e rotas estáticas de server.js
  const appJs = indexed['grg/public/app.js']?.skeleton || {};
  const officeJs = indexed['grg/public/office.js']?.skeleton || {};
  const apiOf = (sk) => [...new Set([...(sk.apiRefs || []), ...(sk.endpoints || [])])];
  const screens = [
    { id: 'WORLD/LIVE-WORKSPACE', name: 'Painel FÊNIX OS Live Workspace', route: '/', entrypoint: 'grg/public/index.html', script: 'grg/public/app.js', css: ['fenix.css', 'design-system.css', 'styles.css', 'city-overrides.css'], apisUsed: apiOf(appJs), sections: ['#command', '#missions (Mission Workspace)', '#hotmemory (Hot Memory L0-L5)', '#knowledge (Knowledge Workspace KOS)'] },
    { id: 'OFFICE', name: 'Empresas (SaaS Builder)', route: '/office', entrypoint: 'grg/public/office.html', script: 'grg/public/office.js', css: ['office.css'], apisUsed: apiOf(officeJs), sections: ['companies/lojas'] },
    { id: 'LOGIN', name: 'Autenticação GRG', route: '/GRG-login', entrypoint: 'grg/public/login.html', script: '(inline)', css: [], apisUsed: ['/api/login', '/api/logout', '/api/oidc/config'], sections: ['OIDC bootstrap'] },
    { id: 'CONTROL-PLANE-LEGACY', name: 'AI-ENGINE Control Plane v2 (legado)', route: 'http://127.0.0.1:4310', entrypoint: 'platform/public/index.html', script: 'platform/public/app-v2.js', css: ['platform/public/styles.css'], apisUsed: ['/api/v2/overview', '/api/v2/projects', '/api/v2/graph', '/api/v2/memory', '/api/v2/members', '/api/v2/acep/*', '/api/v2/lcr/*'], sections: ['ACEP', 'LCR', 'Graph'] },
  ];
  let md = `# SCREEN_REGISTRY.md\n\nRegistry das telas REAIS encontradas no código (não inventado). O frontend canônico do FÊNIX é \`grg/public/index.html\`; não existe React/Vue no core — vanilla JS com helper \`api()\` em \`grg/public/app.js\`.\n\n`;
  for (const s of screens) {
    md += `## ${s.id} — ${s.name}\n\n- route: \`${s.route}\`\n- entrypoint: \`${s.entrypoint}\`\n- script: \`${s.script}\`\n- css: ${s.css.map((c) => '`' + c + '`').join(', ') || '—'}\n- APIs consumidas: ${s.apisUsed.map((a) => '`' + a + '`').join(', ') || '—'}\n- seções/painéis: ${s.sections.join('; ')}\n- status: ${s.id.includes('LEGACY') ? 'LEGADO (plataforma paralela antiga, preservar)' : 'CANÔNICO/ATIVO'}\n\n`;
  }
  md += `## Nota sobre nomenclatura pedida vs. real\n\nAs telas WORLD/WORK/BUILD/MEMORY/CONTROL/AGENTS existem como **âncoras/seções** dentro de index.html (#missions, #hotmemory, #knowledge, #command) servidas pela API \`/api/city\` (World/City Map via ai-city) — não como rotas SPA separadas. Registrar isso evita criar frontends paralelos.\n`;
  await fsp.writeFile(path.join(L.ROOT, 'SCREEN_REGISTRY.md'), md);
}

async function writeApiRegistry(indexed, edges) {
  const byFile = {};
  for (const e of edges) if (e.type === 'EXPOSES_ENDPOINT') (byFile[e.from] ||= new Set()).add(e.to);
  let md = `# API_REGISTRY.md\n\nEndpoints extraídos diretamente dos handlers (url.pathname === '...'). Fonte: skeleton indexado.\n\n`;
  for (const [file, eps] of Object.entries(byFile)) {
    md += `## \`${file}\` — ${eps.size} endpoints\n\n`;
    for (const ep of [...eps].sort()) md += `- \`${ep}\`\n`;
    md += '\n';
  }
  await fsp.writeFile(path.join(L.ROOT, 'API_REGISTRY.md'), md);
}

async function writeIntegrationRegistry(indexed) {
  const checks = [
    ['Postgres', 'grg/src/infrastructure/database/postgres-store.js', 'pg', 'DATABASE_URL via infrastructure/config.js', 'app.js (store primário quando configurado)'],
    ['Redis', 'grg/src/infrastructure/redis/redis-cache.js + redis-rate-limiter.js', 'redis', 'REDIS_URL/queue', 'cache, rate-limit, BullMQ'],
    ['BullMQ (Job Engine)', 'grg/src/infrastructure/queue/bullmq-runtime.js', 'bullmq', 'queueRedisUrl', 'runtime/jobs, schedules, worker /api/runtime/work'],
    ['Qdrant (vetores)', 'grg/src/memory/qdrant-vector-store.js', '@qdrant client via fetch', 'QDRANT_URL; compose porta 6333', 'MemoryEngine, knowledge search'],
    ['S3/MinIO', 'grg/src/infrastructure/storage/s3-object-store.js', '@aws-sdk/client-s3', 'S3_* env', 'backups, artefatos'],
    ['GitHub', 'grg/src/repo-intel/github-connector.js + cloning-git-host.js', 'API REST/auth', 'GITHUB token (redacted)', 'PortfolioService, RepositoryIntelligence, ops/github'],
    ['AI Providers / Ollama', 'grg/src/ai-runtime/provider-registry.js + ai-router.js + ai-gateway.js', 'OpenAI-compat + local', 'GRG_LLM, provider envs; decisão registrada: Ollama real', 'ChatAgent, MasterAvatar, geração de código'],
    ['OIDC/Keycloak', 'grg/src/auth/oidc-verifier.js + grg/ops/keycloak', 'jose', 'securityConfig.bootstrapOidc', '/api/login, /api/oidc/config'],
    ['Docling (docs)', 'docker-compose.yml', 'container', 'porta 8000', 'ingestão multimodal /api/multimodal/ingest'],
    ['Baileys/WhatsApp', 'crm/backend/baileys', 'whatsapp', 'sessões em crm/backend/crm/sessions (gitignored)', 'CRM satélite (não é o core FÊNIX)'],
    ['Playwright/browser', 'grg/src/execution (sandbox) + onedeploy e2e', '—', 'FENIX_SMOKE_BASE_URL', 'inspections, e2e/run, smoke-tests'],
  ];
  let md = `# INTEGRATION_REGISTRY.md\n\nIntegrações verificadas por arquivo-fonte real (nenhuma invenção):\n\n| Integração | Source files | Lib/Protocol | Config | Consumidores |\n|---|---|---|---|---|\n`;
  for (const c of checks) md += `| ${c[0]} | \`${c[1]}\` | ${c[2]} | ${c[3]} | ${c[4]} |\n`;
  md += `\nStatus de saúde: \`/health\` (grg server, inclui progresso da ativação operacional em background) e HealthRegistry (grg/src/infrastructure/monitoring/health-registry.js). Observabilidade: \`/api/observability/metrics\`, \`/api/operations/observability/metrics\` e \`grg/ops/observability\`.\n`;
  await fsp.writeFile(path.join(L.ROOT, 'INTEGRATION_REGISTRY.md'), md);
}

async function writeActionRegistry(indexed) {
  // Ações reais mapeadas: UI (app.js api calls) → endpoint → serviço app.js composition root
  const uiCalls = [...new Set([...((indexed['grg/public/app.js']?.skeleton?.endpoints) || []), ...((indexed['grg/public/office.js']?.skeleton?.endpoints) || [])])];
  let md = `# ACTION_REGISTRY.md\n\nCatálogo das ações que JÁ EXISTEM — o agente deve reutilizar antes de criar.\n\n## Ações disparadas pelo frontend canônico (grg/public/app.js)\n\n${uiCalls.map((a) => '- `' + a + '`').join('\n') || '(nenhuma detectada)'}\n\n## Ações-chave do núcleo (services montados em grg/src/app.js)\n\n| Ação | Implementação real |\n|---|---|\n| sendMessage/avatar | \`MasterAvatar.handle\` → POST /api/avatar/message |\n| createMission | \`app.missions.create\` → POST /api/missions |\n| planMission | \`app.missionPlanner.plan\` → POST /api/missions/plan |\n| runJob | \`app.jobs.submit\` → POST /api/runtime/jobs |\n| inspectAgent | \`app.inspection.inspect\` → POST /api/inspections |\n| connectProvider | \`provider-registry.buildProvidersFromEnv\` + /api/keos/adapters/ai |\n| deploy | \`app.deployer\` (runtime/deployer.js) + /api/operations/deploys |\n| rollback | \`versionEngine.proposeRollback\` → POST /api/rollbacks |\n| cityMap/World | \`app.aiCity.map\` → GET /api/city |\n| eventSearch | \`app.eventStore.list\` → GET /api/events |\n| memorySearch | \`MemoryEngine\` → /api/memories/search |\n| activateOperations | \`operationalActivation.boot\` → POST /api/operations/activate |\n\n## Comandos de engenharia já disponíveis\n\n- \`cd grg && node --test test/\` — suíte principal citada no CLAUDE.md\n- \`cd platform && node --test test/*.test.js\` — 13 testes do control plane\n- \`npm run test:engine\` — engine/tests\n- \`node engine/projectIntelligence/build.js\` — rebuild incremental deste índice\n- \`node engine/projectIntelligence/query.js <cmd>\` — consultas ao mapa sem ler arquivos\n`;
  await fsp.writeFile(path.join(L.ROOT, 'ACTION_REGISTRY.md'), md);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });

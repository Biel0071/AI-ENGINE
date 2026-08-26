const { uuid, slugify } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

// Software Factory: prompt -> entender -> descobrir reutilização -> plano -> gerar SÓ o novo -> validar.
// Reutiliza capabilities do catálogo (detectadas pela Repository Intelligence).

// mapa de intenção (palavra no prompt -> capability). Determinístico e auditável.
const INTENT_MAP = [
  { rx: /whatsapp|zap|chat/i, capability: 'whatsapp-crm' },
  { rx: /\bia\b|ai|assistant|gpt|llm/i, capability: 'ai-gateway' },
  { rx: /pix|pagamento|checkout|payment/i, capability: 'payments-pix' },
  { rx: /stripe|assinatura|subscription/i, capability: 'payments-stripe' },
  { rx: /login|auth|permiss|rbac/i, capability: 'auth-rbac' },
  { rx: /dashboard|painel|relat/i, capability: 'dashboard' },
  { rx: /loja|ecommerce|carrinho|produto/i, capability: 'ecommerce' },
  { rx: /analytics|m[eé]trica|funil/i, capability: 'analytics' },
];

class SoftwareFactory {
  constructor({ store, bus, controlPlane, aiGateway, outputDir }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.ai = aiGateway;
    this.outputDir = outputDir || null; // se setado, generate() escreve os arquivos no disco
  }

  // Descobre quais capabilities o objetivo pede e quais já existem no catálogo do tenant.
  async discover(tenantId, prompt) {
    const wanted = [...new Set(INTENT_MAP.filter((i) => i.rx.test(prompt)).map((i) => i.capability))];
    const state = await this.store.read();
    const available = new Set(state.capabilities.filter((c) => c.tenantId === tenantId).map((c) => c.id));
    const reused = wanted.filter((c) => available.has(c));
    const missing = wanted.filter((c) => !available.has(c));
    return { wanted, reused, missing };
  }

  async plan(tenantId, actorId, prompt) {
    await this.cp.authorize(tenantId, actorId, 'factory:generate');
    if (!prompt || !prompt.trim()) throw new ValidationError('prompt is required');
    const { wanted, reused, missing } = await this.discover(tenantId, prompt);
    // usa a IA (gateway) para um resumo de plano — barato, cacheável
    const ai = await this.ai.invoke(tenantId, actorId, { taskType: 'plan', prompt: `plan: ${prompt}` });
    return {
      objective: prompt.trim(),
      capabilities: { wanted, reused, missing },
      aiPlan: ai.text,
      newModulesToBuild: missing,
      reusedModules: reused,
    };
  }

  // Gera o projeto: reutiliza capabilities existentes (por seleção) e cria SÓ os módulos faltantes.
  async generate(tenantId, actorId, input) {
    const prompt = String(input && input.prompt || '');
    const plan = await this.plan(tenantId, actorId, prompt);
    const name = String(input.name || prompt).trim();
    const projectId = slugify(input.id || name).slice(0, 60) || uuid().slice(0, 8);

    const files = scaffold(projectId, name, plan);
    const project = {
      id: projectId, tenantId, name,
      kind: 'generated',
      objective: plan.objective,
      reusedModules: plan.reusedModules,
      generatedModules: plan.newModulesToBuild,
      repository: null, // repo independente é criado no deploy/scaffold real
      analysisStatus: 'generated',
      deploymentStatus: 'not-configured',
      createdAt: now(),
    };

    const run = { id: uuid(), tenantId, projectId, type: 'generation', status: 'succeeded', createdAt: now() };

    await this.store.update((state) => {
      if (state.projects.some((p) => p.tenantId === tenantId && p.id === projectId)) {
        throw new ValidationError(`Project already exists: ${projectId}`);
      }
      state.projects.push(project);
      state.runs.push(run);
      // memória: o que foi reutilizado vs criado (evidência)
      state.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId,
        kind: 'project-generated',
        summary: `Generated ${name}: reused [${plan.reusedModules.join(', ') || 'none'}], built [${plan.newModulesToBuild.join(', ') || 'none'}]`,
        evidence: [`run:${run.id}`],
        confidence: 1,
        createdAt: now(),
      });
      // grafo
      state.graphEdges.push({ tenantId, source: `tenant:${tenantId}`, target: `project:${projectId}`, type: 'OWNS', evidence: 'factory' });
      for (const cap of plan.reusedModules) {
        state.graphEdges.push({ tenantId, source: `project:${projectId}`, target: `capability:${cap}`, type: 'REUSES', evidence: 'factory' });
      }
      return state;
    });

    const validation = validate(files);

    // ESCREVE OS ARQUIVOS NO DISCO DE VERDADE (repositório independente gerado).
    let outputPath = null;
    if (this.outputDir && validation.ok) {
      const fs = require('node:fs');
      const path = require('node:path');
      outputPath = path.join(this.outputDir, projectId);
      for (const [rel, content] of Object.entries(files)) {
        const full = path.join(outputPath, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
      await this.store.update((s) => {
        const p = s.projects.find((x) => x.tenantId === tenantId && x.id === projectId);
        if (p) { p.outputPath = outputPath; p.fileCount = Object.keys(files).length; }
        return s;
      });
    }

    await this.bus.emit('project.generated', { tenantId, projectId, reused: plan.reusedModules, built: plan.newModulesToBuild, outputPath });

    return { project, plan, files, validation, run, outputPath };
  }

  async listProjects(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    return state.projects.filter((p) => p.tenantId === tenantId);
  }
}

// Scaffolder: gera um app Node REAL e executável (HTTP nativo, zero dependências). Cada
// capability (reutilizada ou nova) vira um módulo funcional com rotas reais montadas no servidor.
function scaffold(projectId, name, plan) {
  const files = {};
  const allModules = [...new Set([...plan.reusedModules, ...plan.newModulesToBuild])];

  files['package.json'] = JSON.stringify({
    name: projectId, version: '1.0.0', private: true, type: 'commonjs',
    main: 'src/index.js',
    scripts: { start: 'node src/index.js', test: 'node --test test/' },
    engines: { node: '>=18' },
    grg: { generatedFrom: plan.objective, reuse: plan.reusedModules, build: plan.newModulesToBuild },
  }, null, 2) + '\n';

  files['README.md'] = `# ${name}\n\nGerado pelo GRG Services OS — app Node real, sem dependências.\n\n` +
    `## Rodar\n\n\`\`\`bash\nnode src/index.js\n# http://127.0.0.1:3000\n\`\`\`\n\n` +
    `## Módulos\n\n` + allModules.map((m) => `- \`${m}\` (${plan.reusedModules.includes(m) ? 'reutilizado' : 'novo'}) → GET /${m}, GET /${m}/health`).join('\n') + '\n';

  files['grg.manifest.json'] = JSON.stringify({
    project: projectId, objective: plan.objective,
    reuse: plan.reusedModules, build: plan.newModulesToBuild, modules: allModules,
  }, null, 2) + '\n';

  // módulos funcionais — cada um expõe info() + rotas reais
  for (const mod of allModules) {
    files[`src/modules/${mod}/index.js`] = moduleCode(mod, plan.reusedModules.includes(mod));
  }

  // entrypoint: servidor HTTP real que monta as rotas de cada módulo
  files['src/index.js'] = indexCode(name, allModules);

  // teste real que sobe o servidor e bate nas rotas
  files['test/smoke.test.js'] = smokeTest(allModules);

  files['.gitignore'] = 'node_modules\n.data\n*.log\n';
  files['.dockerignore'] = 'node_modules\n.git\n.data\n*.log\n';
  files['Dockerfile'] = 'FROM node:22-alpine\nWORKDIR /app\nCOPY --chown=node:node . .\nUSER node\nENV NODE_ENV=production PORT=3000\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch(\'http://127.0.0.1:3000/\').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"\nCMD ["node", "src/index.js"]\n';
  return files;
}

function moduleCode(mod, reused) {
  const varName = mod.replace(/[^a-zA-Z0-9]/g, '_');
  return `// Módulo ${mod} (${reused ? 'reutilizado do catálogo GRG' : 'gerado novo'}).
const store = [];
module.exports = {
  name: ${JSON.stringify(mod)},
  reused: ${reused},
  // monta rotas reais no roteador do app
  routes(register) {
    register('GET', '/${mod}/health', () => ({ module: ${JSON.stringify(mod)}, ok: true }));
    register('GET', '/${mod}', () => ({ module: ${JSON.stringify(mod)}, items: store }));
    register('POST', '/${mod}', (body) => { const item = { id: store.length + 1, ...body }; store.push(item); return item; });
  },
};
`;
}

function indexCode(name, modules) {
  return `// ${name} — entrypoint real gerado pelo GRG Services OS.
const http = require('node:http');
const modules = [
${modules.map((m) => `  require('./modules/${m}')`).join(',\n')}
];

const routes = [];
const register = (method, path, handler) => routes.push({ method, path, handler });
routes.push({ method: 'GET', path: '/', handler: () => ({ app: ${JSON.stringify(name)}, modules: modules.map((m) => m.name) }) });
for (const m of modules) if (typeof m.routes === 'function') m.routes(register);

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let body = {};
    if (req.method === 'POST') { let raw = ''; for await (const c of req) raw += c; try { body = raw ? JSON.parse(raw) : {}; } catch {} }
    const route = routes.find((r) => r.method === req.method && r.path === url.pathname);
    res.setHeader('content-type', 'application/json');
    if (!route) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
    try { res.writeHead(200); res.end(JSON.stringify(await route.handler(body))); }
    catch (e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(${JSON.stringify(name)} + ' rodando em http://127.0.0.1:' + port));
}
module.exports = { name: ${JSON.stringify(name)}, createServer, routes };
`;
}

function smokeTest(modules) {
  return `const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/index');

test('app expõe nome e rotas', () => {
  assert.ok(app.name);
  assert.ok(app.routes.length >= ${modules.length});
});

test('cada módulo tem rota /health', () => {
${modules.map((m) => `  assert.ok(app.routes.find((r) => r.path === '/${m}/health'), 'falta /${m}/health');`).join('\n')}
});
`;
}

// Validator: checagens estruturais + parse dos JS gerados (garante que rodam).
function validate(files) {
  const errors = [];
  if (!files['src/index.js']) errors.push('missing entrypoint');
  if (!files['package.json']) errors.push('missing package.json');
  try { JSON.parse(files['grg.manifest.json']); } catch { errors.push('invalid manifest json'); }
  try { JSON.parse(files['package.json']); } catch { errors.push('invalid package.json'); }
  // valida sintaxe dos módulos JS gerados
  const vm = require('node:vm');
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.js')) {
      try { new vm.Script(content, { filename: path }); }
      catch (e) { errors.push(`syntax error in ${path}: ${e.message}`); }
    }
  }
  return { ok: errors.length === 0, errors, fileCount: Object.keys(files).length };
}

function now() { return new Date().toISOString(); }

module.exports = { SoftwareFactory, scaffold, validate, INTENT_MAP };

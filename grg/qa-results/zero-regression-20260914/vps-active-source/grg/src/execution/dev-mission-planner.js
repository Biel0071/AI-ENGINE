const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  buildPrincipalAgent,
  chooseModelForStep,
  microtasksForStep
} = require('./principal-agent');

const DEFAULT_MODEL = { provider: 'ollama', modelId: 'qwen2.5:3b', tier: 'MEDIUM' };

class DevMissionPlanner {
  constructor(app = {}) {
    this.app = app;
  }

  async plan({ prompt, project, projectId, client = 'unknown', visualCapture = null, assignedAgentId = null }) {
    const objective = String(prompt || '').trim();
    const intent = classifyObjective(objective, visualCapture);
    const projectContext = await this.#projectContext(project);
    const projectDna = buildProjectDna(project, projectContext);
    if (project?.projectId && this.app.projectRegistry?.update) {
      this.app.projectRegistry.update(project.projectId, { dna: projectDna, lastAnalyzedAt: projectDna.generatedAt });
    }
    const memoryContext = await this.#queryMemory(objective, projectContext);
    const proceduralContext = await this.#queryProceduralMemory(objective, project);
    const skillHints = await this.#selectSkills(objective, projectContext);
    const rag = await this.#queryRag(objective, projectContext, memoryContext);
    const principalAgent = buildPrincipalAgent({ objective, project, projectContext, projectDna, intent, client });
    const missionId = `devmission-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const base = {
      missionId,
      projectId: project?.projectId || projectId || null,
      client,
      objective,
      intent,
      model: DEFAULT_MODEL,
      projectContext,
      projectDna,
      memoryContext,
      proceduralContext,
      rag,
      skillHints,
      principalAgent,
      assignedAgentId,
      visualCapture,
      createdAt
    };

    const steps = buildSteps(base);
    const byKey = new Map();
    for (const step of steps) {
      byKey.set(step.key, {
        id: `devjob-${crypto.randomUUID()}`,
        ...step,
        missionId,
        projectId: base.projectId,
        client,
        prompt: objective,
        intent,
        principalAgent: {
          id: principalAgent.id,
          authority: principalAgent.authority,
          autonomyPolicy: principalAgent.autonomyPolicy
        },
        assignedAgentId,
        model: chooseModelForStep(step, intent, projectDna),
        skill: skillFor(step, skillHints),
        enhancedPrompt: {
          originalPrompt: objective,
          objective,
          intent: intent.kind,
          project: project?.name || projectContext.name || 'unknown',
          principalAgent,
          projectDna,
          proceduralContext,
          plan: steps.map((item) => ({ key: item.key, type: item.type, agentId: item.agentId, dependsOn: item.dependsOn, microtasks: item.microtasks }))
        },
        priority: step.priority ?? priorityFor(step.type),
        status: 'QUEUED',
        dependencies: [],
        resources: step.resources || resourcesForStep(step, base.projectId || 'workspace'),
        microtasks: step.microtasks || microtasksForStep(step, base),
        logs: [],
        attempts: 0,
        maxAttempts: step.maxAttempts || 2,
        repairCount: 0,
        ragContext: ragForAgent(step.agentId, rag, memoryContext, projectDna),
        createdAt
      });
    }
    for (const job of byKey.values()) {
      job.dependencies = job.dependsOn.map((key) => byKey.get(key)?.id).filter(Boolean);
    }

    return {
      id: missionId,
      missionId,
      type: 'DEV_MISSION',
      status: 'QUEUED',
      projectId: base.projectId,
      client,
      objective,
      intent,
      definitionOfDone: definitionOfDoneFor(intent),
      stats: { totalJobs: byKey.size, completed: 0, failed: 0, running: 0, queued: byKey.size },
      rag,
      memoryContext,
      proceduralContext,
      projectDna,
      principalAgent,
      skills: skillHints,
      model: DEFAULT_MODEL,
      modelRouting: Array.from(byKey.values()).map((job) => ({ jobId: job.id, type: job.type, agentId: job.agentId, model: job.model })),
      assignedAgentId,
      deliveryContract: deliveryContractFor(intent, principalAgent),
      createdAt,
      updatedAt: createdAt,
      jobs: Array.from(byKey.values())
    };
  }

  async #projectContext(project) {
    if (this.app.devPipeline && typeof this.app.devPipeline.discoverProject === 'function') {
      try {
        return await this.app.devPipeline.discoverProject(project?.workspace || null);
      } catch (error) {
        return { name: project?.name || 'unknown', exists: false, error: error.message };
      }
    }
    return {
      projectPath: project?.workspace || process.cwd(),
      exists: true,
      name: project?.name || path.basename(project?.workspace || process.cwd())
    };
  }

  async #selectSkills(objective, projectContext) {
    const registry = this.app.skillRegistry || this.app.skills || this.app.skillEngine;
    if (registry && typeof registry.selectForTask === 'function') {
      try {
        const selected = await registry.selectForTask('grg', 'grg-admin', { objective, limit: 6, maxTokens: 1400 });
        return selected.selectedSkills || selected.skills || [];
      } catch {}
    }
    if (this.app.devPipeline && typeof this.app.devPipeline.selectSkills === 'function') {
      try {
        return await this.app.devPipeline.selectSkills(objective, projectContext);
      } catch {}
    }
    return [];
  }

  async #queryRag(objective, projectContext, memoryContext = null) {
    if (this.app.devPipeline && typeof this.app.devPipeline.queryRAG === 'function') {
      try {
        const rag = await this.app.devPipeline.queryRAG('grg', 'grg-admin', objective, projectContext);
        return normalizeRag(rag, memoryContext, projectContext);
      } catch (error) {
        return { queries: [objective], results: [], topScore: 0, error: error.message };
      }
    }
    return { queries: [objective], results: [], topScore: 0 };
  }

  async #queryMemory(objective, projectContext) {
    const memory = this.app.memory || this.app.memoryEngine;
    if (!memory || typeof memory.query !== 'function') return { results: [], totalCandidates: 0 };
    try {
      return await memory.query('grg', 'grg-admin', `${objective}\n${projectContext.name || ''}`, { limit: 6 });
    } catch (error) {
      return { results: [], totalCandidates: 0, error: error.message };
    }
  }

  async #queryProceduralMemory(objective, project) {
    const learning = this.app.proceduralLearning;
    if (!learning || typeof learning.findReusable !== 'function') return { patterns: [], count: 0, status: 'UNAVAILABLE' };
    try {
      return { status: 'AVAILABLE', ...learning.findReusable({ objective, projectId: project?.projectId || null, limit: 5 }) };
    } catch (error) {
      return { patterns: [], count: 0, status: 'ERROR', error: error.message };
    }
  }
}

function classifyObjective(objective, visualCapture) {
  const text = objective.toLowerCase();
  const isVisual = Boolean(visualCapture) || /visual|layout|bot[aã]o|css|preview|inspector|tela/.test(text);
  const isClients = /cliente|clientes|customer|customers|crm/.test(text);
  const isBackend = /api|backend|back-end|rota|persist|banco|store|servidor|runtime|worker|fila|queue|planner|orquestra|crud|auth|login|checkout|whatsapp|integre|integra/.test(text);
  const isAnalysis = /analise|analisar|entenda|entender|inteiro|arquitetura|maior problema|gargalo/.test(text);
  const isRepair = /corrig|bug|erro|falha|repair|fix/.test(text);
  const isFullstack = isClients || isBackend || /completa|fullstack|full-stack|funcionalidade|crud|reconstrua|adicione|principal agent|agente principal/.test(text);
  return {
    kind: isRepair ? 'REPAIR' : isFullstack ? 'FULLSTACK_FEATURE' : isVisual ? 'FRONTEND_FEATURE' : isAnalysis ? 'PROJECT_ANALYSIS' : 'INSPECTION',
    domains: {
      frontend: isVisual || isClients || isFullstack,
      backend: isBackend || isClients || isFullstack,
      visualQa: isVisual || isClients || isFullstack,
      analysis: isAnalysis,
      memory: true,
      rag: true
    },
    feature: isClients ? 'clients' : 'generic'
  };
}

function buildSteps(base) {
  const steps = [
    step('context', 'DEV_CONTEXT', 'Architect', 'Project discovery, DNA, git and source-map availability', []),
    step('rag', 'RAG_CONTEXT', 'Knowledge', 'Retrieve real memory/RAG context', ['context']),
    step('architecture', 'ARCHITECTURE_REVIEW', 'Architect', 'Decide implementation path from Project DNA and existing architecture', ['context', 'rag']),
    step('dispatch', 'AGENT_DISPATCH', 'Dispatcher', 'Select specialist agents, models and dependency order', ['architecture'])
  ];
  if (base.intent.domains.visualQa) {
    steps.push(step('visual-before', 'VISUAL_STATE', 'Browser', 'Capture browser state before code changes', ['dispatch'], { phase: 'BEFORE', maxAttempts: 1 }));
  }
  if (base.intent.domains.analysis) {
    steps.push(step('analysis', 'PROJECT_ANALYSIS', 'Architect', 'Analyze project structure and select the highest-impact issue', ['dispatch']));
  }
  if (base.intent.domains.backend) {
    steps.push(step('backend', 'BACKEND_IMPLEMENT', 'Backend', 'Implement API/data surface when required', implementationDeps(base.intent), { priority: 5 }));
  }
  if (base.intent.domains.frontend) {
    steps.push(step('frontend', 'FRONTEND_IMPLEMENT', 'Frontend', 'Implement DOM, styling and browser-visible UI', implementationDeps(base.intent), { priority: 5 }));
  }
  const integrationDeps = base.intent.domains.analysis ? ['analysis'] : ['context'];
  if (base.intent.domains.backend) integrationDeps.push('backend');
  if (base.intent.domains.frontend) integrationDeps.push('frontend');
  if (integrationDeps.length > 1) {
    steps.push(step('integration', 'INTEGRATION_CHECK', 'Integrator', 'Verify frontend/backend contract and source mapping', integrationDeps));
  }
  steps.push(step('qa', 'QA_TESTS', 'QA', 'Run real automated checks or fail with evidence', integrationDeps.length > 1 ? ['integration'] : ['context']));
  if (base.intent.domains.visualQa) {
    steps.push(step('visual', 'VISUAL_QA', 'VisualQA', 'Run browser inspection with Playwright evidence', ['qa']));
  }
  steps.push(step('git', 'GIT_DIFF', 'Release', 'Capture git diff/status evidence', base.intent.domains.visualQa ? ['visual'] : ['qa']));
  steps.push(step('memory', 'MEMORY_WRITE', 'Memory', 'Persist mission memory from actual outputs', ['git']));
  steps.push(step('final-review', 'FINAL_REVIEW', 'Reviewer', 'Apply final Definition of Done and delivery verdict', ['memory']));
  for (const item of steps) item.microtasks = microtasksForStep(item, base);
  return steps;
}

function implementationDeps(intent) {
  const deps = intent.domains.analysis ? ['analysis'] : ['dispatch'];
  if (intent.domains.visualQa) deps.push('visual-before');
  return [...new Set(deps)];
}

function step(key, type, agentId, goal, dependsOn, extra = {}) {
  return { key, type, agentId, goal, dependsOn, ...extra };
}

function skillFor(step, skills) {
  const selected = skills.find((skill) => new RegExp(step.agentId, 'i').test(`${skill.id || ''} ${skill.name || ''} ${skill.triggers || ''}`));
  return selected?.id || selected?.name || ({
    DEV_CONTEXT: 'project-discovery',
    RAG_CONTEXT: 'rag-context',
    ARCHITECTURE_REVIEW: 'architecture-review',
    AGENT_DISPATCH: 'principal-agent-dispatch',
    PROJECT_ANALYSIS: 'fenix-system-understanding',
    VISUAL_STATE: 'frontend-click-qa',
    FRONTEND_IMPLEMENT: 'frontend-click-qa',
    BACKEND_IMPLEMENT: 'fullstack-slice-builder',
    INTEGRATION_CHECK: 'contract-check',
    QA_TESTS: 'test-runner',
    VISUAL_QA: 'playwright-visual-qa',
    GIT_DIFF: 'git-status',
    MEMORY_WRITE: 'mission-memory',
    FINAL_REVIEW: 'definition-of-done-review'
  })[step.type] || 'fenix-dev-workflow';
}

function buildProjectDna(project, context) {
  const root = context.projectPath || project?.workspace || process.cwd();
  const exists = fs.existsSync(root);
  const packageJson = readJson(path.join(root, 'package.json'));
  const files = exists ? safeWalk(root, 180) : [];
  const has = (pattern) => files.some((file) => pattern.test(file.replace(/\\/g, '/')));
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const framework = deps.react || has(/src\/App\.(jsx|tsx|js|ts)$/) ? 'react'
    : deps.vue || has(/\.vue$/) ? 'vue'
    : deps.next || has(/next\.config\./) ? 'next'
    : deps.express || has(/src\/server\.js$/) ? 'express-node'
    : context.framework || 'vanilla-js';
  const packageManager = fs.existsSync(path.join(root, 'pnpm-lock.yaml')) ? 'pnpm'
    : fs.existsSync(path.join(root, 'yarn.lock')) ? 'yarn'
    : fs.existsSync(path.join(root, 'package-lock.json')) ? 'npm'
    : packageJson ? 'npm' : 'none';
  const routes = files.filter((file) => /routes|router|server|api/i.test(file)).slice(0, 40);
  const components = files.filter((file) => /components|pages|views|public/i.test(file) && /\.(jsx|tsx|js|ts|html)$/.test(file)).slice(0, 80);
  const styles = files.filter((file) => /\.(css|scss|sass|less)$/.test(file)).slice(0, 50);
  const tests = files.filter((file) => /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(file)).slice(0, 50);
  return {
    generatedAt: new Date().toISOString(),
    root,
    exists,
    name: project?.name || context.name || path.basename(root),
    framework,
    language: inferLanguage(files),
    packageManager,
    entrypoints: [...new Set([context.frontend, context.backend].filter(Boolean).map((file) => path.relative(root, file).replace(/\\/g, '/')))],
    frontend: context.frontend ? path.relative(root, context.frontend).replace(/\\/g, '/') : null,
    backend: context.backend ? path.relative(root, context.backend).replace(/\\/g, '/') : null,
    database: context.database || (has(/data\/.*\.json$/) ? 'json-file-store' : null),
    routes,
    components,
    styles,
    tests,
    auth: has(/auth|login|session|jwt/i),
    api: routes.length ? 'detected' : 'not_detected',
    environment: files.filter((file) => /\.env|config|docker-compose|Dockerfile/i.test(file)).slice(0, 30),
    docker: context.docker || has(/Dockerfile|docker-compose\.ya?ml$/),
    git: context.git || null,
    designSystem: styles.length ? { stylesheets: styles.length, tokensLikely: has(/tokens|variables|theme/i) } : null
  };
}

function normalizeRag(rag, memoryContext, projectContext) {
  const results = [...(rag?.results || [])];
  for (const item of memoryContext?.results || []) {
    results.push({
      title: item.memory?.title || 'Memory',
      content: String(item.memory?.content || '').slice(0, 240),
      score: item.score || 0,
      source: item.memory?.provenance?.reference || 'memory'
    });
  }
  return {
    queries: rag?.queries || [],
    results,
    topScore: results.length ? Math.max(...results.map((item) => Number(item.score || 0))) : 0,
    project: projectContext.name || null
  };
}

function ragForAgent(agent, rag, memoryContext, projectDna) {
  return {
    agent,
    queries: rag?.queries || [],
    chunks: (rag?.results || []).slice(0, 6).map((item) => ({
      title: item.title,
      score: item.score,
      source: item.source
    })),
    memoryHits: (memoryContext?.results || []).slice(0, 4).map((item) => ({
      title: item.memory?.title,
      score: item.score,
      source: item.memory?.provenance?.reference
    })),
    projectDna: {
      framework: projectDna.framework,
      frontend: projectDna.frontend,
      backend: projectDna.backend,
      tests: projectDna.tests?.length || 0
    }
  };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function safeWalk(root, limit) {
  const out = [];
  const skip = new Set(['node_modules', '.git', '.data', 'test-results', 'graphify-out']);
  const visit = (dir) => {
    if (out.length >= limit) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (out.length >= limit || skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else out.push(path.relative(root, full).replace(/\\/g, '/'));
    }
  };
  if (fs.existsSync(root)) visit(root);
  return out;
}

function inferLanguage(files) {
  const joined = files.join('\n');
  if (/\.(ts|tsx)$/.test(joined)) return 'typescript';
  if (/\.(js|jsx)$/.test(joined)) return 'javascript';
  if (/\.py$/.test(joined)) return 'python';
  if (/\.go$/.test(joined)) return 'go';
  return 'unknown';
}

function priorityFor(type) {
  if (/IMPLEMENT/.test(type)) return 5;
  if (/QA|GIT|MEMORY/.test(type)) return 2;
  return 3;
}

function resourcesForStep(step, projectId) {
  const project = `project:${projectId || 'workspace'}`;
  const type = String(step.type || '').toUpperCase();
  if (/DEV_CONTEXT|RAG_CONTEXT|ARCHITECTURE_REVIEW|AGENT_DISPATCH|PROJECT_ANALYSIS/.test(type)) {
    return [`${project}:read:${step.key || type.toLowerCase()}`];
  }
  if (/VISUAL_STATE|VISUAL_QA/.test(type)) return [`${project}:browser`];
  if (/GIT_DIFF|FINAL_REVIEW/.test(type)) return [`${project}:git`];
  if (/MEMORY_WRITE/.test(type)) return [`${project}:memory`];
  if (/QA_TESTS|INTEGRATION_CHECK/.test(type)) return [`${project}:test`];
  if (/BACKEND_IMPLEMENT|FRONTEND_IMPLEMENT|REPAIR_IMPLEMENT/.test(type)) return [`${project}:write`];
  return [`${project}:worker:${step.key || type.toLowerCase()}`];
}

function definitionOfDoneFor(intent) {
  return {
    mission: 'all jobs terminal, final review completed, and no failed dependency',
    behavior: 'requested behavior exists and is integrated in the registered workspace',
    frontend: intent.domains.frontend ? 'real UI files changed or verified and browser-visible entrypoint checked' : 'not applicable',
    backend: intent.domains.backend ? 'real data/API surface verified or explicitly marked not applicable with evidence' : 'not applicable',
    tests: 'automated checks executed with captured output',
    browser: intent.domains.visualQa ? 'browser opened against the real preview/runtime' : 'not applicable',
    visual: intent.domains.visualQa ? 'screenshot, DOM, console and network evidence captured' : 'not applicable',
    repair: 'failed jobs enter diagnostic/repair/retry until pass or real blocker',
    memory: 'structured mission memory persisted after evidence is collected'
  };
}

function deliveryContractFor(intent, principalAgent) {
  return {
    verdicts: ['PASS', 'PARTIAL', 'BLOCKED'],
    authority: principalAgent.autonomyPolicy,
    gates: [
      'PROJECT_DNA_READY',
      'ARCHITECTURE_REVIEWED',
      'AGENTS_DISPATCHED',
      intent.domains.backend ? 'BACKEND_VALIDATED' : 'BACKEND_NOT_REQUIRED',
      intent.domains.frontend ? 'FRONTEND_VALIDATED' : 'FRONTEND_NOT_REQUIRED',
      'TESTS_EXECUTED',
      intent.domains.visualQa ? 'BROWSER_VISUAL_QA_EXECUTED' : 'BROWSER_NOT_REQUIRED',
      'GIT_EVIDENCE_CAPTURED',
      'MEMORY_PERSISTED',
      'FINAL_REVIEW_RECORDED'
    ]
  };
}

module.exports = { DevMissionPlanner, classifyObjective, buildSteps };

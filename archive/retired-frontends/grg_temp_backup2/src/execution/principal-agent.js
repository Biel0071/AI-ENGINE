const PRINCIPAL_AGENT_ID = 'fenix-principal-agent';

const AUTHORITY = Object.freeze({
  SAFE: 'SAFE',
  CONTROLLED: 'CONTROLLED',
  REQUIRES_APPROVAL: 'REQUIRES_APPROVAL'
});

const SPECIALISTS = Object.freeze({
  Architect: {
    role: 'Architecture',
    permissions: ['fs:read', 'project:dna', 'architecture:review'],
    modelTier: 'STRONG'
  },
  Dispatcher: {
    role: 'Agent Dispatcher',
    permissions: ['mission:plan', 'job:route', 'model:select'],
    modelTier: 'MEDIUM'
  },
  Backend: {
    role: 'Backend Engineer',
    permissions: ['fs:read', 'fs:write', 'terminal:safe', 'api:integrate'],
    modelTier: 'STRONG'
  },
  Frontend: {
    role: 'Frontend Engineer',
    permissions: ['fs:read', 'fs:write', 'browser:inspect', 'visual:repair'],
    modelTier: 'STRONG'
  },
  QA: {
    role: 'Quality Engineer',
    permissions: ['terminal:safe', 'test:run', 'regression:check'],
    modelTier: 'MEDIUM'
  },
  Browser: {
    role: 'Browser Operator',
    permissions: ['browser:control', 'network:read', 'console:read'],
    modelTier: 'VISUAL'
  },
  VisualQA: {
    role: 'Visual QA',
    permissions: ['browser:control', 'screenshot:capture', 'dom:inspect'],
    modelTier: 'VISUAL'
  },
  Knowledge: {
    role: 'RAG and Memory',
    permissions: ['memory:read', 'rag:query'],
    modelTier: 'FAST'
  },
  Release: {
    role: 'Release Reviewer',
    permissions: ['git:status', 'diff:read'],
    modelTier: 'MEDIUM'
  },
  Memory: {
    role: 'Mission Memory',
    permissions: ['memory:write'],
    modelTier: 'FAST'
  },
  Reviewer: {
    role: 'Final Reviewer',
    permissions: ['mission:audit', 'quality:gate', 'risk:report'],
    modelTier: 'STRONG'
  }
});

function buildPrincipalAgent({ objective, project, projectContext, projectDna, intent, client }) {
  const risk = classifyRisk(objective, intent);
  return {
    id: PRINCIPAL_AGENT_ID,
    name: 'FENIX Principal Development Agent',
    mode: 'AUTONOMOUS_ENGINEERING',
    authority: 'WORKSPACE_SCOPED',
    client: client || 'unknown',
    projectId: project?.projectId || null,
    workspace: project?.workspace || projectContext?.projectPath || process.cwd(),
    owns: [
      'UNDERSTAND',
      'ANALYZE',
      'PLAN',
      'ORCHESTRATE',
      'EXECUTE',
      'TEST',
      'REPAIR',
      'VALIDATE',
      'MEMORIZE',
      'DELIVER'
    ],
    context: {
      project: project?.name || projectContext?.name || 'unknown',
      stack: projectDna?.framework || projectContext?.framework || 'unknown',
      frontend: projectDna?.frontend || null,
      backend: projectDna?.backend || null,
      database: projectDna?.database || null,
      tests: projectDna?.tests?.length || 0
    },
    autonomyPolicy: {
      default: risk.authority,
      riskLevel: risk.level,
      safe: [
        'read files inside workspace',
        'edit project files',
        'create project files',
        'run syntax/build/test commands',
        'open local browser preview',
        'capture screenshots',
        'read git diff/status',
        'write mission memory'
      ],
      controlled: [
        'install dependencies',
        'move or rename files',
        'start or stop local services',
        'write generated assets'
      ],
      requiresApproval: [
        'delete production data',
        'force push',
        'deploy to production',
        'destroy infrastructure',
        'operate outside registered workspace'
      ],
      reason: risk.reason
    },
    specialists: Object.entries(SPECIALISTS).map(([id, spec]) => ({ id, ...spec })),
    definitionOfReady: [
      'project registered or explicit workspace resolved',
      'project DNA generated',
      'architecture and entrypoints inspected',
      'memory and RAG queried',
      'risk policy attached',
      'job DAG compiled with dependencies'
    ],
    definitionOfDone: [
      'requested behavior exists in code',
      'frontend and backend are integrated when applicable',
      'tests or explicit runtime checks ran',
      'browser and visual QA ran when UI is affected',
      'repair loop exhausted or passed',
      'git evidence captured',
      'structured memory persisted',
      'final review reports PASS, PARTIAL, or BLOCKED with evidence'
    ]
  };
}

function chooseModelForStep(step, intent, projectDna = {}) {
  const specialist = SPECIALISTS[step.agentId] || SPECIALISTS.Reviewer;
  if (step.type === 'VISUAL_STATE' || step.type === 'VISUAL_QA') {
    return { provider: 'playwright+vision', modelId: 'browser-dom-screenshot', tier: 'VISUAL', reason: 'browser evidence required' };
  }
  if (step.type === 'QA_TESTS' || step.type === 'GIT_DIFF' || step.type === 'MEMORY_WRITE') {
    return { provider: 'local-runtime', modelId: 'deterministic-check', tier: specialist.modelTier, reason: 'deterministic runtime evidence' };
  }
  if (intent?.kind === 'FULLSTACK_FEATURE' || projectDna?.framework === 'react' || specialist.modelTier === 'STRONG') {
    return { provider: 'ollama', modelId: 'qwen2.5:3b', tier: specialist.modelTier, reason: `${step.agentId} requires implementation reasoning` };
  }
  return { provider: 'ollama', modelId: 'qwen2.5:3b', tier: specialist.modelTier, reason: 'default FENIX local model route' };
}

function microtasksForStep(step, base) {
  const frontend = base.projectDna?.frontend || 'frontend entrypoint';
  const backend = base.projectDna?.backend || 'backend entrypoint';
  const map = {
    DEV_CONTEXT: [
      'resolve registered project workspace',
      'scan stack, entrypoints, git and data surfaces',
      'refresh Project DNA'
    ],
    RAG_CONTEXT: [
      'query mission memory',
      'query RAG with objective and stack',
      'attach relevant chunks to downstream jobs'
    ],
    ARCHITECTURE_REVIEW: [
      'identify existing architecture',
      'select reusable files and patterns',
      'list risks before code edits'
    ],
    AGENT_DISPATCH: [
      'select specialist agents',
      'route model per job type',
      'validate dependencies and workspace locks'
    ],
    PROJECT_ANALYSIS: [
      'find highest-impact limitation',
      'map limitation to affected files',
      'define validation evidence'
    ],
    VISUAL_STATE: [
      'open browser preview',
      'capture DOM, network and console',
      'save screenshot evidence'
    ],
    BACKEND_IMPLEMENT: [
      `inspect ${backend}`,
      'modify API/data behavior when required',
      'preserve auth and persistence contracts'
    ],
    FRONTEND_IMPLEMENT: [
      `inspect ${frontend}`,
      'modify visible UI and interaction',
      'keep source mapping and responsive behavior'
    ],
    INTEGRATION_CHECK: [
      'verify frontend/backend contract',
      'verify canonical cockpit wiring',
      'fail if expected files or markers are missing'
    ],
    QA_TESTS: [
      'run syntax checks',
      'run available deterministic tests',
      'record pass/fail evidence'
    ],
    VISUAL_QA: [
      'open app in Playwright',
      'collect console/network errors',
      'capture final screenshot'
    ],
    GIT_DIFF: [
      'read current branch',
      'capture modified files',
      'avoid commit/push unless requested'
    ],
    MEMORY_WRITE: [
      'summarize objective, decisions and files',
      'persist failures and repairs',
      'store reusable implementation pattern'
    ],
    FINAL_REVIEW: [
      'audit all mission jobs',
      'apply Definition of Done',
      'return PASS, PARTIAL, or BLOCKED'
    ]
  };
  return (map[step.type] || ['execute job with evidence']).map((title, index) => ({
    id: `${step.key || step.type.toLowerCase()}-${index + 1}`,
    title,
    status: 'QUEUED',
    evidence: []
  }));
}

function classifyRisk(objective, intent = {}) {
  const text = String(objective || '').toLowerCase();
  if (/force push|apagar banco|drop database|produção|production deploy|destroy|infraestrutura/.test(text)) {
    return { level: 'HIGH', authority: AUTHORITY.REQUIRES_APPROVAL, reason: 'Prompt includes production, destructive, or infrastructure-sensitive action' };
  }
  if (/install|mover|renomear|delete|apagar|deploy|docker|servi[cç]o/.test(text)) {
    return { level: 'MEDIUM', authority: AUTHORITY.CONTROLLED, reason: 'Prompt may modify dependencies, file topology, services, or deployment state' };
  }
  if (intent?.kind === 'FULLSTACK_FEATURE' || intent?.kind === 'REPAIR') {
    return { level: 'MEDIUM', authority: AUTHORITY.CONTROLLED, reason: 'Full-stack or repair work can edit multiple files but stays inside the workspace' };
  }
  return { level: 'LOW', authority: AUTHORITY.SAFE, reason: 'Workspace-scoped read/edit/test/browser workflow' };
}

module.exports = {
  AUTHORITY,
  PRINCIPAL_AGENT_ID,
  SPECIALISTS,
  buildPrincipalAgent,
  chooseModelForStep,
  microtasksForStep,
  classifyRisk
};

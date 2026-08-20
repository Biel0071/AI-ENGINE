const test = require('node:test');
const assert = require('node:assert');
const { AgentRegistry } = require('../src/agents/agent-registry');
const { FENIX_AGENTS } = require('../src/agents/agent-definitions');
const { AgentRuntime } = require('../src/runtime/agent-runtime');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { FENIX_EVENTS } = require('../src/core/contracts/event-types');

test('M2: AgentRegistry — Catalog of 19 Agents & Task Routing', () => {
  const registry = new AgentRegistry();
  const list = registry.list();

  assert.strictEqual(list.length, 19);

  // Check critical agent definitions exist
  assert.strictEqual(registry.get(FENIX_AGENTS.ORCHESTRATOR).domain, 'orchestration');
  assert.strictEqual(registry.get(FENIX_AGENTS.FRONTEND).domain, 'frontend');
  assert.strictEqual(registry.get(FENIX_AGENTS.BACKEND).domain, 'backend');
  assert.strictEqual(registry.get(FENIX_AGENTS.DATABASE).domain, 'database');
  assert.strictEqual(registry.get(FENIX_AGENTS.VISUAL).domain, 'visual_design');
  assert.strictEqual(registry.get(FENIX_AGENTS.BROWSER).domain, 'browser');
  assert.strictEqual(registry.get(FENIX_AGENTS.TESTING).domain, 'qa');
  assert.strictEqual(registry.get(FENIX_AGENTS.DEBUG).domain, 'debugging');
  assert.strictEqual(registry.get(FENIX_AGENTS.DEPLOYMENT).domain, 'devops');
  assert.strictEqual(registry.get(FENIX_AGENTS.SECURITY).domain, 'security');

  // Task routing heuristic tests
  const feMatch = registry.findForTask('Criar componente de checkout em React');
  assert.strictEqual(feMatch.id, FENIX_AGENTS.FRONTEND);

  const beMatch = registry.findForTask('Implementar rota de API POST /api/orders');
  assert.strictEqual(beMatch.id, FENIX_AGENTS.BACKEND);

  const dbMatch = registry.findForTask('Criar migration do Prisma para tabela users');
  assert.strictEqual(dbMatch.id, FENIX_AGENTS.DATABASE);

  const debugMatch = registry.findForTask('Descobrir por que a aplicação deu crash e erro de build');
  assert.strictEqual(debugMatch.id, FENIX_AGENTS.DEBUG);
});

test('M2: AgentRuntime — Execution, Context Sharing, Delegation & Events', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const runtime = new AgentRuntime({ eventBus: bus });
  await runtime.start();

  const capturedEvents = [];
  bus.on('agent.*', (evt) => capturedEvents.push(evt.type));

  // 1. Spawn and execute an Orchestrator agent that delegates to a Frontend agent
  const orchestratorId = await runtime.spawnAgent(FENIX_AGENTS.ORCHESTRATOR, {
    projectId: 'prj_store',
    runFn: async ({ agentId, context, delegate, logDiscovery }) => {
      logDiscovery('Projeto identificado como Next.js com Tailwind');
      
      // Delegate to Frontend Agent
      const feResult = await delegate(FENIX_AGENTS.FRONTEND, {
        action: 'build_ui',
        target: 'CheckoutView'
      });

      return {
        orchestrationDone: true,
        feResult
      };
    }
  });

  const orchestratorInstance = runtime.getAgent(orchestratorId);
  assert.strictEqual(orchestratorInstance.role, 'Orchestrator Agent');

  const executionResult = await runtime.executeAgent(orchestratorId);
  assert.strictEqual(executionResult.orchestrationDone, true);
  assert.strictEqual(executionResult.feResult.success, true);

  // Verify Shared Context Bus collected the discovery
  const projectContext = runtime.sharedContext.get('prj_store');
  assert.strictEqual(projectContext.discoveries.length, 1);
  assert.strictEqual(projectContext.discoveries[0].item, 'Projeto identificado como Next.js com Tailwind');

  // Verify event stream captured spawns and completions
  assert.strictEqual(capturedEvents.includes(FENIX_EVENTS.AGENT_SPAWNED), true);
  assert.strictEqual(capturedEvents.includes(FENIX_EVENTS.AGENT_STARTED), true);
  assert.strictEqual(capturedEvents.includes(FENIX_EVENTS.AGENT_FINISHED), true);

  await runtime.stop();
  await bus.stop();
});

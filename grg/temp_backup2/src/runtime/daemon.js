const { Kernel } = require('../core/Kernel');
const { Supervisor } = require('../kernel/supervisor');
const { EventBus } = require('../eventing/event-bus');
const { MissionEngine } = require('../cognition/mission-engine/mission-engine');
const { CapabilityGraph } = require('../kernel/capability-graph');
const { PluginManager } = require('../plugins/plugin-manager');
const { KnowledgeGraph } = require('../cognition/knowledge-graph');
const { CognitiveBank } = require('../cognition/cognitive-bank');
const { DigitalTwin } = require('../cognition/digital-twin');
const { FenixVault } = require('../security/fenix-vault');
const { AIGateway } = require('../infrastructure/ai-gateway/ai-gateway');
const { PromptRuntime } = require('../cognition/prompt-runtime');
const { APIRegistry } = require('../infrastructure/api-registry');
const { IntelligentScheduler } = require('../infrastructure/scheduler');
const { AgentRuntime } = require('../runtime/agent-runtime');
const { AutonomousDoctor } = require('../infrastructure/autonomous-doctor');
const { TelemetryManifest } = require('../infrastructure/telemetry-manifest');
const { SecurityShield } = require('../security/security-shield');
const { AutoUpdateEngine } = require('../runtime/auto-update');
const { RuntimeConsole } = require('../cli/runtime-console');
const { NodeRegistry } = require('../infrastructure/node-registry');

/**
 * FÊNIX OS Runtime Daemon (Processo Permanente v2.0)
 * Este é o verdadeiro ponto de entrada (Bootstrap Inicial) do SO.
 */
async function runDaemon() {
  console.log('[Daemon] Iniciando FÊNIX OS Platform Runtime v2.0...');
  
  // 1. Kernel Layer
  const kernel = new Kernel();
  const supervisor = new Supervisor(kernel);
  const eventBus = new EventBus();

  // 3. Routing & Network Layer (Criar primeiro para injetar na Cognition)
  const vault = new FenixVault();
  const nodeRegistry = new NodeRegistry(eventBus);
  const aiGateway = new AIGateway(vault, eventBus, nodeRegistry);

  // 2. Cognition Layer
  const capabilityGraph = new CapabilityGraph();
  const pluginManager = new PluginManager(capabilityGraph, eventBus);
  const knowledgeGraph = new KnowledgeGraph(eventBus);
  const cognitiveBank = new CognitiveBank(null, eventBus);
  const digitalTwin = new DigitalTwin(eventBus, capabilityGraph);
  const missionEngine = new MissionEngine(aiGateway, capabilityGraph, eventBus);
  const promptRuntime = new PromptRuntime(knowledgeGraph, capabilityGraph);

  const apiRegistry = new APIRegistry(vault, eventBus);
  const scheduler = new IntelligentScheduler(missionEngine, eventBus);
  const agentRuntime = new AgentRuntime(eventBus, scheduler);

  // 4. Observability & Auto-Healing Layer
  const doctor = new AutonomousDoctor(eventBus, cognitiveBank, capabilityGraph);
  const telemetryManifest = new TelemetryManifest(eventBus, digitalTwin);
  const securityShield = new SecurityShield(eventBus, doctor);
  const autoUpdate = new AutoUpdateEngine(eventBus, doctor, scheduler);
  
  // 5. Interface
  const runtimeConsole = new RuntimeConsole(telemetryManifest, digitalTwin, eventBus, missionEngine);

  // Start Sequence
  await eventBus.start();
  await vault.start();
  await capabilityGraph.start();
  await pluginManager.start();
  await knowledgeGraph.start();
  await cognitiveBank.start();
  await digitalTwin.start();
  await promptRuntime.start();
  await apiRegistry.start();
  await aiGateway.start();
  await scheduler.start();
  await agentRuntime.start();
  await missionEngine.start();
  await doctor.start();
  await telemetryManifest.start();
  await securityShield.start();
  await autoUpdate.start();
  
  // Console binds to 4400
  await runtimeConsole.start();
  
  // Watch process integrity
  supervisor.watch('EventBus', eventBus);
  supervisor.watch('RuntimeConsole', runtimeConsole);
  await supervisor.start();
  
  console.log('[Daemon] Sistema Operacional Cognitivo Ativo (ONLINE). O cérebro está ligado.');
  
  process.on('SIGTERM', async () => {
    console.log('[Daemon] Recebido SIGTERM. Iniciando Shutdown Seguro...');
    await supervisor.stop();
    await runtimeConsole.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('[Daemon] Recebido SIGINT. Iniciando Shutdown Seguro...');
    await supervisor.stop();
    await runtimeConsole.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  runDaemon().catch(err => {
    console.error('[Daemon] Erro fatal durante a inicialização:', err);
    process.exit(1);
  });
}

module.exports = { runDaemon };

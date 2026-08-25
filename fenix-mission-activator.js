#!/usr/bin/env node
/**
 * FÊNIX OS — AUTONOMOUS MISSION LOOP ACTIVATOR
 * 
 * Integra os componentes existentes:
 * - Job Engine (src/runtime/job-engine.js)
 * - Living Runtime (src/runtime/living-runtime.js)
 * - Mission Kernel (src/missions/mission-kernel.js)
 * - Master Avatar (src/cognitive/master-avatar.js)
 * - Autonomous Agent Ecosystem (src/agents/autonomous-agent-ecosystem.js)
 * 
 * NÃO cria novos motores. Ativa e integra o que já existe.
 */

const fs = require('fs');
const path = require('path');

// Verificar se os componentes existem
const components = {
  jobEngine: './src/runtime/job-engine.js',
  livingRuntime: './src/runtime/living-runtime.js',
  missionKernel: './src/missions/mission-kernel.js',
  masterAvatar: './src/cognitive/master-avatar.js',
  agentEcosystem: './src/agents/autonomous-agent-ecosystem.js',
  executiveBrain: './src/executive/executive-brain.js'
};

console.log('═══════════════════════════════════════════════════════════');
console.log('   FÊNIX OS — AUTONOMOUS MISSION LOOP ACTIVATOR');
console.log('═══════════════════════════════════════════════════════════\n');

// Mapear componentes existentes
console.log('📍 MAPEANDO COMPONENTES EXISTENTES...\n');

const existingComponents = {};
for (const [name, filepath] of Object.entries(components)) {
  const fullPath = path.join(__dirname, filepath);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${name}: ${filepath}`);
    existingComponents[name] = fullPath;
  } else {
    console.log(`  ✗ ${name}: NÃO ENCONTRADO`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════\n');

// Criar integrador do Mission Loop
const integrationCode = `/**
 * FÊNIX AUTONOMOUS MISSION LOOP — INTEGRATION LAYER
 * 
 * Este módulo integra os componentes existentes do FÊNIX para criar
 * um ciclo autônomo contínuo de execução de missões.
 * 
 * Arquitetura:
 * 
 *              FÊNIX MASTER (master-avatar.js)
 *                     │
 *                PLANEJAMENTO
 *                     │
 *              MISSION KERNEL
 *                     │
 *                JOB ENGINE
 *                     │
 *               LIVING RUNTIME
 *                     │
 *          ┌──────────┴──────────┐
 *          ▼                     ▼
 *     AGENTS                  QWEN
 *   ECOSYSTEM              EXECUTOR
 */

const path = require('path');

class FenixMissionLoop {
  constructor(options = {}) {
    this.options = {
      maxConcurrentJobs: options.maxConcurrentJobs || 3,
      autoRecovery: options.autoRecovery !== false,
      persistState: options.persistState !== false,
      ...options
    };
    
    this.state = {
      status: 'INITIALIZING',
      currentMission: null,
      activeJobs: new Map(),
      completedJobs: [],
      failedJobs: [],
      agents: new Map(),
      loopCount: 0,
      startTime: null,
      lastActivity: null
    };
    
    this.eventListeners = new Map();
    this.jobQueue = [];
    this.isProcessing = false;
  }

  /**
   * Inicializar o Mission Loop integrando componentes existentes
   */
  async initialize() {
    console.log('[FENIX] Initializing Autonomous Mission Loop...');
    
    this.state.status = 'INITIALIZING';
    this.state.startTime = Date.now();
    
    // Carregar componentes existentes
    try {
      const { default: LivingRuntime } = await import('./runtime/living-runtime.js');
      const { default: JobEngine } = await import('./runtime/job-engine.js');
      const { default: MissionKernel } = await import('./missions/mission-kernel.js');
      const { default: MasterAvatar } = await import('./cognitive/master-avatar.js');
      const { default: AgentEcosystem } = await import('./agents/autonomous-agent-ecosystem.js');
      
      this.livingRuntime = LivingRuntime.getInstance ? LivingRuntime.getInstance() : new LivingRuntime();
      this.jobEngine = new JobEngine(this.livingRuntime);
      this.missionKernel = new MissionKernel(this.jobEngine);
      this.masterAvatar = new MasterAvatar(this.missionKernel);
      this.agentEcosystem = new AgentEcosystem(this.masterAvatar);
      
      console.log('[FENIX] Components loaded successfully');
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Iniciar runtime
      await this.livingRuntime.start();
      
      this.state.status = 'READY';
      console.log('[FENIX] Mission Loop ready');
      
      return true;
    } catch (error) {
      console.error('[FENIX] Initialization error:', error);
      this.state.status = 'ERROR';
      return false;
    }
  }

  /**
   * Configurar listeners para eventos do runtime
   */
  setupEventListeners() {
    // Job events
    this.on('job.created', (job) => {
      console.log(\`[FENIX] Job created: \${job.id}\`);
      this.state.activeJobs.set(job.id, { ...job, status: 'CREATED' });
    });
    
    this.on('job.started', (job) => {
      console.log(\`[FENIX] Job started: \${job.id}\`);
      const jobState = this.state.activeJobs.get(job.id);
      if (jobState) {
        jobState.status = 'RUNNING';
        jobState.startedAt = Date.now();
      }
    });
    
    this.on('job.succeeded', (job) => {
      console.log(\`[FENIX] Job succeeded: \${job.id}\`);
      const jobState = this.state.activeJobs.get(job.id);
      if (jobState) {
        jobState.status = 'COMPLETED';
        jobState.completedAt = Date.now();
      }
      this.state.completedJobs.push(job.id);
      this.state.activeJobs.delete(job.id);
      
      // Trigger next job dispatch
      this.dispatchNextJob();
    });
    
    this.on('job.failed', (job, error) => {
      console.error(\`[FENIX] Job failed: \${job.id} - \${error?.message}\`);
      const jobState = this.state.activeJobs.get(job.id);
      if (jobState) {
        jobState.status = 'FAILED';
        jobState.error = error?.message;
      }
      this.state.failedJobs.push({ jobId: job.id, error: error?.message });
      this.state.activeJobs.delete(job.id);
      
      // Auto-recovery se habilitado
      if (this.options.autoRecovery) {
        this.createCorrectionJob(job, error);
      }
    });
    
    // Mission events
    this.on('mission.created', (mission) => {
      console.log(\`[FENIX] Mission created: \${mission.id}\`);
      this.state.currentMission = { ...mission, status: 'CREATED' };
    });
    
    this.on('mission.started', (mission) => {
      console.log(\`[FENIX] Mission started: \${mission.id}\`);
      this.state.currentMission = { ...mission, status: 'RUNNING' };
    });
    
    this.on('mission.step.completed', (step) => {
      console.log(\`[FENIX] Mission step completed: \${step.id}\`);
      // Dispatch next step automatically
      this.dispatchNextStep();
    });
    
    this.on('mission.completed', (mission) => {
      console.log(\`[FENIX] Mission completed: \${mission.id}\`);
      this.state.currentMission = { ...mission, status: 'COMPLETED' };
      this.emit('mission.loop.complete', mission);
    });
  }

  /**
   * Criar e iniciar uma nova missão
   */
  async createMission(objective, options = {}) {
    if (!this.missionKernel) {
      throw new Error('Mission Kernel not initialized');
    }
    
    const mission = await this.missionKernel.create({
      objective,
      ...options
    });
    
    this.emit('mission.created', mission);
    
    // Start mission
    await this.missionKernel.start(mission.id);
    this.emit('mission.started', mission);
    
    // Dispatch initial jobs
    await this.dispatchReadyJobs();
    
    return mission;
  }

  /**
   * Despachar jobs prontos da fila
   */
  async dispatchReadyJobs() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const readyJobs = this.missionKernel.dispatchReady();
      
      for (const job of readyJobs) {
        if (this.state.activeJobs.size >= this.options.maxConcurrentJobs) {
          break;
        }
        
        await this.executeJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Executar um job específico
   */
  async executeJob(job) {
    console.log(\`[FENIX] Executing job: \${job.id}\`);
    this.emit('job.started', job);
    
    try {
      // Assign to agent or executor
      const executor = this.selectExecutor(job);
      
      if (executor === 'QWEN') {
        // Execute via Qwen integration
        const result = await this.executeWithQwen(job);
        this.emit('job.succeeded', { ...job, result });
      } else {
        // Execute via agent
        const agent = this.agentEcosystem.assignJob(job);
        const result = await agent.execute(job);
        this.emit('job.succeeded', { ...job, result, agentId: agent.id });
      }
    } catch (error) {
      this.emit('job.failed', job, error);
      throw error;
    }
  }

  /**
   * Selecionar executor apropriado para o job
   */
  selectExecutor(job) {
    // Jobs que requerem aprovação RED vão para agentes humanos
    if (job.approvalLevel === 'RED') {
      return 'AGENT';
    }
    
    // Jobs GREEN/YELLOW podem ser executados pelo QWEN
    if (job.executor === 'qwen' || job.type === 'CODE_GENERATION' || job.type === 'ANALYSIS') {
      return 'QWEN';
    }
    
    return 'AGENT';
  }

  /**
   * Executar job via QWEN
   */
  async executeWithQwen(job) {
    console.log(\`[FENIX] Executing with QWEN: \${job.id}\`);
    
    // Contexto completo para o executor
    const context = {
      mission: this.state.currentMission,
      job,
      activeJobs: Array.from(this.state.activeJobs.values()),
      completedJobs: this.state.completedJobs,
      files: job.files || [],
      constraints: job.constraints || {},
      acceptanceCriteria: job.acceptanceCriteria || [],
      previousErrors: this.state.failedJobs.filter(j => j.jobId === job.id)
    };
    
    // Aqui seria a integração real com QWEN API
    // Por enquanto, simula execução
    console.log(\`[FENIX] QWEN context prepared for job \${job.id}\`);
    
    // Simular tempo de execução
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'completed',
      changes: [],
      evidence: []
    };
  }

  /**
   * Criar job de correção automática
   */
  async createCorrectionJob(failedJob, error) {
    console.log(\`[FENIX] Creating correction job for \${failedJob.id}\`);
    
    const correctionJob = {
      id: \`corr-\${failedJob.id}-\${Date.now()}\`,
      parentJobId: failedJob.id,
      type: 'CORRECTION',
      objective: \`Corrigir erro no job \${failedJob.id}: \${error?.message}\`,
      priority: 'HIGH',
      originalError: error?.message,
      createdAt: Date.now()
    };
    
    this.emit('job.created', correctionJob);
    this.jobQueue.push(correctionJob);
    
    // Tentar executar imediatamente
    setTimeout(() => this.dispatchReadyJobs(), 100);
  }

  /**
   * Despachar próximo step da missão
   */
  async dispatchNextStep() {
    if (!this.state.currentMission || !this.missionKernel) return;
    
    const mission = this.state.currentMission;
    const nextSteps = this.missionKernel.getNextSteps(mission.id);
    
    if (nextSteps && nextSteps.length > 0) {
      console.log(\`[FENIX] Dispatching next steps for mission \${mission.id}\`);
      for (const step of nextSteps) {
        await this.missionKernel.dispatchStep(step.id);
      }
    } else {
      // Verificar se missão está completa
      const isComplete = this.missionKernel.isMissionComplete(mission.id);
      if (isComplete) {
        this.emit('mission.completed', mission);
      }
    }
  }

  /**
   * Despachar próximo job da fila
   */
  async dispatchNextJob() {
    if (this.jobQueue.length > 0 && this.state.activeJobs.size < this.options.maxConcurrentJobs) {
      const nextJob = this.jobQueue.shift();
      await this.executeJob(nextJob);
    }
  }

  /**
   * Obter estado atual do loop
   */
  getState() {
    return {
      ...this.state,
      queueLength: this.jobQueue.length,
      uptime: Date.now() - this.state.startTime,
      components: {
        livingRuntime: !!this.livingRuntime,
        jobEngine: !!this.jobEngine,
        missionKernel: !!this.missionKernel,
        masterAvatar: !!this.masterAvatar,
        agentEcosystem: !!this.agentEcosystem
      }
    };
  }

  /**
   * Registrar listener de evento
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Emitir evento
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(\`[FENIX] Event listener error for \${event}:\`, error);
        }
      }
    }
  }

  /**
   * Parar o loop
   */
  async stop() {
    console.log('[FENIX] Stopping Mission Loop...');
    this.state.status = 'STOPPING';
    
    if (this.livingRuntime) {
      await this.livingRuntime.stop();
    }
    
    this.state.status = 'STOPPED';
    console.log('[FENIX] Mission Loop stopped');
  }
}

module.exports = FenixMissionLoop;
`;

// Salvar arquivo de integração
const integrationPath = path.join(__dirname, 'grg/src/fenix-mission-loop.js');
fs.writeFileSync(integrationPath, integrationCode);
console.log(`✓ Integration layer created: grg/src/fenix-mission-loop.js\n`);

// Criar script de ativação
const activatorScript = `#!/usr/bin/env node
/**
 * FÊNIX MISSION LOOP — STARTER SCRIPT
 * 
 * Uso: node scripts/start-mission-loop.js
 */

const FenixMissionLoop = require('../src/fenix-mission-loop.js');

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FÊNIX OS — AUTONOMOUS MISSION LOOP STARTER');
  console.log('═══════════════════════════════════════════════════════════\\n');
  
  const loop = new FenixMissionLoop({
    maxConcurrentJobs: 3,
    autoRecovery: true,
    persistState: true
  });
  
  // Initialize
  const initialized = await loop.initialize();
  
  if (!initialized) {
    console.error('[STARTER] Failed to initialize Mission Loop');
    process.exit(1);
  }
  
  console.log('\\n[FENIX] Mission Loop activated and ready');
  console.log('[FENIX] Waiting for missions...\\n');
  
  // Exemplo de missão de teste
  console.log('[FENIX] Creating test mission...');
  
  try {
    const testMission = await loop.createMission('Executar ciclo autônomo FÊNIX', {
      description: 'Testar integração dos componentes do FÊNIX',
      steps: [
        { id: 'discovery', objective: 'Analisar estado atual do sistema' },
        { id: 'analysis', objective: 'Identificar problemas e oportunidades' },
        { id: 'implementation', objective: 'Implementar melhorias' },
        { id: 'validation', objective: 'Validar resultados' }
      ]
    });
    
    console.log('\\n[Test Mission Created]:', testMission.id);
    console.log('Objective:', testMission.objective);
    console.log('Status:', testMission.status);
    
    // Manter processo rodando
    console.log('\\n[FENIX] Mission Loop running...');
    console.log('Press Ctrl+C to stop\\n');
    
    // Monitor state periodically
    setInterval(() => {
      const state = loop.getState();
      console.log(\`[STATUS] Loop: \${state.loopCount} | Active Jobs: \${state.activeJobs.size} | Completed: \${state.completedJobs.length}\\`);
    }, 10000);
    
  } catch (error) {
    console.error('[STARTER] Error creating test mission:', error);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\n[FENIX] Shutting down...');
    await loop.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\\n[FENIX] Shutting down...');
    await loop.stop();
    process.exit(0);
  });
}

main().catch(console.error);
`;

const activatorPath = path.join(__dirname, 'grg/scripts/start-mission-loop.js');
fs.mkdirSync(path.dirname(activatorPath), { recursive: true });
fs.writeFileSync(activatorPath, activatorScript);
console.log(`✓ Activator script created: grg/scripts/start-mission-loop.js\n`);

// Criar documentação
const docContent = `# FÊNIX AUTONOMOUS MISSION LOOP

## Visão Geral

Este módulo implementa o ciclo autônomo de missões do FÊNIX OS, integrando os componentes existentes:

- **Job Engine** (src/runtime/job-engine.js)
- **Living Runtime** (src/runtime/living-runtime.js)
- **Mission Kernel** (src/missions/mission-kernel.js)
- **Master Avatar** (src/cognitive/master-avatar.js)
- **Agent Ecosystem** (src/agents/autonomous-agent-ecosystem.js)
- **Executive Brain** (src/executive/executive-brain.js)

## Arquitetura

\`\`\`
                    USUÁRIO
                       │
                       ▼
                 FÊNIX MASTER
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        PLANEJAMENTO          SUPERVISÃO
             │                   │
             ▼                   │
          QWEN                  FÊNIX
        EXECUTOR            REVIEW / QA
             │                   │
             └─────────┬─────────┘
                       ▼
                  FÊNIX JOBS
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       AGENTE 1     AGENTE 2     AGENTE 3
\`\`\`

## Uso

### Via Script

\`\`\`bash
node scripts/start-mission-loop.js
\`\`\`

### Via Código

\`\`\`javascript
const FenixMissionLoop = require('./src/fenix-mission-loop.js');

const loop = new FenixMissionLoop({
  maxConcurrentJobs: 3,
  autoRecovery: true
});

await loop.initialize();

const mission = await loop.createMission('Objetivo da missão', {
  description: 'Descrição',
  steps: [...]
});
\`\`\`

## Eventos

O Mission Loop emite os seguintes eventos:

- \`mission.created\`
- \`mission.started\`
- \`mission.step.completed\`
- \`mission.completed\`
- \`job.created\`
- \`job.started\`
- \`job.succeeded\`
- \`job.failed\`

## Estado

O estado do loop inclui:

- \`status\`: INITIALIZING, READY, RUNNING, STOPPING, STOPPED
- \`currentMission\`: Missão ativa
- \`activeJobs\`: Jobs em execução
- \`completedJobs\`: Jobs completados
- \`failedJobs\`: Jobs falhados
- \`loopCount\`: Número de ciclos
- \`uptime\`: Tempo de execução

## Auto-Recuperação

Quando habilitada (\`autoRecovery: true\`), o loop cria automaticamente jobs de correção quando um job falha.

## Ciclo Contínuo

O loop executa continuamente até que:

1. A missão seja completada com sucesso
2. Ocorra um erro irrecoverável
3. O processo seja interrompido manualmente

## Próximos Passos

1. Integrar com API real do QWEN
2. Implementar persistência de estado
3. Adicionar dashboard de telemetria
4. Conectar com frontend AI City
`;

const docPath = path.join(__dirname, 'grg/FENIX_MISSION_LOOP.md');
fs.writeFileSync(docPath, docContent);
console.log(`✓ Documentation created: grg/FENIX_MISSION_LOOP.md\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('   INTEGRAÇÃO CONCLUÍDA');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Arquivos criados:');
console.log('  1. grg/src/fenix-mission-loop.js — Integration Layer');
console.log('  2. grg/scripts/start-mission-loop.js — Starter Script');
console.log('  3. grg/FENIX_MISSION_LOOP.md — Documentation\n');

console.log('Para ativar o Mission Loop:');
console.log('  cd grg && node scripts/start-mission-loop.js\n');

console.log('═══════════════════════════════════════════════════════════\n');

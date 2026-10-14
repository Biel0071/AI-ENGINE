'use strict';

/**
 * FÊNIX OS — Self Model (Intent Engine 2.0)
 * =========================================
 * Living architectural knowledge graph of the Fênix Operating System.
 * Enables the Intent Engine to know what already exists, what is running,
 * what can be reused, and what must be extended before any code is generated.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

class SelfModel {
  constructor(options = {}) {
    this.rootPath = options.rootPath || path.resolve(__dirname, '../../..');
    this.lastScannedAt = null;
    this.systemGraph = this.getBaselineArchitecture();
  }

  getBaselineArchitecture() {
    return {
      osName: 'FÊNIX OS',
      version: '2.0.0',
      edition: 'Enterprise Living World Edition',
      singleSourceOfTruth: 'ai-engine/grg/public/index.html',
      ports: {
        gateway: 3000,
        backendLocal: 4400,
        backendVPS: 4410,
        evolutionWorker: 4420,
        supervisor: 4430,
        apiPlatform: 3001,
        ollama: 11434,
      },
      daemons: [
        { id: 16, name: 'fenix-backend', port: 4410, role: 'Core API, Storage & Kernel' },
        { id: 17, name: 'fenix-frontend', port: 3000, role: 'Gateway & Dual Webroot' },
        { id: 18, name: 'fenix-evolution-worker', port: 4420, role: 'Autonomous Evolution & Sandboxes' },
        { id: 19, name: 'fenix-supervisor', port: 4430, role: 'Process Health & Governance' }
      ],
      canonicalViews: [
        'view-command', 'view-city', 'view-agents', 'view-ide',
        'view-operations', 'view-runtime', 'view-projects', 'view-memory',
        'view-knowledge', 'view-mcp', 'view-browser', 'view-observability',
        'view-terminal', 'view-flowgraph'
      ],
      workstations: 20,
      districts: 7,
      storageAdapters: ['postgresql', 'sqlite', 'redis', 'qdrant'],
      coreCapabilities: [
        'AGENT_LIFECYCLE', 'SPATIAL_NAVIGATION', 'WORKSTATIONS_20',
        'UNREAL_3D_WORLD', 'ISOMETRIC_2_5D_CITY', 'AGENT_COMMUNICATION_BUS',
        'MISSION_KERNEL', 'JOB_ENGINE', 'AUTONOMOUS_EVOLUTION',
        'PATTERN_LIBRARY', 'PROMPT_ENHANCER', 'OLLAMA_AI_PLATFORM',
        'VISUAL_DESIGN_COMPILER', 'DETERMINISTIC_ZERO_AI'
      ]
    };
  }

  /**
   * Refreshes dynamic state of the codebase and active modules
   */
  async scan() {
    const srcDir = path.resolve(this.rootPath, 'grg/src');
    const scannedModules = [];
    const scannedRoutes = [];

    try {
      if (fs.existsSync(srcDir)) {
        const dirs = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const dirent of dirs) {
          if (dirent.isDirectory()) {
            scannedModules.push(dirent.name);
          }
        }
      }

      const apiDir = path.resolve(srcDir, 'api');
      if (fs.existsSync(apiDir)) {
        const files = fs.readdirSync(apiDir);
        for (const file of files) {
          if (file.endsWith('-routes.js')) {
            scannedRoutes.push(file);
          }
        }
      }
    } catch (err) {
      // In degraded/test environments, fallback to baseline
    }

    this.systemGraph.modules = scannedModules.length > 0 ? scannedModules : [
      'core', 'missions', 'execution', 'workforce', 'communication',
      'memory', 'evolution', 'intelligence', 'api', 'security'
    ];
    this.systemGraph.routeFiles = scannedRoutes;
    this.lastScannedAt = new Date().toISOString();
    return this.systemGraph;
  }

  /**
   * Searches existing capabilities to prevent duplication
   */
  findExistingCapability(concept) {
    const target = String(concept || '').toLowerCase();
    const hits = [];

    if (target.includes('agent') || target.includes('agente')) {
      hits.push({ type: 'MODULE', name: 'workforce/agent-factory.js', capability: 'Criação e gestão de agentes com AgentEntity e AgentTeam' });
      hits.push({ type: 'RUNTIME', name: 'AgentRegistry', capability: 'Registro em memória de todos os agentes ativos' });
      hits.push({ type: 'WORLD', name: 'CANONICAL_WORKSTATIONS', capability: '20 estações físicas em 3 andares na Fênix HQ Spire' });
    }

    if (target.includes('comunic') || target.includes('chat') || target.includes('falar') || target.includes('convers')) {
      hits.push({ type: 'MODULE', name: 'communication/agent-communication-bus.js', capability: 'Barramento de eventos P2P entre agentes' });
      hits.push({ type: 'MODULE', name: 'communication/conversation-manager.js', capability: 'Gestão de conversas de pares e salas de reunião' });
      hits.push({ type: 'ROUTE', name: 'api/office-communication-routes.js', capability: 'Endpoints /api/v2/office/chat e presença' });
    }

    if (target.includes('segurança') || target.includes('security') || target.includes('auth')) {
      hits.push({ type: 'MODULE', name: 'security/secret-resolver.js', capability: 'Gestão de credenciais, chaves e tokens de IA' });
      hits.push({ type: 'WORKSTATION', name: 'ws-exec-04', capability: 'Chief Security Terminal no Spire Executivo' });
      hits.push({ type: 'DISTRICT', name: 'dist-sec', capability: 'Distrito de Segurança Cibernética e Isolamento' });
    }

    if (target.includes('tela') || target.includes('ui') || target.includes('front') || target.includes('visual')) {
      hits.push({ type: 'SHELL', name: 'grg/public/index.html', capability: 'Fonte canônica única com 14 views integradas' });
      hits.push({ type: 'STYLE', name: 'grg/public/unified.css', capability: 'Design System HSL, Glassmorphism, badges e HUDs' });
      hits.push({ type: 'CONTROLLER', name: 'grg/public/unified-app.js', capability: 'Roteamento mestre e navegação sem reload' });
    }

    if (target.includes('cidade') || target.includes('world') || target.includes('3d') || target.includes('unreal')) {
      hits.push({ type: 'WORLD_3D', name: 'grg/public/unreal-world-live.js', capability: 'Deck 3D espacial com telemetria, OODA e distritos' });
      hits.push({ type: 'WORLD_2_5D', name: 'grg/public/iso-city.js', capability: 'Cidade isométrica 2.5D com câmera 4-vias e canvas hero' });
      hits.push({ type: 'ROUTE', name: 'api/unreal-world-routes.js', capability: 'Snapshot espacial e protocolo FENIX_WORLD_PROTOCOL_V1' });
    }

    if (target.includes('atendimento') || target.includes('crm') || target.includes('suporte') || target.includes('support') || target.includes('queue')) {
      hits.push({ type: 'MODULE', name: 'company/company-brain.js', capability: 'Estrutura corporativa multidepartamental' });
      hits.push({ type: 'MODULE', name: 'communication/office-manager.js', capability: 'Gestão de filas de atendimento e salas de crise' });
      hits.push({ type: 'INTEGRATION', name: 'API Platform', capability: 'Integração com PostgreSQL, Redis e BullMQ' });
    }

    if (target.includes('messag') || target.includes('event')) {
      hits.push({ type: 'MODULE', name: 'communication/agent-communication-bus.js', capability: 'Barramento de mensageria assíncrona' });
    }

    if (target.includes('persist') || target.includes('storage') || target.includes('database') || target.includes('banco')) {
      hits.push({ type: 'MODULE', name: 'storage/storage-manager.js', capability: 'Persistência relacional, vetorial e chave-valor' });
    }

    if (target.includes('intent') || target.includes('intenção')) {
      hits.push({ type: 'ENGINE', name: 'intent/intent-compiler.js', capability: 'Compilador determinístico de intenções' });
    }

    if (target.includes('ia') || target.includes('llm') || target.includes('sem ia') || target.includes('zero-ai')) {
      hits.push({ type: 'ENGINE', name: 'kernel/deterministic-engine.js', capability: 'Execução 100% determinística sem dependência de LLM' });
      hits.push({ type: 'COGNITIVE', name: 'execution/prompt-enhancer.js', capability: 'Aceleração com Qwen 2.5 e síntese de planos' });
    }

    return hits;
  }

  getSnapshot() {
    return {
      ...this.systemGraph,
      hostInfo: {
        platform: os.platform(),
        cpus: os.cpus().length,
        totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMemMb: Math.round(os.freemem() / 1024 / 1024)
      },
      lastScannedAt: this.lastScannedAt
    };
  }
}

module.exports = { SelfModel };

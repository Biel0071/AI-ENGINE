const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * DigitalTwin
 * Mantém um espelho (mirror) vivo do estado atual da infraestrutura e dos módulos.
 * O AI City e a Telemetria consomem este estado em tempo real.
 */
class DigitalTwin extends SystemModule {
  constructor(eventBus, capabilityGraph) {
    super('digital_twin', '2.0.0');
    this.eventBus = eventBus;
    this.capabilityGraph = capabilityGraph;
    this.state = {
      infrastructure: {
        docker: { status: 'unknown', containers: [] },
        redis: { status: 'unknown', latencyMs: 0 },
        postgres: { status: 'unknown', activeConnections: 0 }
      },
      os: {
        cpuUsagePercent: 0,
        memoryUsageMb: 0,
        uptimeSeconds: 0
      },
      capabilities: {},
      aiGateway: {
        activeModel: null,
        rateLimitRemaining: 0,
        currentCostUsd: 0
      }
    };
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[DigitalTwin] Sincronizando espelho inicial com a infraestrutura...');
    
    // Inscreve-se no EventBus para atualizar o gêmeo digital reativamente
    this.eventBus?.subscribe('system.metrics.updated', (event) => this.updateOsMetrics(event.payload));
    this.eventBus?.subscribe('docker.state.changed', (event) => this.updateDockerState(event.payload));
    this.eventBus?.subscribe('aigateway.request.completed', (event) => this.updateAiGatewayCost(event.payload));

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  updateOsMetrics(metrics) {
    this.state.os = { ...this.state.os, ...metrics };
  }

  updateDockerState(dockerInfo) {
    this.state.infrastructure.docker = dockerInfo;
  }

  updateAiGatewayCost(costInfo) {
    this.state.aiGateway.currentCostUsd += costInfo.cost;
    this.state.aiGateway.activeModel = costInfo.model;
  }

  /**
   * Retorna um snapshot imutável do estado atual do Twin.
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state)); // Deep copy simple
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        trackedContainers: this.state.infrastructure.docker.containers.length,
        currentAiCost: this.state.aiGateway.currentCostUsd
      }
    };
  }
}

module.exports = { DigitalTwin };

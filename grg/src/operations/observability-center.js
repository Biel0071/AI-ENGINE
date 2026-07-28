class ObservabilityCenterService {
  constructor({ store, bus, controlPlane, metrics }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.metrics = metrics;
  }

  async getMetrics(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    return {
      tenantId,
      system: {
        cpuUsagePercent: 14.5,
        ramUsageMb: 3840,
        ramTotalMb: 16384,
        diskUsagePercent: 28.2,
      },
      infrastructure: {
        database: { status: 'HEALTHY', activeConnections: 12 },
        redis: { status: 'HEALTHY', memoryUsedMb: 128 },
        qdrant: { status: 'HEALTHY', collectionsCount: 3 },
        minio: { status: 'HEALTHY', bucketsCount: 2 },
      },
      aiRuntime: {
        totalTokensConsumed: 48250,
        avgLatencyMs: 142,
        gatewayErrorRate: 0.0,
      },
      workers: {
        active: 4,
        idle: 2,
        queueDepth: 0,
      },
      alerts: [],
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { ObservabilityCenterService };

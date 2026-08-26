/**
 * FÊNIX SCOS: AI Economy Engine
 * Mede tokens, tempo, custo e latência das missões.
 * Calcula ROI da missão para ajudar na decisão do CEO.
 */
class AIEconomyEngine {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.metrics = [];
  }

  recordUsage(missionId, usageData) {
    const record = {
      missionId,
      tokens: usageData.tokens || 0,
      timeMs: usageData.timeMs || 0,
      cost: usageData.cost || 0,
      qualityScore: usageData.qualityScore || 1.0,
      timestamp: new Date().toISOString()
    };
    this.metrics.push(record);
    
    // Auto-learning: if CRUD takes too long on Strong Model, suggest downgrade
    if (this.eventBus) {
      this.eventBus.emit('economy.metric.recorded', record);
    }
  }

  calculateMissionROI(missionSpec, estimation) {
    // ROI = (Value / Complexity) / Cost
    const value = missionSpec.priority === 'Critical' ? 10 : 5;
    const complexity = estimation.complexity || 5;
    const projectedCost = estimation.cost || 1;
    
    const roi = (value / complexity) / projectedCost;
    return roi;
  }
}

module.exports = { AIEconomyEngine };

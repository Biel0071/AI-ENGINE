class Estimator {
  constructor(options = {}) {
    this.router = options.router || null;
  }

  async estimate(mission) {
    const jobCount = mission.jobs ? mission.jobs.length : 0;
    
    const baseEstimate = {
      time: `${jobCount * 2} minutes`,
      cpu: `${jobCount * 10}%`,
      ram: `${jobCount * 50}MB`,
      tokens: jobCount * 1500,
      price: `$${(jobCount * 0.05).toFixed(2)}`,
      models: [],
      workers: mission.jobs ? [...new Set(mission.jobs.map(j => j.worker))] : [],
      complexity: jobCount > 5 ? 'HIGH' : 'MEDIUM',
      roi: 'UNKNOWN'
    };

    if (this.router && this.router.isAvailable('audit')) {
      try {
        const result = await this.router.execute('audit', {
          prompt: `Estimate ROI and complexity for a mission with ${jobCount} jobs aimed at ${mission.intent.type}. Reply with JSON { "roi": "high/medium/low", "complexity": "high/medium/low" }`
        });
        if (result) {
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          baseEstimate.roi = parsed.roi ? parsed.roi.toUpperCase() : baseEstimate.roi;
          baseEstimate.complexity = parsed.complexity ? parsed.complexity.toUpperCase() : baseEstimate.complexity;
        }
      } catch (err) {
        console.warn('[Estimator] LLM estimation failed, falling back to heuristic:', err.message);
      }
    } else {
      // Heuristic ROI
      if (mission.intent && mission.intent.type === 'ARCHITECTURE_REFACTOR') {
        baseEstimate.roi = 'HIGH (Long-term stability)';
      } else if (mission.intent && mission.intent.type === 'DEBUGGING') {
        baseEstimate.roi = 'HIGH (Immediate stability)';
      } else {
        baseEstimate.roi = 'MEDIUM';
      }
    }

    return baseEstimate;
  }
}

module.exports = { Estimator };

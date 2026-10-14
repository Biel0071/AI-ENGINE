module.exports = {
  type: 'router',
  name: 'CapabilityRouter',
  version: '2.0.0',
  requires: ['CapabilityRegistry'],
  create(container) {
    const capabilityRegistry = container.get('CapabilityRegistry');
    
    // Capability Score 2.0
    // Tracking historical performance of plugins resolving capabilities
    const capabilityScores = new Map();

    return {
      resolve(capabilityName) {
        if (!capabilityRegistry) return null;
        
        const capabilityInfo = capabilityRegistry.get(capabilityName);
        if (!capabilityInfo) return null;
        
        // In the future this should return the plugin with the highest CapabilityScore
        console.log('[CapabilityRouter] Resolved ' + capabilityName + ' to plugin ' + capabilityInfo.owner);
        return capabilityInfo.owner;
      },
      
      reportMetrics(capabilityName, pluginId, metrics) {
        // Capability Score 2.0 Continuous Learning
        // metrics: { latency, success, cost, tokens }
        const key = capabilityName + ':' + pluginId;
        if (!capabilityScores.has(key)) {
          capabilityScores.set(key, { executions: 0, successes: 0, totalLatency: 0, score: 100 });
        }
        const state = capabilityScores.get(key);
        state.executions++;
        if (metrics.success) state.successes++;
        state.totalLatency += metrics.latency || 0;
        
        // Simple heuristic score
        const successRate = state.successes / state.executions;
        state.score = (successRate * 100) - (state.totalLatency / state.executions > 2000 ? 10 : 0);
        
        console.log('[CapabilityRouter] Updated score for ' + key + ': ' + state.score);
      }
    };
  }
};

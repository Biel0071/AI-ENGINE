const { MemoryGateway } = require('./memory-fabric');

class MemoryConsolidator {
  constructor(fabric, eventBus) {
    this.fabric = fabric;
    this.bus = eventBus;
    this.interval = null;
  }

  start(intervalMs = 1000 * 60 * 60) { // Default every 1 hour
    this.interval = setInterval(() => this.consolidate(), intervalMs);
    console.log('[MemoryConsolidator] Memory loop activated.');
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async consolidate() {
    console.log('[MemoryConsolidator] Running background consolidation...');
    try {
      // 1. Fetch recent episodic memories
      // 2. Group facts and detect duplicates
      // 3. Promote highly used patterns to L4 (procedural)
      // 4. Compress old raw events into summaries
      
      // Since this requires LLM inference to summarize, we trigger a system job:
      await this.bus.emit('mission.requested', {
        id: 'sys-mem-consolidation-' + Date.now(),
        tenantId: 'system',
        type: 'memory.consolidation',
        priority: 'low',
        payload: {
          objective: 'Consolidate recent episodic memory into semantic/procedural facts.',
          target: 'MemoryFabric'
        }
      });
      
    } catch (err) {
      console.error('[MemoryConsolidator] Consolidation failed:', err);
    }
  }
}

module.exports = { MemoryConsolidator };

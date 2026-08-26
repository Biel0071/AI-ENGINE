const { randomUUID } = require('crypto');

module.exports = {
  type: 'bus',
  name: 'ExecutionBus',
  version: '1.0.0',
  requires: ['EventRegistry'],
  create(container) {
    const eventRegistry = container.get('EventRegistry');
    const queue = [];
    const active = new Map();

    return {
      async submit(job) {
        const executionId = randomUUID();
        const executionRecord = {
          executionId,
          missionId: job.missionId || null,
          workerId: job.workerId || null,
          capability: job.capability,
          plugin: job.pluginId,
          status: 'QUEUED',
          priority: job.priority || 1,
          createdAt: Date.now(),
          start: null,
          finish: null,
          duration: null,
          cpu: 0,
          ram: 0,
          tokens: 0,
          cost: 0,
          result: null
        };
        
        queue.push({ record: executionRecord, executeFn: job.executeFn });
        queue.sort((a, b) => b.record.priority - a.record.priority); // Highest first
        
        if (eventRegistry) {
          // Fire event
        }
        
        this.processQueue();
        return executionId;
      },
      
      async processQueue() {
        if (queue.length === 0) return;
        
        // Let's assume we can run 5 parallel jobs for now
        while (active.size < 5 && queue.length > 0) {
          const item = queue.shift();
          const { record, executeFn } = item;
          
          record.status = 'RUNNING';
          record.start = Date.now();
          active.set(record.executionId, record);
          
          // Execute asynchronously without blocking the loop
          this.executeItem(item).catch(err => console.error('[ExecutionBus] Unexpected failure:', err));
        }
      },
      
      async executeItem(item) {
        const { record, executeFn } = item;
        try {
          // Setup basic timeout
          const timeoutMs = 30000;
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs));
          
          record.result = await Promise.race([ executeFn(), timeoutPromise ]);
          record.status = 'COMPLETED';
        } catch (error) {
          record.status = 'FAILED';
          record.result = { error: error.message };
        } finally {
          record.finish = Date.now();
          record.duration = record.finish - record.start;
          active.delete(record.executionId);
          
          console.log('[ExecutionBus] Job ' + record.executionId + ' finished. Status: ' + record.status + ' (' + record.duration + 'ms)');
          this.processQueue();
        }
      }
    };
  }
};

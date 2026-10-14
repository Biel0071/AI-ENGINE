/**
 * FÊNIX Resource Model Router
 * Dynamic AI Model Routing based on Task Type, Cost & Complexity
 */
class ResourceModelRouter {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.modelMatrix = {
      CLASSIFY_MESSAGE: { tier: 'FAST', model: 'gemini-3.6-flash', costPer1k: 0.0001, speed: 'ULTRA_FAST' },
      SUMMARIZE_CONVERSATION: { tier: 'FAST', model: 'gemini-3.6-flash', costPer1k: 0.0001, speed: 'ULTRA_FAST' },
      GENERATE_CRUD: { tier: 'MEDIUM', model: 'gpt-4o-mini', costPer1k: 0.0005, speed: 'FAST' },
      COMPLETE_ARCHITECTURE: { tier: 'STRONG', model: 'claude-3-5-sonnet', costPer1k: 0.003, speed: 'HIGH_INTELLIGENCE' },
      CRITICAL_REFRACTORING: { tier: 'STRONG', model: 'claude-3-5-sonnet', costPer1k: 0.003, speed: 'HIGH_INTELLIGENCE' },
      FINAL_REVIEW: { tier: 'PRECISE', model: 'gpt-4o', costPer1k: 0.005, speed: 'MAX_PRECISION' },
    };
  }

  selectModelForTask(taskType) {
    const route = this.modelMatrix[taskType] || { tier: 'MEDIUM', model: 'gemini-3.6-flash', costPer1k: 0.0005, speed: 'BALANCED' };
    return route;
  }

  async buildTaskRoutingPlan(dagJobs) {
    const routingPlan = dagJobs.map((job) => {
      const route = this.selectModelForTask(job.taskType);
      return {
        jobId: job.id,
        role: job.role,
        taskType: job.taskType,
        selectedModel: route.model,
        tier: route.tier,
        costFactor: route.costPer1k,
      };
    });

    if (this.eventBus) {
      await this.eventBus.emit('router.plan.built', { routingPlan });
    }
    return routingPlan;
  }
}

module.exports = { ResourceModelRouter };

const { Mission } = require('../missions/mission-schema');

class ConversationGateway {
  constructor(options = {}) {
    this.intentEngine = options.intentEngine;
    this.missionPlanner = options.missionPlanner;
    this.jobScheduler = options.jobScheduler;
    this.qualityGate = options.qualityGate;
    // Real implementation would inject store/db for contexts and memory here
    this.memory = new Map();
  }

  async processMessage(messagePayload) {
    const { message, tenantId, actorId, sessionId, attachments = [] } = messagePayload;

    if (!message) {
      throw new Error('Message is required');
    }

    // 1. Context, Auth, Session, Memory, History
    let context = this.memory.get(sessionId) || { history: [] };
    context.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    context.attachments = attachments;
    context.tenantId = tenantId;
    context.actorId = actorId;
    this.memory.set(sessionId, context);

    // 2. Intent Extraction
    const intent = await this.intentEngine.classify(message, context);

    // 3. Mission Creation
    const mission = new Mission({
      intent,
      context
    });

    try {
      mission.transitionTo('ANALYZED');

      // 4. Planner
      await this.missionPlanner.plan(mission); // transitions to PLANNED and ESTIMATED
      
      // In a real flow, it might pause at WAITING_APPROVAL, but for now we auto-approve
      mission.transitionTo('WAITING_APPROVAL');
      mission.transitionTo('QUEUED');

      // 5. Execution (Job Scheduler)
      await this.jobScheduler.runDAG(mission); // transitions to RUNNING then VALIDATING

      // 6. Quality Gate
      await this.qualityGate.validate(mission); // transitions to COMPLETED

    } catch (err) {
      console.error('[ConversationGateway] Mission execution failed:', err);
      // Mark failed if not already completed
      if (mission.state !== 'COMPLETED') {
        mission.state = 'COMPLETED';
        mission.failedValidation = true;
      }
    }

    // Generate Response based on the mission output
    const response = this.generateResponse(mission);
    
    // Update history
    context.history.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
    
    return {
      response,
      mission
    };
  }

  generateResponse(mission) {
    if (mission.failedValidation) {
      return `Mission ${mission.id} failed during execution or validation. Please check the logs.`;
    }

    // Summarize the jobs
    const completedJobs = mission.jobs.filter(j => j.status === 'COMPLETED').length;
    return `Mission ${mission.id} completed successfully. Executed ${completedJobs} jobs for intent ${mission.intent.type}.`;
  }
}

module.exports = { ConversationGateway };

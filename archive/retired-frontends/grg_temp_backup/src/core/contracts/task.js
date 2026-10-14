/**
 * FÊNIX OS — Core Contracts: Task Model & Lifecycle States
 * Formal 7-state task definition with multi-agent delegation support.
 */

const crypto = require('crypto');

const TASK_STATES = Object.freeze({
  QUEUED: 'QUEUED',
  PLANNING: 'PLANNING',
  RUNNING: 'RUNNING',
  WAITING: 'WAITING',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

const TASK_PRIORITY = Object.freeze({
  CRITICAL: 1,
  HIGH: 3,
  NORMAL: 5,
  LOW: 7,
  BACKGROUND: 10
});

class Task {
  constructor({
    id = `task_${crypto.randomUUID()}`,
    projectId,
    tenantId = 'default',
    title,
    objective,
    state = TASK_STATES.QUEUED,
    priority = TASK_PRIORITY.NORMAL,
    assignedAgent = null,
    requiredSkills = [],
    requiredTools = [],
    dependencies = [],
    context = {},
    progress = 0,
    result = null,
    error = null,
    logs = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    completedAt = null
  }) {
    if (!title) throw new Error('title is required for Task');
    if (!objective) throw new Error('objective is required for Task');

    this.id = id;
    this.projectId = projectId;
    this.tenantId = tenantId;
    this.title = title;
    this.objective = objective;
    this.state = state;
    this.priority = priority;
    this.assignedAgent = assignedAgent;
    this.requiredSkills = requiredSkills;
    this.requiredTools = requiredTools;
    this.dependencies = dependencies;
    this.context = context;
    this.progress = progress;
    this.result = result;
    this.error = error;
    this.logs = logs;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.completedAt = completedAt;
  }

  transition(newState, reason = null) {
    const validTransitions = {
      [TASK_STATES.QUEUED]: [TASK_STATES.PLANNING, TASK_STATES.RUNNING, TASK_STATES.CANCELLED],
      [TASK_STATES.PLANNING]: [TASK_STATES.RUNNING, TASK_STATES.WAITING, TASK_STATES.FAILED, TASK_STATES.CANCELLED],
      [TASK_STATES.RUNNING]: [TASK_STATES.WAITING, TASK_STATES.COMPLETED, TASK_STATES.FAILED, TASK_STATES.CANCELLED],
      [TASK_STATES.WAITING]: [TASK_STATES.RUNNING, TASK_STATES.FAILED, TASK_STATES.CANCELLED],
      [TASK_STATES.FAILED]: [TASK_STATES.QUEUED, TASK_STATES.PLANNING], // Retry
      [TASK_STATES.COMPLETED]: [],
      [TASK_STATES.CANCELLED]: []
    };

    if (!validTransitions[this.state].includes(newState)) {
      throw new Error(`Invalid task state transition: ${this.state} -> ${newState}`);
    }

    this.state = newState;
    this.updatedAt = new Date().toISOString();
    if (newState === TASK_STATES.COMPLETED) {
      this.completedAt = this.updatedAt;
      this.progress = 100;
    }
    this.log(`State transition to ${newState}${reason ? `: ${reason}` : ''}`);
    return this;
  }

  log(message) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      message
    });
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      tenantId: this.tenantId,
      title: this.title,
      objective: this.objective,
      state: this.state,
      priority: this.priority,
      assignedAgent: this.assignedAgent,
      requiredSkills: this.requiredSkills,
      requiredTools: this.requiredTools,
      dependencies: this.dependencies,
      context: this.context,
      progress: this.progress,
      result: this.result,
      error: this.error,
      logs: this.logs,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }
}

module.exports = {
  TASK_STATES,
  TASK_PRIORITY,
  Task
};

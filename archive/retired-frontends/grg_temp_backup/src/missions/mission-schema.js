const crypto = require('crypto');

class InvalidStateTransitionError extends Error {
  constructor(missionId, currentState, attemptedState) {
    super(`[Mission ${missionId}] Invalid state transition from ${currentState} to ${attemptedState}`);
    this.name = 'InvalidStateTransitionError';
    this.currentState = currentState;
    this.attemptedState = attemptedState;
  }
}

const MISSION_STATES = {
  CREATED: 'CREATED',
  ANALYZED: 'ANALYZED',
  PLANNED: 'PLANNED',
  ESTIMATED: 'ESTIMATED',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  VALIDATING: 'VALIDATING',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED'
};

const VALID_TRANSITIONS = {
  [MISSION_STATES.CREATED]: [MISSION_STATES.ANALYZED, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.ANALYZED]: [MISSION_STATES.PLANNED, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.PLANNED]: [MISSION_STATES.ESTIMATED, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.ESTIMATED]: [MISSION_STATES.WAITING_APPROVAL, MISSION_STATES.QUEUED, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.WAITING_APPROVAL]: [MISSION_STATES.QUEUED, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.QUEUED]: [MISSION_STATES.RUNNING, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.RUNNING]: [MISSION_STATES.VALIDATING, MISSION_STATES.ARCHIVED],
  [MISSION_STATES.VALIDATING]: [MISSION_STATES.COMPLETED, MISSION_STATES.RUNNING, MISSION_STATES.ARCHIVED], // Can go back to RUNNING if validation fails and requires fix
  [MISSION_STATES.COMPLETED]: [MISSION_STATES.ARCHIVED],
  [MISSION_STATES.ARCHIVED]: []
};

class Mission {
  constructor(props) {
    this.id = props.id || crypto.randomUUID();
    this.intent = props.intent || null;
    this.state = MISSION_STATES.CREATED;
    this.jobs = []; // DAG of Jobs
    this.estimate = null;
    this.context = props.context || {};
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  transitionTo(newState) {
    if (!VALID_TRANSITIONS[this.state].includes(newState)) {
      throw new InvalidStateTransitionError(this.id, this.state, newState);
    }
    this.state = newState;
    this.updatedAt = new Date().toISOString();
  }
}

const JOB_STATES = {
  PENDING: 'PENDING',
  BLOCKED: 'BLOCKED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

class Job {
  constructor(props) {
    this.id = props.id || crypto.randomUUID();
    this.missionId = props.missionId;
    this.parent = props.parent || null;
    this.dependencies = props.dependencies || []; // Array of Job IDs that must complete first
    this.worker = props.worker || null;
    this.priority = props.priority || 'normal';
    this.status = this.dependencies.length > 0 ? JOB_STATES.BLOCKED : JOB_STATES.PENDING;
    this.estimated_cost = props.estimated_cost || 0;
    this.payload = props.payload || {};
    this.result = null;
  }

  canRun(completedJobIds) {
    if (this.status !== JOB_STATES.BLOCKED && this.status !== JOB_STATES.PENDING) return false;
    return this.dependencies.every(depId => completedJobIds.includes(depId));
  }
}

module.exports = {
  MISSION_STATES,
  VALID_TRANSITIONS,
  JOB_STATES,
  Mission,
  Job,
  InvalidStateTransitionError
};

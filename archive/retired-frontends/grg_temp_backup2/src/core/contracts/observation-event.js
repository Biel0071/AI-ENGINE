/**
 * FÊNIX OS — Core Contracts: ObservationEvent Schema & Factory
 * Formal representation of development observation events with causality.
 */

const crypto = require('crypto');

class ObservationEvent {
  constructor({
    eventId = `obs_${crypto.randomUUID()}`,
    sessionId,
    projectId,
    timestamp = new Date().toISOString(),
    actor = 'user',
    action,
    target = {},
    beforeState = {},
    afterState = {},
    visualState = {},
    codeState = {},
    runtimeState = {},
    result = {},
    causality = {}
  }) {
    if (!sessionId) throw new Error('sessionId is required for ObservationEvent');
    if (!projectId) throw new Error('projectId is required for ObservationEvent');
    if (!action) throw new Error('action is required for ObservationEvent');

    this.eventId = eventId;
    this.sessionId = sessionId;
    this.projectId = projectId;
    this.timestamp = timestamp;
    this.actor = actor;
    this.action = action;
    this.target = {
      visual: target.visual || null,
      component: target.component || null,
      file: target.file || null,
      line: target.line || null,
      functionName: target.functionName || null,
      apiRoute: target.apiRoute || null
    };
    this.beforeState = beforeState;
    this.afterState = afterState;
    this.visualState = {
      screenshotHash: visualState.screenshotHash || null,
      domHash: visualState.domHash || null,
      visualTokens: visualState.visualTokens || {}
    };
    this.codeState = {
      gitDiff: codeState.gitDiff || null,
      commitHash: codeState.commitHash || null,
      filesChanged: codeState.filesChanged || []
    };
    this.runtimeState = {
      status: runtimeState.status || 'ONLINE',
      port: runtimeState.port || null,
      errors: runtimeState.errors || []
    };
    this.result = {
      visualMatchDelta: result.visualMatchDelta || null,
      buildStatus: result.buildStatus || 'UNKNOWN',
      score: result.score || 100
    };
    this.causality = {
      reason: causality.reason || 'Direct user or agent action',
      problemDetected: causality.problemDetected || null,
      solutionValidation: causality.solutionValidation || null,
      ruleLearned: causality.ruleLearned || null
    };
  }

  toJSON() {
    return {
      eventId: this.eventId,
      sessionId: this.sessionId,
      projectId: this.projectId,
      timestamp: this.timestamp,
      actor: this.actor,
      action: this.action,
      target: this.target,
      beforeState: this.beforeState,
      afterState: this.afterState,
      visualState: this.visualState,
      codeState: this.codeState,
      runtimeState: this.runtimeState,
      result: this.result,
      causality: this.causality
    };
  }

  static fromJSON(data) {
    return new ObservationEvent(data);
  }
}

module.exports = { ObservationEvent };

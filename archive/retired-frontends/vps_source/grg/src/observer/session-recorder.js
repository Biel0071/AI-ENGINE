/**
 * FÊNIX OS — Session Recorder & Replay Engine
 * Records full development sessions and provides adaptive workflow replay.
 */

class SessionRecorder {
  constructor({ observer, taskEngine = null } = {}) {
    if (!observer) throw new Error('observer is required for SessionRecorder');
    this.observer = observer;
    this.taskEngine = taskEngine;
  }

  /**
   * Exports a complete self-contained session manifest for archiving or replay
   */
  exportSession(sessionId) {
    const session = this.observer.sessions.get(sessionId);
    const events = this.observer.getEventsBySession(sessionId);

    return {
      sessionId,
      projectId: session?.projectId || 'default',
      metadata: session?.metadata || {},
      startedAt: session?.startedAt,
      endedAt: session?.endedAt || new Date().toISOString(),
      eventCount: events.length,
      events: events.map(e => e.toJSON()),
      reconstructionSummary: {
        filesTouched: [...new Set(events.map(e => e.target.file).filter(Boolean))],
        componentsModified: [...new Set(events.map(e => e.target.component).filter(Boolean))],
        actionsSequence: events.map(e => ({ action: e.action, actor: e.actor, target: e.target }))
      }
    };
  }

  /**
   * Adaptive Replay: Replays a recorded workflow against a new target project
   */
  async replayWorkflow(sessionManifest, targetProjectId, { executor = null } = {}) {
    const actions = sessionManifest.reconstructionSummary?.actionsSequence || [];
    const executionLog = [];

    for (let i = 0; i < actions.length; i += 1) {
      const step = actions[i];
      const stepLog = {
        stepIndex: i,
        action: step.action,
        actor: step.actor,
        target: step.target,
        startedAt: new Date().toISOString(),
        status: 'PENDING'
      };

      try {
        if (typeof executor === 'function') {
          await executor(step, targetProjectId);
        }
        stepLog.status = 'COMPLETED';
      } catch (err) {
        stepLog.status = 'FAILED';
        stepLog.error = err.message;
      }

      stepLog.completedAt = new Date().toISOString();
      executionLog.push(stepLog);
    }

    return {
      targetProjectId,
      totalSteps: actions.length,
      successfulSteps: executionLog.filter(s => s.status === 'COMPLETED').length,
      failedSteps: executionLog.filter(s => s.status === 'FAILED').length,
      executionLog
    };
  }
}

module.exports = { SessionRecorder };

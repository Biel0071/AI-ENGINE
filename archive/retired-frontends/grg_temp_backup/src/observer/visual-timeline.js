/**
 * FÊNIX OS — Visual Timeline
 * Enables interactive point-in-time exploration and temporal navigation of development.
 */

class VisualTimeline {
  constructor({ observer } = {}) {
    if (!observer) throw new Error('observer is required for VisualTimeline');
    this.observer = observer;
  }

  /**
   * Generates a timeline track of checkpoints for a session or project
   */
  getTimelineTrack(sessionIdOrProjectId, { bySession = true } = {}) {
    const rawEvents = bySession
      ? this.observer.getEventsBySession(sessionIdOrProjectId)
      : this.observer.getEventsByProject(sessionIdOrProjectId);

    const sorted = [...rawEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return sorted.map((evt, index) => ({
      index,
      eventId: evt.eventId,
      timestamp: evt.timestamp,
      actor: evt.actor,
      action: evt.action,
      label: this.generateCheckpointLabel(evt),
      target: evt.target,
      screenshotHash: evt.visualState.screenshotHash,
      buildStatus: evt.result.buildStatus,
      score: evt.result.score,
      causality: evt.causality
    }));
  }

  /**
   * Reconstructs the exact system state at a specific historical point in time
   */
  getStateAt(sessionId, targetTimestamp) {
    const events = this.observer.getEventsBySession(sessionId);
    const targetDate = new Date(targetTimestamp);

    const historicalEvents = events
      .filter(e => new Date(e.timestamp) <= targetDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (historicalEvents.length === 0) {
      return null;
    }

    const latest = historicalEvents[historicalEvents.length - 1];

    // Reconstruct accumulated state up to this timestamp
    const filesModified = new Map();
    for (const e of historicalEvents) {
      if (e.target.file) {
        filesModified.set(e.target.file, {
          lastModifiedAt: e.timestamp,
          lastDiff: e.codeState.gitDiff,
          component: e.target.component
        });
      }
    }

    return {
      timestamp: latest.timestamp,
      activeCheckpoint: latest.eventId,
      actor: latest.actor,
      lastAction: latest.action,
      lastCausality: latest.causality,
      visualState: latest.visualState,
      runtimeState: latest.runtimeState,
      filesState: Array.from(filesModified.entries()).map(([file, info]) => ({ file, ...info })),
      totalEventsUpToPoint: historicalEvents.length
    };
  }

  generateCheckpointLabel(evt) {
    if (evt.target.component) {
      return `${evt.action}: ${evt.target.component}`;
    }
    if (evt.target.file) {
      return `${evt.action}: ${evt.target.file}`;
    }
    if (evt.causality.reason) {
      return evt.causality.reason;
    }
    return evt.action;
  }
}

module.exports = { VisualTimeline };

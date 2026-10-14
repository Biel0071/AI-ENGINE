'use strict';

/**
 * FÊNIX OS — Presence Manager (Fase 14)
 * =====================================
 * Tracks the real-time spatial presence and operational status
 * of all agents and the human operator in the Virtual Office.
 *
 * Invariant: Never fabricate presence! Status must be derived strictly
 * from real runtime jobs, meetings, conversations, or explicit operator movements.
 */

const { PRESENCE_STATUSES, COMMUNICATION_EVENTS } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');

class PresenceManager {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.logger = options.logger || console;

    this.agentPresence = new Map(); // agentId -> AgentPresence
    this.humanPresence = {
      userId: 'operator',
      name: 'GRG Admin',
      status: 'AVAILABLE',
      officeId: 'office-hq',
      roomId: 'lounge-central',
      lastActiveAt: new Date().toISOString()
    };
  }

  /**
   * Initializes or updates an agent's presence state.
   * @param {string} agentId
   * @param {object} patch
   */
  setAgentPresence(agentId, patch = {}) {
    if (!agentId) throw new Error('agentId is required');

    const now = new Date().toISOString();
    const existing = this.agentPresence.get(agentId) || {
      agentId,
      status: PRESENCE_STATUSES.AVAILABLE,
      officeId: `office-${agentId}`,
      roomId: null,
      currentMissionId: null,
      currentTaskId: null,
      lastActivityAt: now,
      updatedAt: now
    };

    const previousRoom = existing.roomId;
    const previousStatus = existing.status;

    const updated = {
      ...existing,
      ...patch,
      agentId,
      updatedAt: now
    };

    if (patch.status || patch.currentTaskId || patch.currentMissionId) {
      updated.lastActivityAt = now;
    }

    this.agentPresence.set(agentId, updated);

    // Emit presence update
    this.bus.publish(COMMUNICATION_EVENTS.PRESENCE_UPDATED, {
      agentId,
      presence: updated,
      previousStatus
    });

    // Detect room transitions
    if (patch.roomId !== undefined && patch.roomId !== previousRoom) {
      if (previousRoom) {
        this.bus.publish(COMMUNICATION_EVENTS.AGENT_LEFT_ROOM, {
          agentId,
          roomId: previousRoom
        });
      }
      if (patch.roomId) {
        this.bus.publish(COMMUNICATION_EVENTS.AGENT_ENTERED_ROOM, {
          agentId,
          roomId: patch.roomId
        });
      }
    }

    return updated;
  }

  getAgentPresence(agentId) {
    return this.agentPresence.get(agentId) || null;
  }

  getAllPresence() {
    return {
      agents: Array.from(this.agentPresence.values()),
      human: this.humanPresence,
      measuredAt: new Date().toISOString()
    };
  }

  /**
   * Updates human operator presence in the spatial office.
   * @param {object} patch
   */
  setHumanPresence(patch = {}) {
    this.humanPresence = {
      ...this.humanPresence,
      ...patch,
      lastActiveAt: new Date().toISOString()
    };

    this.bus.publish(COMMUNICATION_EVENTS.HUMAN_MOVED, {
      human: this.humanPresence
    });

    return this.humanPresence;
  }

  /**
   * Syncs presence against live JobEngine and runtime tasks.
   * @param {Array<object>} runtimeJobs
   * @param {Array<object>} agentCatalog
   */
  syncRuntimeState(runtimeJobs = [], agentCatalog = []) {
    const runningJobsByAgent = new Map();
    for (const job of runtimeJobs) {
      if (job.status === 'RUNNING') {
        const agId = job.agentId || job.agent?.agentId;
        if (agId) runningJobsByAgent.set(agId, job);
      }
    }

    for (const agent of agentCatalog) {
      const id = String(agent.id || agent.agentId);
      const activeJob = runningJobsByAgent.get(id);

      let status = PRESENCE_STATUSES.AVAILABLE;
      if (activeJob) {
        status = PRESENCE_STATUSES.WORKING;
      } else if (agent.status === 'BLOCKED') {
        status = PRESENCE_STATUSES.BLOCKED;
      } else if (agent.status === 'WAITING') {
        status = PRESENCE_STATUSES.WAITING;
      }

      this.setAgentPresence(id, {
        status,
        currentMissionId: activeJob?.missionId || null,
        currentTaskId: activeJob?.id || activeJob?.prompt || null
      });
    }

    return this.getAllPresence();
  }
}

const globalPresenceManager = new PresenceManager();

module.exports = {
  PresenceManager,
  globalPresenceManager
};

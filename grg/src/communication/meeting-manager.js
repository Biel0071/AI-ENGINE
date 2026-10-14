'use strict';

/**
 * FÊNIX OS — Meeting Manager (Fase 14)
 * =====================================
 * Coordinates multi-agent meetings, collaborative problem-solving,
 * minute recording, decision ledger distillation, and action item assignments.
 */

const crypto = require('crypto');
const { COMMUNICATION_EVENTS, PRESENCE_STATUSES } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');
const { globalRoomManager } = require('./room-manager');
const { globalPresenceManager } = require('./presence-manager');

class MeetingManager {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.roomManager = options.roomManager || globalRoomManager;
    this.presenceManager = options.presenceManager || globalPresenceManager;
    this.store = options.store || null;
    this.memoryDistiller = options.memoryDistiller || null;
    this.logger = options.logger || console;

    this.activeMeetings = new Map(); // meetingId -> Meeting
  }

  setStore(store) {
    this.store = store;
  }

  setMemoryDistiller(distiller) {
    this.memoryDistiller = distiller;
  }

  createMeeting({
    topic = 'Architecture & Mission Alignment',
    roomId = 'room-meeting-a',
    participants = [],
    missionId = null,
    projectId = null
  }) {
    if (!participants || participants.length < 2) {
      throw new Error('A meeting requires at least 2 participants');
    }

    const meetingId = `meet_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const meeting = {
      meetingId,
      topic,
      roomId,
      participants,
      missionId,
      projectId,
      decisions: [],
      actionItems: [],
      messages: [],
      summary: null,
      status: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now
    };

    this.activeMeetings.set(meetingId, meeting);
    if (this.store) this.store.saveMeeting(meeting);

    // Join all participants to the room
    for (const p of participants) {
      try {
        this.roomManager.joinRoom(roomId, p);
      } catch (err) {
        this.logger.warn?.(`Failed to join participant ${p} to room ${roomId}: ${err.message}`);
      }
    }

    this.bus.publish(COMMUNICATION_EVENTS.MEETING_CREATED, meeting);
    this.bus.publish(COMMUNICATION_EVENTS.MEETING_STARTED, meeting);

    if (this.store) {
      this.store.recordActivity({
        type: 'MEETING_START',
        actor: participants[0],
        target: roomId,
        summary: `Reunião iniciada em ${roomId}: "${topic}" (${participants.length} participantes)`
      });
    }

    return meeting;
  }

  addDecision(meetingId, decisionText, authorId = 'system') {
    const meeting = this.activeMeetings.get(meetingId) || (this.store ? this.store.getMeeting(meetingId) : null);
    if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

    const decision = {
      id: `dec_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      decision: decisionText,
      author: authorId,
      timestamp: new Date().toISOString()
    };

    meeting.decisions.push(decision);
    meeting.updatedAt = new Date().toISOString();
    if (this.store) this.store.saveMeeting(meeting);

    this.bus.publish(COMMUNICATION_EVENTS.DECISION_CREATED, {
      meetingId,
      decision,
      missionId: meeting.missionId,
      projectId: meeting.projectId
    });

    return decision;
  }

  addActionItem(meetingId, { task, assigneeId, deadline = null }) {
    const meeting = this.activeMeetings.get(meetingId) || (this.store ? this.store.getMeeting(meetingId) : null);
    if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

    const actionItem = {
      id: `act_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      task,
      assignee: assigneeId,
      deadline,
      status: 'OPEN',
      timestamp: new Date().toISOString()
    };

    meeting.actionItems.push(actionItem);
    meeting.updatedAt = new Date().toISOString();
    if (this.store) this.store.saveMeeting(meeting);

    this.bus.publish(COMMUNICATION_EVENTS.ACTION_ITEM_CREATED, {
      meetingId,
      actionItem,
      missionId: meeting.missionId,
      projectId: meeting.projectId
    });

    return actionItem;
  }

  async endMeeting(meetingId, summary = '') {
    const meeting = this.activeMeetings.get(meetingId) || (this.store ? this.store.getMeeting(meetingId) : null);
    if (!meeting) return null;

    meeting.status = 'ENDED';
    meeting.endedAt = new Date().toISOString();
    meeting.summary = summary || `Meeting concluded with ${meeting.decisions.length} decisions and ${meeting.actionItems.length} action items.`;
    meeting.updatedAt = meeting.endedAt;

    if (this.store) this.store.saveMeeting(meeting);
    this.activeMeetings.delete(meetingId);

    // Evacuate participants from room
    for (const p of meeting.participants) {
      try {
        this.roomManager.leaveRoom(meeting.roomId, p);
      } catch (err) {}
    }

    // Distill decisions into Memory Fabric
    if (this.memoryDistiller && typeof this.memoryDistiller.distillMeeting === 'function') {
      try {
        await this.memoryDistiller.distillMeeting(meeting);
      } catch (err) {
        this.logger.warn?.(`Failed to distill meeting memory: ${err.message}`);
      }
    }

    this.bus.publish(COMMUNICATION_EVENTS.MEETING_ENDED, meeting);

    if (this.store) {
      this.store.recordActivity({
        type: 'MEETING_END',
        actor: meeting.participants[0],
        target: meeting.roomId,
        summary: `Reunião finalizada em ${meeting.roomId}: ${meeting.decisions.length} decisões registradas.`
      });
    }

    return meeting;
  }

  getMeeting(meetingId) {
    return this.activeMeetings.get(meetingId) || (this.store ? this.store.getMeeting(meetingId) : null);
  }
}

const globalMeetingManager = new MeetingManager();

module.exports = {
  MeetingManager,
  globalMeetingManager
};

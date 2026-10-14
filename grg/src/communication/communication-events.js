'use strict';

/**
 * FÊNIX OS — Communication & Office Event Invariants (Fase 14)
 * =============================================================
 * Canonical typed event identifiers for the Living Agent Office
 * and Agent Communication Fabric.
 */

const COMMUNICATION_EVENTS = Object.freeze({
  // Presence & Movement
  PRESENCE_UPDATED: 'communication:presence_updated',
  AGENT_ENTERED_ROOM: 'communication:agent_entered_room',
  AGENT_LEFT_ROOM: 'communication:agent_left_room',
  HUMAN_MOVED: 'communication:human_moved',

  // Door Knock & Interaction
  OFFICE_KNOCKED: 'communication:office_knocked',
  KNOCK_RESPONDED: 'communication:knock_responded',

  // Conversation Lifecycle
  CONVERSATION_REQUESTED: 'communication:conversation_requested',
  CONVERSATION_CREATED: 'communication:conversation_created',
  CONVERSATION_STARTED: 'communication:conversation_started',
  CONVERSATION_PAUSED: 'communication:conversation_paused',
  CONVERSATION_RESUMED: 'communication:conversation_resumed',
  CONVERSATION_COMPLETED: 'communication:conversation_completed',
  CONVERSATION_DECLINED: 'communication:conversation_declined',
  CONVERSATION_EXPIRED: 'communication:conversation_expired',

  // Messages
  MESSAGE_SENT: 'communication:message_sent',
  MESSAGE_RECEIVED: 'communication:message_received',

  // Multi-Agent Meetings
  MEETING_CREATED: 'communication:meeting_created',
  MEETING_STARTED: 'communication:meeting_started',
  MEETING_ENDED: 'communication:meeting_ended',

  // Handoff & War Room
  AGENT_HANDOFF: 'communication:agent_handoff',
  WAR_ROOM_CREATED: 'communication:war_room_created',
  WAR_ROOM_RESOLVED: 'communication:war_room_resolved',

  // Cognitive & Action Distillation
  DECISION_CREATED: 'communication:decision_created',
  ACTION_ITEM_CREATED: 'communication:action_item_created',
  MEMORY_DISTILLED: 'communication:memory_distilled',

  // Safety & Circuit Breaker
  LOOP_DETECTED: 'communication:loop_detected',
  BUDGET_EXCEEDED: 'communication:budget_exceeded'
});

const PRESENCE_STATUSES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  WORKING: 'WORKING',
  THINKING: 'THINKING',
  IN_CONVERSATION: 'IN_CONVERSATION',
  IN_MEETING: 'IN_MEETING',
  WAITING: 'WAITING',
  BLOCKED: 'BLOCKED',
  AWAY: 'AWAY',
  OFFLINE: 'OFFLINE'
});

const OFFICE_TYPES = Object.freeze({
  PRIVATE_OFFICE: 'PRIVATE_OFFICE',
  TEAM_ROOM: 'TEAM_ROOM',
  MEETING_ROOM: 'MEETING_ROOM',
  WAR_ROOM: 'WAR_ROOM',
  MISSION_ROOM: 'MISSION_ROOM',
  REVIEW_ROOM: 'REVIEW_ROOM',
  LOUNGE: 'LOUNGE',
  CONTROL_ROOM: 'CONTROL_ROOM'
});

const CONVERSATION_TYPES = Object.freeze({
  DIRECT: 'DIRECT',
  TEAM: 'TEAM',
  ROOM: 'ROOM',
  MEETING: 'MEETING',
  SYSTEM: 'SYSTEM',
  MISSION: 'MISSION',
  INCIDENT: 'INCIDENT',
  HANDOFF: 'HANDOFF',
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE'
});

const CONVERSATION_STATUSES = Object.freeze({
  REQUESTED: 'REQUESTED',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED'
});

module.exports = {
  COMMUNICATION_EVENTS,
  PRESENCE_STATUSES,
  OFFICE_TYPES,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES
};

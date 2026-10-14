'use strict';

/**
 * Test: Meeting Manager (Fase 14)
 * Verifies multi-agent collaborative meetings, decisions, and action items.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { MeetingManager } = require('../src/communication/meeting-manager');
const { RoomManager } = require('../src/communication/room-manager');
const { OfficeManager } = require('../src/communication/office-manager');
const { PresenceManager } = require('../src/communication/presence-manager');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { ConversationStore } = require('../src/communication/conversation-store');
const { PRESENCE_STATUSES } = require('../src/communication/communication-events');

test('MEETING 1: Creates multi-agent meeting, records decisions, and assigns action items', async () => {
  const bus = new AgentCommunicationBus();
  const officeMgr = new OfficeManager({ bus });
  const presenceMgr = new PresenceManager({ bus });
  const roomMgr = new RoomManager({ bus, officeManager: officeMgr, presenceManager: presenceMgr });
  const store = new ConversationStore({ storeDir: require('os').tmpdir() });

  const meetingMgr = new MeetingManager({
    bus,
    roomManager: roomMgr,
    presenceManager: presenceMgr,
    store
  });

  const participants = ['agent.ceo', 'agent-architect', 'agent-backend', 'agent-qa'];
  const meeting = meetingMgr.createMeeting({
    topic: 'Fênix Architecture & Zero-AI Hardening',
    roomId: 'room-meeting-a',
    participants,
    missionId: 'm-fase14-align'
  });

  assert.equal(meeting.status, 'IN_PROGRESS');
  assert.equal(meeting.participants.length, 4);

  // Verify all participants are in the room and have status IN_MEETING
  const occ = roomMgr.getRoomOccupancy('room-meeting-a');
  assert.equal(occ.length, 4);
  for (const p of participants) {
    const pres = presenceMgr.getAgentPresence(p);
    assert.equal(pres.status, PRESENCE_STATUSES.IN_MEETING);
  }

  // Record decisions
  const dec1 = meetingMgr.addDecision(meeting.meetingId, 'Adopt in-memory SQLite fallback when Postgres unreachable', 'agent-architect');
  assert.ok(dec1.id);
  assert.equal(meeting.decisions.length, 1);

  // Assign action items
  const act1 = meetingMgr.addActionItem(meeting.meetingId, {
    task: 'Implement database connection retry loop',
    assigneeId: 'agent-backend',
    deadline: '2026-10-02T12:00:00Z'
  });
  assert.ok(act1.id);
  assert.equal(meeting.actionItems.length, 1);

  // End meeting
  const ended = await meetingMgr.endMeeting(meeting.meetingId, 'Alignment achieved. 1 decision recorded.');
  assert.equal(ended.status, 'ENDED');
  assert.ok(ended.endedAt);

  // Participants evacuated and released
  assert.equal(roomMgr.getRoomOccupancy('room-meeting-a').length, 0);
  for (const p of participants) {
    const pres = presenceMgr.getAgentPresence(p);
    assert.equal(pres.status, PRESENCE_STATUSES.AVAILABLE);
  }
});

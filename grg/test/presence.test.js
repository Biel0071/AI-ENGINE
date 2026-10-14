'use strict';

/**
 * Test: Presence Manager (Fase 14)
 * Verifies real-time spatial presence, state transitions, and runtime synchronization.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { PresenceManager } = require('../src/communication/presence-manager');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { PRESENCE_STATUSES, COMMUNICATION_EVENTS } = require('../src/communication/communication-events');

test('PRESENCE 1: Sets and retrieves agent presence with honest state', () => {
  const bus = new AgentCommunicationBus();
  const manager = new PresenceManager({ bus });

  const pres = manager.setAgentPresence('agent-qa', {
    status: PRESENCE_STATUSES.AVAILABLE,
    officeId: 'office-qa'
  });

  assert.equal(pres.agentId, 'agent-qa');
  assert.equal(pres.status, PRESENCE_STATUSES.AVAILABLE);
  assert.equal(pres.officeId, 'office-qa');

  const retrieved = manager.getAgentPresence('agent-qa');
  assert.deepEqual(retrieved, pres);
});

test('PRESENCE 2: Emits room entry and exit events upon spatial movement', () => {
  const bus = new AgentCommunicationBus();
  const manager = new PresenceManager({ bus });
  const events = [];

  bus.on(COMMUNICATION_EVENTS.AGENT_ENTERED_ROOM, (e) => events.push({ type: 'ENTERED', ...e.payload }));
  bus.on(COMMUNICATION_EVENTS.AGENT_LEFT_ROOM, (e) => events.push({ type: 'LEFT', ...e.payload }));

  // Move agent into meeting room
  manager.setAgentPresence('agent-backend', { roomId: 'room-meeting-a' });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'ENTERED');
  assert.equal(events[0].roomId, 'room-meeting-a');

  // Move agent to war room
  manager.setAgentPresence('agent-backend', { roomId: 'room-war-room' });
  assert.equal(events.length, 3);
  assert.equal(events[1].type, 'LEFT');
  assert.equal(events[1].roomId, 'room-meeting-a');
  assert.equal(events[2].type, 'ENTERED');
  assert.equal(events[2].roomId, 'room-war-room');
});

test('PRESENCE 3: Tracks human operator spatial presence', () => {
  const bus = new AgentCommunicationBus();
  const manager = new PresenceManager({ bus });
  let moved = null;

  bus.on(COMMUNICATION_EVENTS.HUMAN_MOVED, (e) => { moved = e.payload; });

  const updated = manager.setHumanPresence({
    officeId: 'office-ceo',
    roomId: 'room-war-room',
    status: 'IN_MEETING'
  });

  assert.equal(updated.roomId, 'room-war-room');
  assert.ok(moved);
  assert.equal(moved.human.officeId, 'office-ceo');
});

test('PRESENCE 4: Syncs state derived from live runtime jobs without mocks', () => {
  const bus = new AgentCommunicationBus();
  const manager = new PresenceManager({ bus });

  const fakeJobs = [
    { id: 'job-101', status: 'RUNNING', agentId: 'agent-backend', missionId: 'm-core-01' }
  ];
  const agentCatalog = [
    { id: 'agent-backend', role: 'backend' },
    { id: 'agent-frontend', role: 'frontend' }
  ];

  const snapshot = manager.syncRuntimeState(fakeJobs, agentCatalog);
  const backendPres = snapshot.agents.find(a => a.agentId === 'agent-backend');
  const frontendPres = snapshot.agents.find(a => a.agentId === 'agent-frontend');

  assert.equal(backendPres.status, PRESENCE_STATUSES.WORKING);
  assert.equal(backendPres.currentMissionId, 'm-core-01');
  assert.equal(frontendPres.status, PRESENCE_STATUSES.AVAILABLE);
});

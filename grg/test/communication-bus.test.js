'use strict';

/**
 * Test: Communication Bus (Fase 14)
 * Verifies the central typed event bus for Agent Office communication.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { COMMUNICATION_EVENTS } = require('../src/communication/communication-events');

test('COMM-BUS 1: Publishes typed communication event with envelope metadata', () => {
  const bus = new AgentCommunicationBus();
  let received = null;

  bus.on(COMMUNICATION_EVENTS.MESSAGE_SENT, (envelope) => {
    received = envelope;
  });

  const sent = bus.publish(COMMUNICATION_EVENTS.MESSAGE_SENT, {
    senderId: 'agent-engineer',
    content: 'Build green'
  });

  assert.ok(sent.id, 'Envelope must have an id');
  assert.equal(sent.type, COMMUNICATION_EVENTS.MESSAGE_SENT);
  assert.ok(sent.timestamp, 'Envelope must have an ISO timestamp');
  assert.equal(received.payload.content, 'Build green');
});

test('COMM-BUS 2: Agent subscription filters targeted envelopes correctly', () => {
  const bus = new AgentCommunicationBus();
  const engineerEvents = [];

  bus.subscribeToAgent('agent-engineer', (env) => {
    engineerEvents.push(env);
  });

  // Targeted to engineer
  bus.publish(COMMUNICATION_EVENTS.OFFICE_KNOCKED, {
    fromAgent: 'agent-qa',
    toAgent: 'agent-engineer',
    reason: 'Validation check'
  });

  // Targeted to someone else
  bus.publish(COMMUNICATION_EVENTS.OFFICE_KNOCKED, {
    fromAgent: 'agent-qa',
    toAgent: 'agent-architect',
    reason: 'Schema review'
  });

  assert.equal(engineerEvents.length, 1);
  assert.equal(engineerEvents[0].payload.toAgent, 'agent-engineer');
});

test('COMM-BUS 3: Room subscription captures entries and exits for a room', () => {
  const bus = new AgentCommunicationBus();
  const warRoomEvents = [];

  bus.subscribeToRoom('room-war-room', (env) => {
    warRoomEvents.push(env);
  });

  bus.publish(COMMUNICATION_EVENTS.AGENT_ENTERED_ROOM, {
    agentId: 'agent-sec',
    roomId: 'room-war-room'
  });

  bus.publish(COMMUNICATION_EVENTS.AGENT_ENTERED_ROOM, {
    agentId: 'agent-frontend',
    roomId: 'office-frontend'
  });

  assert.equal(warRoomEvents.length, 1);
  assert.equal(warRoomEvents[0].payload.roomId, 'room-war-room');
});

test('COMM-BUS 4: Maintains bounded event history', () => {
  const bus = new AgentCommunicationBus();
  for (let i = 0; i < 350; i++) {
    bus.publish('test:event', { index: i });
  }

  assert.equal(bus.history.length, bus.MAX_HISTORY);
  const recent = bus.getHistory(10);
  assert.equal(recent.length, 10);
  assert.equal(recent[9].payload.index, 349);
});

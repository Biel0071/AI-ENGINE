'use strict';

/**
 * Test: Office Manager & Room Occupancy (Fase 14)
 * Verifies spatial offices, room capacities, and War Room activation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { OfficeManager } = require('../src/communication/office-manager');
const { RoomManager } = require('../src/communication/room-manager');
const { PresenceManager } = require('../src/communication/presence-manager');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { COMMUNICATION_EVENTS } = require('../src/communication/communication-events');

test('OFFICE 1: Bootstraps canonical offices across 7 districts with designated owners', () => {
  const officeMgr = new OfficeManager();
  const offices = officeMgr.listOffices();

  assert.ok(offices.length >= 16, 'Must contain at least 16 canonical offices');
  const ceoOffice = officeMgr.getOfficeForAgent('agent.ceo');
  assert.ok(ceoOffice, 'CEO must have an assigned office');
  assert.equal(ceoOffice.districtId, 'command-center');

  const qaOffice = officeMgr.getOfficeForAgent('agent-qa');
  assert.ok(qaOffice, 'QA must have an assigned office');
  assert.equal(qaOffice.districtId, 'dev-district');
});

test('OFFICE 2: Room occupancy respects capacity constraints', () => {
  const bus = new AgentCommunicationBus();
  const officeMgr = new OfficeManager({ bus });
  const presenceMgr = new PresenceManager({ bus });
  const roomMgr = new RoomManager({ bus, officeManager: officeMgr, presenceManager: presenceMgr });

  // room-review has capacity 6
  for (let i = 0; i < 6; i++) {
    roomMgr.joinRoom('room-review', `agent-participant-${i}`);
  }

  const occ = roomMgr.getRoomOccupancy('room-review');
  assert.equal(occ.length, 6);

  // 7th participant should throw capacity error
  assert.throws(() => {
    roomMgr.joinRoom('room-review', 'agent-participant-overflow');
  }, /maximum capacity/i);

  // Leave room
  roomMgr.leaveRoom('room-review', 'agent-participant-0');
  assert.equal(roomMgr.getRoomOccupancy('room-review').length, 5);
});

test('OFFICE 3: War Room summons specialists upon critical incident and releases on resolve', () => {
  const bus = new AgentCommunicationBus();
  const officeMgr = new OfficeManager({ bus });
  const presenceMgr = new PresenceManager({ bus });
  const roomMgr = new RoomManager({ bus, officeManager: officeMgr, presenceManager: presenceMgr });

  let warRoomCreated = false;
  let warRoomResolved = false;

  bus.on(COMMUNICATION_EVENTS.WAR_ROOM_CREATED, () => { warRoomCreated = true; });
  bus.on(COMMUNICATION_EVENTS.WAR_ROOM_RESOLVED, () => { warRoomResolved = true; });

  const incident = {
    id: 'inc-redis-failure',
    description: 'Redis Connection Pool Exhaustion',
    severity: 'CRITICAL',
    specialists: ['agent-backend', 'agent-architect', 'agent-security']
  };

  const warRoom = roomMgr.activateWarRoom(incident);
  assert.equal(warRoom.incidentId, 'inc-redis-failure');
  assert.ok(warRoomCreated);

  const office = officeMgr.getOffice('room-war-room');
  assert.equal(office.status, 'WAR_ROOM_ACTIVE');
  assert.equal(office.participants.length, 3);

  // Verify specialist presences are working in War Room
  const backendPres = presenceMgr.getAgentPresence('agent-backend');
  assert.equal(backendPres.roomId, 'room-war-room');

  // Resolve
  const resolved = roomMgr.resolveWarRoom('inc-redis-failure');
  assert.ok(resolved);
  assert.ok(warRoomResolved);
  assert.equal(office.participants.length, 0);
  assert.equal(office.status, 'IDLE');
});

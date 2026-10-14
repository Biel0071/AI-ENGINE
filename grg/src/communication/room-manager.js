'use strict';

/**
 * FÊNIX OS — Room Manager (Fase 14)
 * =================================
 * Controls room occupancy, access control, and specialized spaces
 * including Meeting Rooms and the Critical Incident War Room.
 */

const { COMMUNICATION_EVENTS, PRESENCE_STATUSES } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');
const { globalOfficeManager } = require('./office-manager');
const { globalPresenceManager } = require('./presence-manager');

class RoomManager {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.officeManager = options.officeManager || globalOfficeManager;
    this.presenceManager = options.presenceManager || globalPresenceManager;
    this.logger = options.logger || console;

    this.activeWarRooms = new Map(); // incidentId -> { roomId, specialists, startedAt }
  }

  joinRoom(roomId, participantId) {
    const office = this.officeManager.getOffice(roomId);
    if (!office) throw new Error(`Room not found: ${roomId}`);

    if (office.participants.length >= office.capacity) {
      throw new Error(`Room ${office.name} is at maximum capacity (${office.capacity})`);
    }

    this.officeManager.addParticipant(roomId, participantId);

    // Update participant presence
    if (participantId.startsWith('agent') || !participantId.startsWith('user_')) {
      this.presenceManager.setAgentPresence(participantId, {
        roomId,
        status: office.type === 'WAR_ROOM' ? PRESENCE_STATUSES.WORKING : PRESENCE_STATUSES.IN_MEETING
      });
    } else {
      this.presenceManager.setHumanPresence({ currentRoomId: roomId });
    }

    this.bus.publish(COMMUNICATION_EVENTS.AGENT_ENTERED_ROOM, {
      roomId,
      participantId,
      roomName: office.name,
      occupancy: office.participants.length
    });

    return office;
  }

  leaveRoom(roomId, participantId) {
    const office = this.officeManager.getOffice(roomId);
    if (!office) return null;

    this.officeManager.removeParticipant(roomId, participantId);

    if (participantId.startsWith('agent') || !participantId.startsWith('user_')) {
      const current = this.presenceManager.getAgentPresence(participantId);
      if (current && current.roomId === roomId) {
        this.presenceManager.setAgentPresence(participantId, {
          roomId: null,
          status: PRESENCE_STATUSES.AVAILABLE
        });
      }
    } else {
      this.presenceManager.setHumanPresence({ currentRoomId: null });
    }

    this.bus.publish(COMMUNICATION_EVENTS.AGENT_LEFT_ROOM, {
      roomId,
      participantId,
      roomName: office.name,
      occupancy: office.participants.length
    });

    return office;
  }

  getRoomOccupancy(roomId) {
    const office = this.officeManager.getOffice(roomId);
    return office ? office.participants : [];
  }

  activateWarRoom(incident = {}) {
    const roomId = 'room-war-room';
    const incidentId = incident.id || `inc_${Date.now()}`;
    const specialists = incident.specialists || [
      'agent-backend',
      'agent-architect',
      'agent-qa',
      'agent-security',
      'agent-obs'
    ];

    const office = this.officeManager.getOffice(roomId);
    if (!office) throw new Error('War Room not configured');

    this.officeManager.updateOfficeStatus(roomId, 'WAR_ROOM_ACTIVE', {
      activeIncidentId: incidentId,
      incidentDetails: incident
    });

    // Auto-summon specialists to the War Room
    for (const spec of specialists) {
      try {
        this.joinRoom(roomId, spec);
      } catch (err) {
        this.logger.warn?.(`Failed to summon ${spec} to War Room: ${err.message}`);
      }
    }

    const warRoomState = {
      incidentId,
      roomId,
      severity: incident.severity || 'CRITICAL',
      specialists,
      activatedAt: new Date().toISOString()
    };
    this.activeWarRooms.set(incidentId, warRoomState);

    this.bus.publish(COMMUNICATION_EVENTS.WAR_ROOM_CREATED, warRoomState);
    return warRoomState;
  }

  resolveWarRoom(incidentId) {
    const warRoomState = this.activeWarRooms.get(incidentId);
    if (!warRoomState) return false;

    const roomId = warRoomState.roomId;
    const office = this.officeManager.getOffice(roomId);

    // Release participants back to available state
    if (office) {
      for (const p of [...office.participants]) {
        this.leaveRoom(roomId, p);
      }
      this.officeManager.updateOfficeStatus(roomId, 'IDLE', {
        activeIncidentId: null,
        incidentDetails: null
      });
    }

    this.activeWarRooms.delete(incidentId);

    this.bus.publish(COMMUNICATION_EVENTS.WAR_ROOM_RESOLVED, {
      incidentId,
      resolvedAt: new Date().toISOString()
    });

    return true;
  }
}

const globalRoomManager = new RoomManager();

module.exports = {
  RoomManager,
  globalRoomManager
};

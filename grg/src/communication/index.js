'use strict';

/**
 * FÊNIX OS — Communication Fabric Master Index (Fase 14)
 * =======================================================
 * Integrates presence, offices, rooms, door knocks, conversations,
 * multi-agent meetings, and cognitive memory distillation.
 */

const {
  COMMUNICATION_EVENTS,
  PRESENCE_STATUSES,
  OFFICE_TYPES,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES
} = require('./communication-events');

const {
  AgentCommunicationBus,
  globalCommunicationBus
} = require('./agent-communication-bus');

const { ConversationStore } = require('./conversation-store');
const globalConversationStore = new ConversationStore();

const {
  PresenceManager,
  globalPresenceManager
} = require('./presence-manager');

const {
  OfficeManager,
  globalOfficeManager,
  CANONICAL_OFFICES
} = require('./office-manager');

const {
  RoomManager,
  globalRoomManager
} = require('./room-manager');

const {
  ConversationMemory,
  globalConversationMemory,
  MEMORY_CLASSES
} = require('./conversation-memory');

const {
  CommunicationRouter,
  globalCommunicationRouter
} = require('./communication-router');

const { ConversationManager } = require('./conversation-manager');
const globalConversationManager = new ConversationManager({
  bus: globalCommunicationBus,
  store: globalConversationStore,
  presenceManager: globalPresenceManager,
  officeManager: globalOfficeManager,
  memoryDistiller: globalConversationMemory,
  router: globalCommunicationRouter
});

const {
  MeetingManager,
  globalMeetingManager
} = require('./meeting-manager');
globalMeetingManager.setStore(globalConversationStore);
globalMeetingManager.setMemoryDistiller(globalConversationMemory);

module.exports = {
  // Constants
  COMMUNICATION_EVENTS,
  PRESENCE_STATUSES,
  OFFICE_TYPES,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
  MEMORY_CLASSES,
  CANONICAL_OFFICES,

  // Classes
  AgentCommunicationBus,
  ConversationStore,
  PresenceManager,
  OfficeManager,
  RoomManager,
  ConversationMemory,
  CommunicationRouter,
  ConversationManager,
  MeetingManager,

  // Singletons
  globalCommunicationBus,
  globalConversationStore,
  globalPresenceManager,
  globalOfficeManager,
  globalRoomManager,
  globalConversationMemory,
  globalCommunicationRouter,
  globalConversationManager,
  globalMeetingManager
};

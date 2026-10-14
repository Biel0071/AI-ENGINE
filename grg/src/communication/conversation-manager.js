'use strict';

/**
 * FÊNIX OS — Conversation Manager (Fase 14)
 * ==========================================
 * Manages full lifecycle of agent-to-agent and human-to-agent conversations,
 * door knocks, direct messages, and mission-linked dialogs.
 */

const crypto = require('crypto');
const {
  COMMUNICATION_EVENTS,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
  PRESENCE_STATUSES
} = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');
const { ConversationStore } = require('./conversation-store');
const { globalPresenceManager } = require('./presence-manager');
const { globalOfficeManager } = require('./office-manager');

class ConversationManager {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.store = options.store || new ConversationStore();
    this.presenceManager = options.presenceManager || globalPresenceManager;
    this.officeManager = options.officeManager || globalOfficeManager;
    this.logger = options.logger || console;
    this.memoryDistiller = options.memoryDistiller || null;
    this.router = options.router || null;
  }

  setMemoryDistiller(distiller) {
    this.memoryDistiller = distiller;
  }

  setRouter(router) {
    this.router = router;
  }

  /**
   * Dispatches a door knock to another agent's office.
   * @param {object} params
   */
  knock({
    fromAgent,
    toAgent,
    officeId = null,
    reason = 'Collaboration requested',
    missionId = null,
    projectId = null,
    context = {}
  }) {
    if (!fromAgent || !toAgent) throw new Error('Both fromAgent and toAgent are required for knock');

    const targetOffice = officeId || this.officeManager.getOfficeForAgent(toAgent)?.officeId || `office-${toAgent}`;
    const knockId = `knock_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const knockEntry = {
      knockId,
      fromAgent,
      toAgent,
      officeId: targetOffice,
      reason,
      missionId,
      projectId,
      context,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    this.store.saveKnock(knockEntry);

    this.bus.publish(COMMUNICATION_EVENTS.OFFICE_KNOCKED, knockEntry);

    this.store.recordActivity({
      type: 'KNOCK',
      actor: fromAgent,
      target: toAgent,
      summary: `${fromAgent} bateu na porta de ${toAgent}: "${reason}"`
    });

    return knockEntry;
  }

  /**
   * Responds to a door knock.
   * @param {string} knockId
   * @param {'ACCEPT'|'DECLINE'|'DEFER'|'REDIRECT'|'CREATE_MEETING'} action
   * @param {object} [options]
   */
  async respondKnock(knockId, action = 'ACCEPT', options = {}) {
    const knock = this.store.getKnock(knockId);
    if (!knock) throw new Error(`Knock not found: ${knockId}`);
    if (knock.status !== 'PENDING') throw new Error(`Knock already processed: ${knock.status}`);

    knock.status = action;
    knock.respondedAt = new Date().toISOString();
    this.store.saveKnock(knock);

    this.bus.publish(COMMUNICATION_EVENTS.KNOCK_RESPONDED, {
      knockId,
      action,
      fromAgent: knock.fromAgent,
      toAgent: knock.toAgent
    });

    if (action === 'ACCEPT') {
      // Create and start direct conversation
      const conv = this.createConversation({
        type: CONVERSATION_TYPES.DIRECT,
        participants: [knock.fromAgent, knock.toAgent],
        roomId: knock.officeId,
        missionId: knock.missionId,
        projectId: knock.projectId,
        context: {
          knockReason: knock.reason,
          ...knock.context
        }
      });

      this.store.recordActivity({
        type: 'CONVERSATION_START',
        actor: knock.toAgent,
        target: knock.fromAgent,
        summary: `${knock.toAgent} aceitou a conversa com ${knock.fromAgent}`
      });

      return { action, conversation: conv };
    }

    if (action === 'DECLINE') {
      this.bus.publish(COMMUNICATION_EVENTS.CONVERSATION_DECLINED, { knockId, knock });
      return { action, message: 'Knock declined by recipient' };
    }

    if (action === 'REDIRECT' && options.redirectTo) {
      return this.knock({
        fromAgent: knock.fromAgent,
        toAgent: options.redirectTo,
        reason: `Redirected from ${knock.toAgent}: ${knock.reason}`,
        missionId: knock.missionId,
        projectId: knock.projectId,
        context: knock.context
      });
    }

    return { action, knock };
  }

  /**
   * Creates a new conversation.
   * @param {object} params
   */
  createConversation({
    type = CONVERSATION_TYPES.DIRECT,
    participants = [],
    roomId = null,
    missionId = null,
    projectId = null,
    taskId = null,
    context = {}
  }) {
    if (!participants || participants.length < 2) {
      throw new Error('Conversation requires at least 2 participants');
    }

    const conversationId = `conv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const conversation = {
      conversationId,
      type,
      participants,
      roomId,
      missionId,
      projectId,
      taskId,
      context,
      status: CONVERSATION_STATUSES.ACTIVE,
      messageCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.store.saveConversation(conversation);

    // Update participants' status to IN_CONVERSATION
    for (const p of participants) {
      if (p.startsWith('agent') || !p.startsWith('user_')) {
        this.presenceManager.setAgentPresence(p, {
          status: PRESENCE_STATUSES.IN_CONVERSATION,
          roomId,
          currentMissionId: missionId
        });
      }
    }

    this.bus.publish(COMMUNICATION_EVENTS.CONVERSATION_CREATED, conversation);
    this.bus.publish(COMMUNICATION_EVENTS.CONVERSATION_STARTED, conversation);

    return conversation;
  }

  /**
   * Sends a message within a conversation.
   * @param {object} params
   */
  sendMessage({
    conversationId,
    senderId,
    content,
    type = CONVERSATION_TYPES.DIRECT,
    context = {}
  }) {
    const conv = this.store.getConversation(conversationId);
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`);
    if (conv.status !== CONVERSATION_STATUSES.ACTIVE) {
      throw new Error(`Cannot send message to conversation with status: ${conv.status}`);
    }

    // Circuit breaker / Loop protection check
    if (this.router && typeof this.router.checkSafety === 'function') {
      const safety = this.router.checkSafety({
        conversationId,
        senderId,
        content,
        participants: conv.participants,
        messageCount: conv.messageCount || 0
      });
      if (!safety.allowed) {
        this.bus.publish(COMMUNICATION_EVENTS.LOOP_DETECTED, {
          conversationId,
          reason: safety.reason
        });
        throw new Error(`Message blocked by safety governor: ${safety.reason}`);
      }
    }

    const messageId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const recipients = conv.participants.filter(p => p !== senderId);

    const message = {
      messageId,
      conversationId,
      senderId,
      recipients,
      content,
      type,
      context,
      status: 'DELIVERED',
      createdAt: new Date().toISOString()
    };

    this.store.saveMessage(message);

    this.bus.publish(COMMUNICATION_EVENTS.MESSAGE_SENT, message);
    this.bus.publish(COMMUNICATION_EVENTS.MESSAGE_RECEIVED, message);

    return message;
  }

  /**
   * Completes a conversation and triggers cognitive memory distillation.
   * @param {string} conversationId
   * @param {string} [reason='COMPLETED']
   */
  async completeConversation(conversationId, reason = 'COMPLETED') {
    const conv = this.store.getConversation(conversationId);
    if (!conv) return null;

    conv.status = CONVERSATION_STATUSES.COMPLETED;
    conv.completedAt = new Date().toISOString();
    conv.completionReason = reason;
    this.store.saveConversation(conv);

    // Release participants back to AVAILABLE
    for (const p of conv.participants) {
      if (p.startsWith('agent') || !p.startsWith('user_')) {
        const pres = this.presenceManager.getAgentPresence(p);
        if (pres && pres.status === PRESENCE_STATUSES.IN_CONVERSATION) {
          this.presenceManager.setAgentPresence(p, {
            status: PRESENCE_STATUSES.AVAILABLE
          });
        }
      }
    }

    // Trigger Memory Distillation
    let memoryResult = null;
    if (this.memoryDistiller && typeof this.memoryDistiller.distillConversation === 'function') {
      try {
        const messages = this.store.getMessagesForConversation(conversationId);
        memoryResult = await this.memoryDistiller.distillConversation(conv, messages);
      } catch (err) {
        this.logger.warn?.(`Memory distillation error for ${conversationId}: ${err.message}`);
      }
    }

    this.bus.publish(COMMUNICATION_EVENTS.CONVERSATION_COMPLETED, {
      conversationId,
      reason,
      memoryDistilled: Boolean(memoryResult)
    });

    this.store.recordActivity({
      type: 'CONVERSATION_COMPLETE',
      actor: conv.participants[0],
      target: conv.participants[1],
      summary: `Conversa ${conversationId} concluída (${reason})`
    });

    return conv;
  }

  getConversation(id) {
    return this.store.getConversation(id);
  }

  listConversations(filter) {
    return this.store.listConversations(filter);
  }

  getMessages(conversationId, limit) {
    return this.store.getMessagesForConversation(conversationId, limit);
  }
}

module.exports = { ConversationManager };

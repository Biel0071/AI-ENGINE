'use strict';

/**
 * FÊNIX OS — Conversation Memory Distiller (Fase 14)
 * ====================================================
 * Extracts high-value knowledge from conversations and meetings.
 * Classifies data into FACT, DECISION, EXPERIENCE, PATTERN, INSIGHT, ACTION.
 * Feeds structured entries into the canonical Memory Fabric.
 */

const crypto = require('crypto');
const { COMMUNICATION_EVENTS } = require('./communication-events');
const { globalCommunicationBus } = require('./agent-communication-bus');

const MEMORY_CLASSES = Object.freeze({
  FACT: 'FACT',
  DECISION: 'DECISION',
  EXPERIENCE: 'EXPERIENCE',
  PATTERN: 'PATTERN',
  INSIGHT: 'INSIGHT',
  ACTION: 'ACTION'
});

class ConversationMemory {
  constructor(options = {}) {
    this.bus = options.bus || globalCommunicationBus;
    this.memoryFabric = options.memoryFabric || null;
    this.logger = options.logger || console;

    this.distilledEntries = []; // Local cache
  }

  setMemoryFabric(fabric) {
    this.memoryFabric = fabric;
  }

  /**
   * Distills a completed conversation into structured memory entries.
   * @param {object} conversation
   * @param {Array<object>} messages
   */
  async distillConversation(conversation, messages = []) {
    if (!conversation || messages.length === 0) return null;

    const entries = [];
    const fullText = messages.map(m => `${m.senderId}: ${m.content}`).join('\n');

    // Deterministic classifier (Zero-AI mode)
    const hasDecision = /decid|escolh|adot|aprov|reject|usar\b/i.test(fullText);
    const hasFix = /corrigi|resolvid|fix|bug|falha|sucesso|passou/i.test(fullText);
    const hasPattern = /padrão|sempre|fluxo|protocolo|arquitetura/i.test(fullText);

    if (hasDecision) {
      entries.push({
        id: `mem_dec_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        type: MEMORY_CLASSES.DECISION,
        source: 'CONVERSATION',
        sourceId: conversation.conversationId,
        participants: conversation.participants,
        missionId: conversation.missionId,
        projectId: conversation.projectId,
        summary: `Decisão acordada entre ${conversation.participants.join(' e ')}`,
        content: messages.filter(m => /decid|escolh|adot|aprov/i.test(m.content)).map(m => m.content).join('; ') || conversation.lastMessage,
        createdAt: new Date().toISOString()
      });
    }

    if (hasFix) {
      entries.push({
        id: `mem_exp_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        type: MEMORY_CLASSES.EXPERIENCE,
        source: 'CONVERSATION',
        sourceId: conversation.conversationId,
        participants: conversation.participants,
        missionId: conversation.missionId,
        projectId: conversation.projectId,
        summary: `Resolução técnica em ${conversation.roomId || 'Office'}`,
        content: conversation.lastMessage || 'Resolução concluída com sucesso',
        createdAt: new Date().toISOString()
      });
    }

    if (hasPattern) {
      entries.push({
        id: `mem_pat_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        type: MEMORY_CLASSES.PATTERN,
        source: 'CONVERSATION',
        sourceId: conversation.conversationId,
        participants: conversation.participants,
        missionId: conversation.missionId,
        projectId: conversation.projectId,
        summary: `Padrão operacional identificado`,
        content: `Interação coordenada entre ${conversation.participants.join(' e ')}`,
        createdAt: new Date().toISOString()
      });
    }

    // Default fallback entry if no specific triggers
    if (entries.length === 0) {
      entries.push({
        id: `mem_fact_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        type: MEMORY_CLASSES.FACT,
        source: 'CONVERSATION',
        sourceId: conversation.conversationId,
        participants: conversation.participants,
        missionId: conversation.missionId,
        projectId: conversation.projectId,
        summary: `Colaboração concluída sobre ${conversation.context?.knockReason || 'tarefa operacional'}`,
        content: conversation.lastMessage || 'Conversa finalizada',
        createdAt: new Date().toISOString()
      });
    }

    for (const entry of entries) {
      this.distilledEntries.push(entry);

      // Save to canonical Memory Fabric if provided
      if (this.memoryFabric && typeof this.memoryFabric.remember === 'function') {
        try {
          await this.memoryFabric.remember('system', conversation.participants[0] || 'grg-admin', {
            id: entry.id,
            type: entry.type,
            text: `${entry.summary}: ${entry.content}`,
            metadata: entry
          });
        } catch (err) {
          this.logger.warn?.(`Failed to push memory entry to fabric: ${err.message}`);
        }
      }

      this.bus.publish(COMMUNICATION_EVENTS.MEMORY_DISTILLED, entry);
    }

    return entries;
  }

  /**
   * Distills a completed meeting and its formal decisions.
   * @param {object} meeting
   */
  async distillMeeting(meeting) {
    if (!meeting) return null;

    const entries = [];

    // Distill each decision as a first-class memory entry
    for (const dec of meeting.decisions) {
      const entry = {
        id: `mem_meet_dec_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        type: MEMORY_CLASSES.DECISION,
        source: 'MEETING',
        sourceId: meeting.meetingId,
        participants: meeting.participants,
        missionId: meeting.missionId,
        projectId: meeting.projectId,
        summary: `Decisão de Reunião: "${meeting.topic}"`,
        content: dec.decision,
        author: dec.author,
        createdAt: new Date().toISOString()
      };
      entries.push(entry);
      this.distilledEntries.push(entry);

      if (this.memoryFabric && typeof this.memoryFabric.remember === 'function') {
        try {
          await this.memoryFabric.remember('system', dec.author || 'system', {
            id: entry.id,
            type: entry.type,
            text: entry.content,
            metadata: entry
          });
        } catch (err) {}
      }

      this.bus.publish(COMMUNICATION_EVENTS.MEMORY_DISTILLED, entry);
    }

    return entries;
  }

  getDistilledEntries(limit = 50) {
    return this.distilledEntries.slice(-limit);
  }
}

const globalConversationMemory = new ConversationMemory();

module.exports = {
  ConversationMemory,
  globalConversationMemory,
  MEMORY_CLASSES
};

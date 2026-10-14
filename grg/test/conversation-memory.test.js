'use strict';

/**
 * Test: Conversation Memory Distillation (Fase 14)
 * Verifies high-value knowledge extraction from dialogues without blind text dumps.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConversationMemory, MEMORY_CLASSES } = require('../src/communication/conversation-memory');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');

test('MEM-DISTILL 1: Distills conversations with decisions and technical fixes', async () => {
  const bus = new AgentCommunicationBus();
  const distiller = new ConversationMemory({ bus });

  const mockConversation = {
    conversationId: 'conv-test-01',
    participants: ['agent-backend', 'agent-architect'],
    missionId: 'm-persistence-fix',
    projectId: 'fenix-os',
    lastMessage: 'Decidimos adotar SQLite local para zero dependências externas.'
  };

  const mockMessages = [
    { senderId: 'agent-backend', content: 'Postgres remoto caiu com timeout.' },
    { senderId: 'agent-architect', content: 'Decidimos adotar SQLite local como fallback de persistência imediata.' },
    { senderId: 'agent-backend', content: 'Perfeito, o bug foi corrigido com sucesso e todos os testes passaram.' }
  ];

  const entries = await distiller.distillConversation(mockConversation, mockMessages);
  assert.ok(entries.length >= 2, 'Should extract both DECISION and EXPERIENCE');

  const decisionEntry = entries.find(e => e.type === MEMORY_CLASSES.DECISION);
  assert.ok(decisionEntry, 'Must have a DECISION entry');
  assert.equal(decisionEntry.sourceId, 'conv-test-01');

  const expEntry = entries.find(e => e.type === MEMORY_CLASSES.EXPERIENCE);
  assert.ok(expEntry, 'Must have an EXPERIENCE entry');
});

test('MEM-DISTILL 2: Distills multi-agent meeting decisions into structured memory', async () => {
  const bus = new AgentCommunicationBus();
  const distiller = new ConversationMemory({ bus });

  const mockMeeting = {
    meetingId: 'meet-arch-01',
    topic: 'Security Gateway Protocol',
    participants: ['agent.ceo', 'agent-security'],
    missionId: 'm-sec-gw',
    projectId: 'fenix-os',
    decisions: [
      { id: 'dec-1', decision: 'Mandatory JWT expiry reduced to 15 minutes', author: 'agent-security' }
    ]
  };

  const entries = await distiller.distillMeeting(mockMeeting);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, MEMORY_CLASSES.DECISION);
  assert.equal(entries[0].content, 'Mandatory JWT expiry reduced to 15 minutes');
});

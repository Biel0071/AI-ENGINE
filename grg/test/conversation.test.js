'use strict';

/**
 * Test: Conversation Manager (Fase 14)
 * Verifies door knocks, knock responses, direct conversations, and message delivery.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConversationManager } = require('../src/communication/conversation-manager');
const { ConversationStore } = require('../src/communication/conversation-store');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { PresenceManager } = require('../src/communication/presence-manager');
const { OfficeManager } = require('../src/communication/office-manager');
const { PRESENCE_STATUSES, CONVERSATION_STATUSES } = require('../src/communication/communication-events');

test('CONV 1: Full Knock → Accept → Conversation → Message → Complete cycle', async () => {
  const bus = new AgentCommunicationBus();
  const store = new ConversationStore({ storeDir: require('os').tmpdir() });
  store.clear();
  const presenceMgr = new PresenceManager({ bus });
  const officeMgr = new OfficeManager({ bus });

  const convMgr = new ConversationManager({
    bus,
    store,
    presenceManager: presenceMgr,
    officeManager: officeMgr
  });

  // 1. Agent Engineer knocks on QA Office door
  const knock = convMgr.knock({
    fromAgent: 'agent-engineer',
    toAgent: 'agent-qa',
    reason: 'Please validate auth flow build #42',
    missionId: 'm-auth-01'
  });
  assert.equal(knock.status, 'PENDING');
  assert.equal(knock.toAgent, 'agent-qa');

  // 2. QA Agent accepts the knock
  const response = await convMgr.respondKnock(knock.knockId, 'ACCEPT');
  assert.equal(response.action, 'ACCEPT');
  const conv = response.conversation;
  assert.ok(conv);
  assert.equal(conv.status, CONVERSATION_STATUSES.ACTIVE);
  assert.deepEqual(conv.participants, ['agent-engineer', 'agent-qa']);

  // Verify presence updated to IN_CONVERSATION
  const engPres = presenceMgr.getAgentPresence('agent-engineer');
  const qaPres = presenceMgr.getAgentPresence('agent-qa');
  assert.equal(engPres.status, PRESENCE_STATUSES.IN_CONVERSATION);
  assert.equal(qaPres.status, PRESENCE_STATUSES.IN_CONVERSATION);

  // 3. Exchange messages
  const msg1 = convMgr.sendMessage({
    conversationId: conv.conversationId,
    senderId: 'agent-engineer',
    content: 'Commit pushed to branch. 4 tests passing.'
  });
  assert.equal(msg1.content, 'Commit pushed to branch. 4 tests passing.');

  const msg2 = convMgr.sendMessage({
    conversationId: conv.conversationId,
    senderId: 'agent-qa',
    content: 'Recebido. Executando suite e2e agora.'
  });
  assert.equal(msg2.senderId, 'agent-qa');

  const history = convMgr.getMessages(conv.conversationId);
  assert.equal(history.length, 2);

  // 4. Complete conversation
  const completed = await convMgr.completeConversation(conv.conversationId, 'VALIDATION_CONFIRMED');
  assert.equal(completed.status, CONVERSATION_STATUSES.COMPLETED);

  // Presences released back to AVAILABLE
  assert.equal(presenceMgr.getAgentPresence('agent-engineer').status, PRESENCE_STATUSES.AVAILABLE);
  assert.equal(presenceMgr.getAgentPresence('agent-qa').status, PRESENCE_STATUSES.AVAILABLE);
});

test('CONV 2: Knock Decline leaves agents available and records refusal', async () => {
  const bus = new AgentCommunicationBus();
  const store = new ConversationStore({ storeDir: require('os').tmpdir() });
  const presenceMgr = new PresenceManager({ bus });
  const convMgr = new ConversationManager({ bus, store, presenceManager: presenceMgr });

  const knock = convMgr.knock({
    fromAgent: 'agent-frontend',
    toAgent: 'agent-backend',
    reason: 'Sync on token colors'
  });

  const res = await convMgr.respondKnock(knock.knockId, 'DECLINE');
  assert.equal(res.action, 'DECLINE');

  const updatedKnock = store.getKnock(knock.knockId);
  assert.equal(updatedKnock.status, 'DECLINE');
});

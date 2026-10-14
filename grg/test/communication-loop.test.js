'use strict';

/**
 * Test: Communication Loop Prevention & Circuit Breaker (Fase 14)
 * Verifies that infinite agent-to-agent loops (A → B → A → B...) are strictly blocked.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { CommunicationRouter } = require('../src/communication/communication-router');
const { ConversationManager } = require('../src/communication/conversation-manager');
const { ConversationStore } = require('../src/communication/conversation-store');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');

test('SAFETY 1: Blocks messages when conversation message budget is exceeded', () => {
  const router = new CommunicationRouter({ maxMessages: 5, cooldownMs: 0 });

  // 5 messages pass
  for (let i = 0; i < 5; i++) {
    const safety = router.checkSafety({
      conversationId: 'conv-budget-test',
      senderId: 'agent-a',
      content: `Unique Message ${i}`,
      participants: ['agent-a', 'agent-b'],
      messageCount: i
    });
    assert.equal(safety.allowed, true);
  }

  // 6th message blocked
  const blocked = router.checkSafety({
    conversationId: 'conv-budget-test',
    senderId: 'agent-a',
    content: 'Overflow Message',
    participants: ['agent-a', 'agent-b'],
    messageCount: 5
  });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /message budget/i);
});

test('SAFETY 2: Blocks identical duplicate messages in flight', () => {
  const router = new CommunicationRouter({ cooldownMs: 0 });

  const first = router.checkSafety({
    conversationId: 'conv-dup',
    senderId: 'agent-a',
    content: 'Exact identical payload',
    participants: ['agent-a', 'agent-b'],
    messageCount: 0
  });
  assert.equal(first.allowed, true);

  const duplicate = router.checkSafety({
    conversationId: 'conv-dup',
    senderId: 'agent-a',
    content: 'Exact identical payload',
    participants: ['agent-a', 'agent-b'],
    messageCount: 1
  });
  assert.equal(duplicate.allowed, false);
  assert.match(duplicate.reason, /duplicate message/i);
});

test('SAFETY 3: ConversationManager halts message dispatch when safety governor triggers', () => {
  const bus = new AgentCommunicationBus();
  const store = new ConversationStore({ storeDir: require('os').tmpdir() });
  const router = new CommunicationRouter({ maxMessages: 2, cooldownMs: 0 });

  const convMgr = new ConversationManager({
    bus,
    store,
    router
  });

  const conv = convMgr.createConversation({
    participants: ['agent-a', 'agent-b']
  });

  // 1st message OK
  convMgr.sendMessage({
    conversationId: conv.conversationId,
    senderId: 'agent-a',
    content: 'Msg 1'
  });

  // 2nd message OK
  convMgr.sendMessage({
    conversationId: conv.conversationId,
    senderId: 'agent-b',
    content: 'Msg 2'
  });

  // 3rd message should throw circuit breaker error
  assert.throws(() => {
    convMgr.sendMessage({
      conversationId: conv.conversationId,
      senderId: 'agent-a',
      content: 'Msg 3'
    });
  }, /safety governor/i);
});

test('SAFETY 4: Burst cooldown detects rapid ping-pong interaction between same agents', () => {
  const router = new CommunicationRouter({ cooldownMs: 1000 });

  const msg1 = router.checkSafety({
    conversationId: 'conv-burst',
    senderId: 'agent-a',
    content: 'A to B immediate',
    participants: ['agent-a', 'agent-b'],
    messageCount: 0
  });
  assert.equal(msg1.allowed, true);

  // Immediate reply within milliseconds triggers cooldown
  const msg2 = router.checkSafety({
    conversationId: 'conv-burst',
    senderId: 'agent-b',
    content: 'B to A immediate reply',
    participants: ['agent-a', 'agent-b'],
    messageCount: 1
  });
  assert.equal(msg2.allowed, false);
  assert.match(msg2.reason, /cooldown enforced/i);
});

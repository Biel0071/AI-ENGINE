const { normalizeAction } = require('./aiEngineAdapter');

function createInMemoryContextStore() {
  const byConversationKey = new Map();

  function get(conversationKey) {
    return byConversationKey.get(conversationKey) || null;
  }

  function set(conversationKey, context) {
    byConversationKey.set(conversationKey, context);
    return context;
  }

  return {
    get,
    set,
  };
}

function buildConversationKey({ phone, sessionId }) {
  return `${String(sessionId || 'main')}::${String(phone || '').trim()}`;
}

function buildMessageSummary(message = {}) {
  return {
    createdAt: message.createdAt || new Date().toISOString(),
    direction: message.direction || 'incoming',
    text: String(message.text || ''),
  };
}

function createMessageOrchestrator({ aiEngine, contextStore, serviceBus, sessionManager }) {
  const engine = aiEngine || { handle: async () => ({ action: 'ignore', response: '', metadata: {} }) };
  const store = contextStore || createInMemoryContextStore();

  async function getOrCreateContext({ phone, sessionId }) {
    const conversationKey = buildConversationKey({ phone, sessionId });
    const existing = store.get(conversationKey);

    if (existing) {
      return {
        context: existing,
        conversationKey,
      };
    }

    const created = {
      history: [],
      lastStep: 'received',
      sessionId,
      state: 'active',
      updatedAt: new Date().toISOString(),
    };

    return {
      context: store.set(conversationKey, created),
      conversationKey,
    };
  }

  async function handleIncomingEvent({ incomingMessage, sessionId, sock }) {
    if (incomingMessage?.key?.fromMe) {
      return null;
    }

    const remoteJid = String(incomingMessage?.key?.remoteJid || '');
    if (remoteJid.endsWith('@g.us')) {
      return null;
    }

    const normalizedSessionId = sessionManager?.normalizeSessionName
      ? sessionManager.normalizeSessionName(sessionId || 'main')
      : String(sessionId || 'main');

    const payload = await serviceBus.extractIncomingMessage(incomingMessage);

    if (!payload || !payload.phone || (!payload.text && !payload.mediaType)) {
      return null;
    }

    const { context, conversationKey } = await getOrCreateContext({
      phone: payload.phone,
      sessionId: normalizedSessionId,
    });

    const aiDecisionRaw = await engine.handle({
      context,
      message: payload,
      sessionId: normalizedSessionId,
    });

    const aiDecision = {
      action: normalizeAction(aiDecisionRaw?.action),
      metadata: aiDecisionRaw?.metadata || {},
      response: String(aiDecisionRaw?.response || ''),
    };

    const currentStep =
      aiDecision.action === 'reply'
        ? 'ai_reply'
        : aiDecision.action === 'handoff'
          ? 'handoff'
          : 'ignore';

    const nextContext = {
      ...context,
      history: [...(context.history || []), buildMessageSummary({ text: payload.text })].slice(-30),
      lastStep: currentStep,
      updatedAt: new Date().toISOString(),
    };

    store.set(conversationKey, nextContext);

    if (aiDecision.action === 'reply' && aiDecision.response) {
      await serviceBus.sendReply({
        payload,
        response: aiDecision.response,
        sessionId: normalizedSessionId,
        sock,
      });
      return {
        decision: aiDecision,
        handledBy: 'message-orchestrator',
      };
    }

    if (aiDecision.action === 'handoff') {
      await serviceBus.handoff({
        payload,
        sessionId: normalizedSessionId,
      });
      return {
        decision: aiDecision,
        handledBy: 'message-orchestrator',
      };
    }

    if (typeof serviceBus.legacyFlow === 'function') {
      return serviceBus.legacyFlow({
        incomingMessage,
        sessionId: normalizedSessionId,
        sock,
      });
    }

    return {
      decision: aiDecision,
      handledBy: 'message-orchestrator',
    };
  }

  return {
    handleIncomingEvent,
  };
}

module.exports = {
  createInMemoryContextStore,
  createMessageOrchestrator,
};

async function runTask(payload = {}) {
  const io = payload.store?.io || global.io;

  if (!io) {
    return payload;
  }

  if (payload.isNewConversation && payload.updatedConversation) {
    io.emit('new_conversation', payload.updatedConversation);
  }

  if (payload.savedMessage) {
    io.emit('new_message', {
      conversationId: payload.updatedConversation?.id || payload.currentConversation?.id || null,
      id: payload.savedMessage.id,
      phone: payload.savedMessage.phone,
      sessionId: payload.savedMessage.sessionId,
      text: payload.savedMessage.text,
      timestamp: payload.savedMessage.timestamp,
    });
  }

  if (payload.updatedConversation) {
    io.emit('conversation_updated', payload.updatedConversation);
  }

  if (payload.campaign) {
    io.emit('campaign_triggered', {
      ...payload.campaign,
      conversationId: payload.updatedConversation?.id,
      phone: payload.updatedConversation?.phone,
    });
  }

  return payload;
}

module.exports = { runTask };

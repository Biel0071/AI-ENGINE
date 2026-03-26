function analyzeEvent(event = {}) {
  return {
    timestamp: new Date().toISOString(),
    type: String(event.type || 'unknown'),
    hasMessage: Boolean(event.message),
    conversationId: event.conversationId || null,
    command: event.command ? String(event.command) : null,
  };
}

module.exports = {
  analyzeEvent,
};

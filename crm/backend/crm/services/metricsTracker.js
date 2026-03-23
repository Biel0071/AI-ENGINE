let lastMetricsSnapshot = {
  generatedAt: null,
  messagesProcessed: 0,
  uptime: 0,
};

function buildMetricsSnapshot(store = {}) {
  const conversations = Array.isArray(store.conversations) ? store.conversations : [];
  const messages = Array.isArray(store.messages) ? store.messages : [];
  const openConversations = conversations.filter((item) => item.status !== 'closed').length;
  const connectedSessions = Array.from(store.sessionManager?.sessions?.values?.() || []).filter(
    (session) => session?.status === 'connected'
  ).length;

  return {
    activeConversations: openConversations,
    connectedSessions,
    generatedAt: new Date().toISOString(),
    messagesProcessed: messages.length,
    totalConversations: conversations.length,
    totalMessages: messages.length,
    uptime: Number(process.uptime().toFixed(3)),
  };
}

function getMetrics(store = {}) {
  const snapshot = buildMetricsSnapshot(store);

  lastMetricsSnapshot = {
    generatedAt: snapshot.generatedAt,
    messagesProcessed: snapshot.messagesProcessed,
    uptime: snapshot.uptime,
  };

  return {
    ...lastMetricsSnapshot,
  };
}

function emitMetrics(store, snapshot) {
  const io = store?.io || global.io;

  if (!io) {
    return;
  }

  io.emit('metrics.updated', snapshot);
}

function startMetricsTracking(store, options = {}) {
  const intervalMs = Number(options.intervalMs) || 30000;

  const run = () => {
    const snapshot = buildMetricsSnapshot(store);
    lastMetricsSnapshot = {
      generatedAt: snapshot.generatedAt,
      messagesProcessed: snapshot.messagesProcessed,
      uptime: snapshot.uptime,
    };
    store.metricsSnapshot = snapshot;
    emitMetrics(store, snapshot);
  };

  run();
  const timer = setInterval(run, intervalMs);

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

module.exports = {
  buildMetricsSnapshot,
  getMetrics,
  startMetricsTracking,
};

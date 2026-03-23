require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { Server } = require('socket.io');
const { requestContextMiddleware } = require('./middleware/requestContext');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { apiEnvelopeMiddleware, normalizeErrorMessage } = require('./middleware/apiEnvelope');

const { businessHours, isBusinessOpen } = require('./config/businessHours');
const { initDatabase } = require('./config/database');
const { ensurePromptHistory } = require('./config/promptManager');
const { getPublicUrl, startNgrok } = require('./config/ngrok');
const { loadStoreState, saveStoreState } = require('./config/storage');
const { initializeBugWatcher } = require('./services/bugWatcher');
const aiRouter = require('./routes/ai');
const conversationsRouter = require('./routes/conversations');
const messagesRouter = require('./routes/messages');
const sessionsRouter = require('./routes/sessions');
const systemRouter = require('./routes/system');
const aiGeneratedFixesRouter = require('./routes/aiGeneratedFixes');
const leadsRouter = require('./routes/leads');
const aiConfigRouter = require('./routes/aiConfig');
const contactsRouter = require('./routes/contacts');
const analyticsRouter = require('./routes/analytics');
const automationRouter = require('./routes/automation');
const quickRepliesRouter = require('./routes/quickReplies');
const acebotRouter = require('./routes/acebot');
const integrationsRouter = require('./routes/integrations');
const { tenantContextMiddleware } = require('./services/tenantContext');
const messagesController = require('./controllers/messagesController');
const messageStore = require('./store/messageStore');
const conversationRepository = require('./repositories/conversationRepository');
const messageRepository = require('./repositories/messageRepository');
const { initAIToggle, isAIEnabled } = require('./config/aiToggle');
const { generateAIResponse } = require('./services/aiResponseEngine');
const sessionManager = require('./services/sessionManager');
const systemManager = require('./services/systemManager');
const runtimeManager = require('./services/runtimeManager');
const whatsappService = require('./services/whatsappService');
const { decideMessageAction } = require('./services/automationDecisionEngine');
const aiAgentService = require('./ai-agents/services/aiAgentService');
const conversationRuntimeService = require('./backend/inbox/services/ConversationRuntimeService');
const { createMessageOrchestrator } = require('../baileys/services/messageOrchestrator');
const aiEngineAdapter = require('../baileys/services/aiEngineAdapter');
const { DEFAULT_SESSION } = whatsappService;

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || '';
const BASE_ALLOWED_ORIGINS = [
  'https://swift-wa-assist.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
  ...(FRONTEND_URL ? [FRONTEND_URL] : []),
];
let PUBLIC_API_URL = `http://localhost:${PORT}`;

function getAllowedOrigins() {
  return [
    ...BASE_ALLOWED_ORIGINS,
    ...(app.locals.store?.publicUrl ? [app.locals.store.publicUrl] : []),
  ];
}

function validateOrigin(origin, callback) {
  const allowedOrigins = new Set(getAllowedOrigins());

  if (!origin || allowedOrigins.has(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`CORS blocked for origin: ${origin}`));
}

function buildTransientMessage(payload, sessionId) {
  return {
    from: 'client',
    id: `transient-${Date.now()}`,
    mediaPath: payload.mediaPath || null,
    mediaType: payload.mediaType || null,
    phone: payload.phone,
    sessionId,
    text: payload.text || '',
    timestamp: new Date().toISOString(),
    type: payload.mediaType || 'text',
  };
}

function shouldSendAbsenceReply(store, conversationKey) {
  if (!store?.absenceState || !conversationKey) {
    return true;
  }
  const state = store.absenceState[conversationKey];

  if (!state) {
    return true;
  }

  return state.sent !== true && state.pending !== true;
}

function markAbsenceReplyState(store, conversationKey, nextState = {}) {
  if (!store || !conversationKey) {
    return;
  }

  if (!store.absenceState || typeof store.absenceState !== 'object') {
    store.absenceState = {};
  }

  store.absenceState[conversationKey] = {
    pending: Boolean(nextState.pending),
    sent: Boolean(nextState.sent),
    sentAt: nextState.sentAt || null,
    updatedAt: new Date().toISOString(),
  };
}

async function waitMs(delay = 0) {
  if (!delay || delay <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, delay));
}

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

global.io = io;
app.set('io', io);
initializeBugWatcher();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestContextMiddleware);
app.use(tenantContextMiddleware);
app.use(apiEnvelopeMiddleware);
app.use(
  cors({
    credentials: true,
    origin: validateOrigin,
  })
);
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/upload', express.static(path.join(__dirname, 'upload')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.locals.store = {
  conversations: [],
  databaseEnabled: false,
  databaseError: null,
  io,
  messages: [],
  metricsJob: null,
  metricsSnapshot: null,
  ngrokProcess: null,
  publicUrl: PUBLIC_API_URL,
  saveState: async () => Promise.resolve(),
  saveAiState: async () =>
    saveStoreState({
      aiLearningLogs: app.locals.store.aiLearningLogs,
      promptHistory: app.locals.store.promptHistory,
    }),
  aiLearningLogs: [],
  campaignJob: null,
  campaignSnapshot: null,
  learningJob: null,
  promptHistory: [],
  system: {
    active: false,
    inboxEnabled: false,
    listenersActive: false,
    startedAt: null,
    status: 'inactive',
  },
  sessionManager,
  absenceState: {},
  sock: null,
};

const messageOrchestrator = createMessageOrchestrator({
  aiEngine: aiEngineAdapter,
  sessionManager,
  serviceBus: {
    extractIncomingMessage: messagesController.extractIncomingMessage,
    sendReply: async ({ payload, response, sessionId, sock }) => {
      await whatsappService.sendMessage(sock, payload.phone, response);

      await messagesController.registerOutgoingMessage(app.locals.store, {
        companyId: payload.companyId,
        name: payload.name,
        phone: payload.phone,
        sessionId,
        source: 'ai',
        text: response,
      });
    },
    handoff: async ({ payload, sessionId }) => {
      const conversation = await conversationRepository.getConversationByPhone(
        payload.phone,
        payload.companyId || process.env.DEFAULT_COMPANY_ID || 'default',
        sessionId
      );

      if (conversation?.id) {
        conversationRuntimeService.setHumanTakeover(app.locals.store, conversation.id);
      }
    },
    legacyFlow: ({ incomingMessage, sessionId, sock }) =>
      legacyIncomingMessageFlow({ incomingMessage, sessionId, sock }),
  },
});

io.on('connection', (socket) => {
  console.log('[SERVER] WebSocket client connected');

  socket.on('typing:start', (payload = {}) => {
    io.emit('typing:start', payload);
    io.emit('typing_start', payload);
  });

  socket.on('typing:stop', (payload = {}) => {
    io.emit('typing:stop', payload);
    io.emit('typing_stop', payload);
  });
});

app.use('/system', systemRouter);
app.use('/', messagesRouter);
app.use('/api', messagesRouter);
app.use('/', conversationsRouter);
app.use('/api', conversationsRouter);
app.use('/', aiRouter);
app.use('/', aiConfigRouter);
app.use('/', sessionsRouter);
app.use('/', aiGeneratedFixesRouter);

app.use('/', leadsRouter);
app.use('/', contactsRouter);
app.use('/', analyticsRouter);
app.use('/', automationRouter);
app.use('/', quickRepliesRouter);
app.use('/', integrationsRouter);

const writeHeavyRateLimiter = createRateLimiter({
  max: 120,
  windowMs: 60_000,
});

app.use('/send-message', writeHeavyRateLimiter);
app.use('/send-media', writeHeavyRateLimiter);
app.use('/api/integrations', writeHeavyRateLimiter);

app.use('/ai', acebotRouter);
app.use('/api/ai', acebotRouter);
app.get('/health', (_req, res) => {
  const session = sessionManager.getSession(DEFAULT_SESSION);

  res.json({
    database: app.locals.store.databaseEnabled ? 'connected' : 'degraded',
    status: 'ok',
    service: 'whatsapp-crm-api',
    system: systemManager.getSystemStatus(app.locals.store),
    whatsapp: !sessionManager.isRuntimeActive()
      ? 'inactive'
      : session?.status === 'connected'
        ? 'connected'
        : 'connecting',
  });
});

app.get('/diagnostics', (_req, res) => {
  const defaultSession = sessionManager.getSession(DEFAULT_SESSION);

  return res.status(200).json({
    aiEngineStatus: isAIEnabled(),
    databaseStatus: app.locals.store.databaseEnabled,
    runtimeActive: sessionManager.isRuntimeActive(),
    socketConnections: io.engine.clientsCount,
    systemStatus: app.locals.store.system?.status || 'unknown',
    whatsappStatus: defaultSession,
  });
});

app.use((req, res) => {
  res.status(404).type('application/json').json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, _next) => {
  console.error('[SERVER] Unhandled error:', err?.stack || err?.message || err);

  if (res.headersSent) {
    return;
  }

  const statusCode = err?.status || err?.statusCode || 500;
  const isPayloadTooLarge =
    statusCode === 413 || err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE';

  res
    .status(statusCode)
    .type('application/json')
    .json({
      error: isPayloadTooLarge
        ? 'Payload exceeds the 50MB upload limit.'
        : normalizeErrorMessage(err, statusCode >= 500 ? 'Unexpected server error.' : 'Request error.'),
    });
});

async function legacyIncomingMessageFlow({ incomingMessage, sessionId, sock }) {
  if (incomingMessage?.key?.fromMe) {
    return null;
  }

  const remoteJid = incomingMessage?.key?.remoteJid || '';

  if (remoteJid.endsWith('@g.us')) {
    return;
  }

  const payload = await messagesController.extractIncomingMessage(incomingMessage);

  if (!payload || !payload.phone || (!payload.text && !payload.mediaType)) {
    return;
  }

  if (!app.locals.store.databaseEnabled) {
    const normalizedPhone = (payload.phone || '').replace(/@s\.whatsapp\.net$/i, '').trim();
    const memEntry = messageStore.addMessage(normalizedPhone, {
      content: payload.text || '',
      createdAt: new Date().toISOString(),
      fromMe: false,
      mediaPath: payload.mediaPath || null,
      mediaType: payload.mediaType || null,
      name: payload.name || normalizedPhone,
      sessionId,
      conversationId: `chat-${normalizedPhone}`,
      status: 'received',
    });

    io?.emit('message:new', {
      conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
      message: memEntry,
    });
    io?.emit('new_message', {
      conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
      id: memEntry?.id,
      phone: normalizedPhone,
      sessionId,
      text: payload.text || '',
      timestamp: memEntry?.createdAt || new Date().toISOString(),
    });

    console.log(`[INBOX] inbound message stored in memory: ${normalizedPhone}`);
    return {
      conversation: { id: memEntry?.conversationId || `chat-${normalizedPhone}`, phone: normalizedPhone },
      message: memEntry || buildTransientMessage(payload, sessionId),
    };
  }

  const messagePayload = {
    ...payload,
    sessionId,
  };

  const incoming = {
    message:
      incomingMessage?.message?.conversation ||
      incomingMessage?.message?.extendedTextMessage?.text ||
      '',
    phone: remoteJid.replace('@s.whatsapp.net', ''),
    text: payload.text,
  };

  let result = null;

  try {
    result = await messagesController.registerIncomingMessage(
      app.locals.store,
      messagePayload
    );

    if (result?.message) {
      console.log(`MESSAGE SAVED: ${incoming.phone}`);
    } else if (result?.conversation?.id) {
      const messageData = {
        phone: incoming.phone,
        content: incoming.text || incoming.message,
        fromMe: false,
        createdAt: new Date(),
        conversationId: result.conversation.id,
      };

      try {
        result = {
          ...result,
          message: await messageRepository.create(messageData),
        };
        console.log(`MESSAGE SAVED: ${incoming.phone}`);
      } catch (err) {
        console.error('MESSAGE SAVE ERROR:', err);
      }
    }

    if (result?.message) {
      const io = app.get('io');

      io?.emit('message:new', {
        phone: incoming.phone,
        conversationId: result.message.conversationId,
        message: result.message,
      });

      console.log('[INBOX] realtime event emitted');
    }
  } catch (error) {
    console.error('[CRM] Failed to persist incoming message:', error.message || error);

    return {
      conversation: null,
      message: buildTransientMessage(payload, sessionId),
    };
  }

  if (!isBusinessOpen()) {
    const conversationKey = String(result?.conversation?.id || payload.phone || '');
    const shouldReply = shouldSendAbsenceReply(app.locals.store, conversationKey);

    if (shouldReply) {
      markAbsenceReplyState(app.locals.store, conversationKey, { pending: true, sent: false });
      await waitMs(10_000);
      await whatsappService.sendMessage(sock, payload.phone, businessHours.absenceMessage);
      await messagesController.registerOutgoingMessage(app.locals.store, {
        companyId: payload.companyId,
        name: result.agent?.name || payload.name,
        phone: payload.phone,
        sessionId,
        source: 'system',
        systemTag: 'absence',
        text: businessHours.absenceMessage,
      });
      markAbsenceReplyState(app.locals.store, conversationKey, {
        pending: false,
        sent: true,
        sentAt: new Date().toISOString(),
      });
    }

    return result;
  }

  if (result.conversation?.aiEnabled === false) {
    console.log('[AI] conversation disabled');
    return result;
  }

  if (!isAIEnabled()) {
    console.log('[AI] engine inactive');
    return result;
  }

  console.log('[AI] conversation enabled');

  const aiDecision = conversationRuntimeService.canRunAI(
    app.locals.store,
    result?.conversation?.id,
    payload.text || ''
  );

  if (!aiDecision.allow) {
    console.log(`[AI] skipped by guardrail: ${aiDecision.reason}`);
    return result;
  }

  try {
    const runtimeState = conversationRuntimeService.getConversationRuntime(
      app.locals.store,
      result?.conversation?.id
    );

    const actionDecision = decideMessageAction({
      text: payload.text || result?.message?.text || '',
      conversation: result?.conversation,
      leadAnalysis: result?.leadAnalysis,
      runtime: runtimeState,
      agent: result?.agent,
    });

    if (actionDecision.action === 'wait') {
      console.log(`[AI] decision=wait reason=${actionDecision.reason}`);
      return result;
    }

    if (actionDecision.action === 'escalate') {
      console.log(`[AI] decision=escalate reason=${actionDecision.reason}`);

      conversationRuntimeService.setHumanTakeover(
        app.locals.store,
        result?.conversation?.id,
        actionDecision.humanTimeoutMs
      );

      if (actionDecision.replyText) {
        const dedupeDecision = conversationRuntimeService.canSendAIResponse(
          app.locals.store,
          result?.conversation?.id,
          actionDecision.replyText
        );

        if (dedupeDecision.allow) {
          await whatsappService.sendMessage(sock, payload.phone, actionDecision.replyText);
          await messagesController.registerOutgoingMessage(app.locals.store, {
            companyId: payload.companyId,
            name: result.agent?.name || payload.name,
            phone: payload.phone,
            sessionId,
            source: 'system',
            systemTag: 'handoff',
            text: actionDecision.replyText,
          });
        }
      }

      io?.emit('conversation:update', {
        conversationId: result?.conversation?.id,
        controlMode: 'human_active',
        aiPausedUntil: conversationRuntimeService.getConversationRuntime(app.locals.store, result?.conversation?.id)?.aiPausedUntil || null,
      });

      return result;
    }

    if (actionDecision.action === 'trigger_flow') {
      console.log(`[AI] decision=trigger_flow flow=${actionDecision.flowKey || 'unknown'}`);
      const flowReply = actionDecision.replyText || '';

      if (!flowReply) {
        return result;
      }

      const dedupeDecision = conversationRuntimeService.canSendAIResponse(
        app.locals.store,
        result?.conversation?.id,
        flowReply
      );

      if (!dedupeDecision.allow) {
        console.log(`[AI] flow reply blocked: ${dedupeDecision.reason}`);
        return result;
      }

      await whatsappService.sendMessage(sock, payload.phone, flowReply);
      await messagesController.registerOutgoingMessage(app.locals.store, {
        companyId: payload.companyId,
        name: result.agent?.name || payload.name,
        phone: payload.phone,
        sessionId,
        source: 'ai',
        text: flowReply,
      });

      return result;
    }

    const conversationHistory = await messageRepository.getMessagesByConversation(
      result.conversation.id
    );
    const autoReply = await generateAIResponse({
      agent: result.agent,
      conversation: result.conversation,
      conversationHistory,
      customerMessage: payload.text || result.message.text,
      leadAnalysis:
        result.leadAnalysis || {
          intent: result.conversation.lead_intent,
          lead_temperature: result.conversation.lead_temperature,
          next_action: result.conversation.next_action,
        },
      salesStrategy: result.salesStrategy,
      store: app.locals.store,
    });

    if (!autoReply) {
      return result;
    }

    const dedupeDecision = conversationRuntimeService.canSendAIResponse(
      app.locals.store,
      result?.conversation?.id,
      autoReply
    );

    if (!dedupeDecision.allow) {
      console.log(`[AI] response blocked: ${dedupeDecision.reason}`);
      return result;
    }

    const simulatedDelayMs = aiAgentService.getDelayForAgentMs(result.agent);
    await aiAgentService.wait(simulatedDelayMs);

    await whatsappService.sendMessage(sock, payload.phone, autoReply);
    await messagesController.registerOutgoingMessage(app.locals.store, {
      companyId: payload.companyId,
      name: result.agent?.name || payload.name,
      phone: payload.phone,
      sessionId,
      source: 'ai',
      text: autoReply,
    });
  } catch (error) {
    console.error('[AI] Auto-reply failed:', error.message);
  }

  return result;
}

async function handleIncomingMessage({ incomingMessage, sessionId, sock }) {
  return messageOrchestrator.handleIncomingEvent({
    incomingMessage,
    sessionId,
    sock,
  });
}

function handleSessionConnected(session) {
  if (session.sessionId === DEFAULT_SESSION) {
    app.locals.store.sock = session.sock;
  }

  console.log(`[WHATSAPP] session ${session.sessionId} connected`);
}

async function bootstrap() {
  const uploadDir = path.join(__dirname, 'upload');
  const uploadsDir = path.join(__dirname, 'uploads');

  if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
  }

  if (!fsSync.existsSync(uploadsDir)) {
    fsSync.mkdirSync(uploadsDir, { recursive: true });
  }

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
  await aiAgentService.hydrateFromSettings();
  const persistedState = await loadStoreState();

  try {
    await initDatabase();
    app.locals.store.databaseEnabled = true;
    app.locals.store.databaseError = null;
    console.log('[DB] PostgreSQL connected');
    await initAIToggle();

    app.locals.store.conversations = await conversationRepository.listConversations(
      process.env.DEFAULT_COMPANY_ID || 'default',
      50,
      { useCache: false }
    );
    app.locals.store.messages = await messageRepository.listRecentMessages(
      2000,
      process.env.DEFAULT_COMPANY_ID || 'default'
    );
  } catch (error) {
    app.locals.store.databaseEnabled = false;
    app.locals.store.databaseError = error?.message || String(error);
    app.locals.store.conversations = [];
    app.locals.store.messages = [];
    await initAIToggle();
    console.warn('[DB] PostgreSQL unavailable. Running in degraded mode:', error?.code || error?.message || error);
  }

  app.locals.store.aiLearningLogs = persistedState.aiLearningLogs || [];
  app.locals.store.promptHistory = persistedState.promptHistory || [];
  ensurePromptHistory(app.locals.store);
  await app.locals.store.saveAiState();

  sessionManager.configureSessionManager({
    io,
    onIncomingMessage: handleIncomingMessage,
    onSessionConnected: handleSessionConnected,
  });

  sessionManager.setRuntimeActive(false);
  app.locals.store.learningJob = null;

  server.listen(PORT, '0.0.0.0', async () => {
    console.log('[SERVER] API running');

    // Initialize runtime manager (handles ngrok and monitoring)
    if (process.env.NGROK_MANAGED_EXTERNALLY !== 'true') {
      try {
        const runtimeStatus = await runtimeManager.initialize(PORT);
        console.log('[SERVER] Runtime Manager initialized:', runtimeStatus);
      } catch (error) {
        console.error('[SERVER] Failed to initialize runtime manager:', error.message);
        console.warn('[SERVER] Continuing without ngrok tunnel...');
      }
    } else {
      console.log('[SERVER] ngrok managed externally - skipping runtime manager');
    }

    PUBLIC_API_URL = await getPublicUrl(`http://localhost:${PORT}`);
    app.locals.store.publicUrl = PUBLIC_API_URL;

    console.log('[SERVER] Public API URL:');
    console.log(PUBLIC_API_URL);

    try {
      const bootStatus = await systemManager.startSystem(app.locals.store);
      const restored = Array.isArray(bootStatus?.restoredSessions) ? bootStatus.restoredSessions.length : 0;
      console.log(`[SERVER] Session lifecycle initialized. Restored sessions: ${restored}`);
    } catch (error) {
      console.error('[SERVER] Failed to auto-restore sessions at startup:', error.message || error);
    }

    if (process.env.AI_AUTO_TESTS_ON_CHANGE === 'true') {
      try {
        const { startAutoRunWatcher } = require('./tests/testRunner');
        startAutoRunWatcher({ app });
        console.log('[SERVER] AI auto-test watcher enabled');
      } catch (error) {
        console.warn('[SERVER] Failed to enable AI auto-test watcher:', error.message || error);
      }
    }
  });
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${PORT} is already in use. Set PORT to another value or stop the running instance.`);
    process.exit(1);
  }

  console.error('[SERVER] HTTP server failed:', error?.stack || error?.message || error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('[SERVER] Bootstrap failed:', error?.stack || error?.message || error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] Shutting down gracefully...');
  await systemManager.shutdownSystem(app.locals.store);
  await runtimeManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[SERVER] Shutting down gracefully...');
  await systemManager.shutdownSystem(app.locals.store);
  await runtimeManager.shutdown();
  process.exit(0);
});

module.exports = app;

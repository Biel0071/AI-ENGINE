const fs = require('fs/promises');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  downloadContentFromMessage,
  downloadMediaMessage,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const contactRepository = require('../repositories/contactRepository');
const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const sessionRepository = require('../repositories/sessionRepository');
const { getAgentByName, pickRandomAgent } = require('../config/agents');
const { evaluateCampaign } = require('./campaignEngine');
const { runTask } = require('./microtaskRunner');
const { generateConversationSummary } = require('./conversationSummarizer');
const { analyzeLeadIntent } = require('./leadAnalyzer');
const { generateSalesStrategy } = require('./salesStrategyEngine');
const { buildLeadTags, getNextFunnelStage } = require('./salesFunnel');

const MEDIA_DIRECTORY = path.join(__dirname, '..', 'media');
const UPLOADS_DIRECTORY = path.join(__dirname, '..', 'uploads');
const SESSIONS_DIRECTORY = path.join(__dirname, '..', 'sessions');
const DEFAULT_RECONNECT_DELAY_MS = 3000;
const DEFAULT_SESSION = 'main';
const MAX_RECENT_MESSAGE_IDS = 500;

function normalizeSessionName(sessionName = DEFAULT_SESSION) {
  const normalized = String(sessionName || DEFAULT_SESSION)
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

  return normalized || DEFAULT_SESSION;
}

function getCompanyId(companyId) {
  return companyId || process.env.DEFAULT_COMPANY_ID || 'default';
}

function normalizePhone(phone = '') {
  return String(phone || '')
    .trim()
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/\s+/g, '');
}

function ensureWhatsAppJid(phone = '') {
  const value = String(phone || '').trim();

  if (!value) {
    return value;
  }

  if (value.includes('@')) {
    return value;
  }

  return `${normalizePhone(value)}@s.whatsapp.net`;
}

function safeSerializeInboundMessage(messageData) {
  try {
    return JSON.stringify(
      messageData,
      (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }

        if (Buffer.isBuffer(value)) {
          return {
            dataLength: value.length,
            type: 'Buffer',
          };
        }

        return value;
      },
      2
    );
  } catch (error) {
    return `{"error":"failed_to_serialize_inbound_message","message":"${error.message || error}"}`;
  }
}

function isLikelyBase64Payload(value = '') {
  const normalized = String(value || '').trim();

  if (!normalized || normalized.length < 16) {
    return false;
  }

  if (normalized.startsWith('data:')) {
    return true;
  }

  if (/^(https?:)?\/\//i.test(normalized)) {
    return false;
  }

  if (/^[A-Za-z]:\\|^\\\\|^\//.test(normalized)) {
    return false;
  }

  return /^[A-Za-z0-9+/=\r\n]+$/.test(normalized);
}

function toRealtimeTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function buildRealtimeMessagePayload(message = {}) {
  const resolvedType =
    message.mediaType === 'document'
      ? 'file'
      : message.mediaType || message.type || 'text';

  return {
    chatId: ensureWhatsAppJid(message.phone || ''),
    conversationId: message.conversationId || message.conversation_id || null,
    fromMe:
      typeof message.fromMe === 'boolean'
        ? message.fromMe
        : message.from === 'agent' || message.sender === 'agent',
    id: message.id,
    phone: message.phone,
    sessionId: normalizeSessionName(message.sessionId || message.sessionName || DEFAULT_SESSION),
    text: message.text || message.content || '',
    timestamp: toRealtimeTimestamp(message.timestamp),
    type: resolvedType,
  };
}

function buildRealtimeMediaPayload({ messageData = {}, savedMessage = {}, sessionId }) {
  const { mediaType } = getMediaDescriptor(messageData.message || {});

  if (!mediaType) {
    return null;
  }

  const realtimeType = mediaType === 'document' ? 'file' : mediaType;

  const text = extractMessageText(messageData.message || '') || savedMessage.text || savedMessage.content || '';
  const realtimeTimestamp = messageData.messageTimestamp
    ? Number(messageData.messageTimestamp) * 1000
    : toRealtimeTimestamp(savedMessage.timestamp || savedMessage.createdAt);

  return {
    caption: text,
    chatId: messageData.key?.remoteJid || ensureWhatsAppJid(savedMessage.phone || ''),
    conversationId: savedMessage.conversationId || null,
    fromMe: Boolean(messageData.key?.fromMe),
    id: messageData.key?.id || savedMessage.id || null,
    mediaPath: savedMessage.mediaPath || null,
    mediaType: realtimeType,
    mimetype: messageData.message?.imageMessage?.mimetype || messageData.message?.videoMessage?.mimetype || messageData.message?.audioMessage?.mimetype || messageData.message?.documentMessage?.mimetype || null,
    sessionId: normalizeSessionName(sessionId || savedMessage.sessionId || DEFAULT_SESSION),
    text,
    timestamp: realtimeTimestamp,
    type: realtimeType,
  };
}

function emitRealtimeEvent(io, eventName, payload) {
  const socketServer = io || global.io;

  if (!socketServer) {
    return;
  }

  const eventPayload =
    eventName === 'new_message' ? buildRealtimeMessagePayload(payload) : payload;

  socketServer.emit(eventName, eventPayload);

  if (eventName === 'new_message') {
    socketServer.emit('new-message', eventPayload);
    socketServer.emit('message:new', {
      conversationId: eventPayload.conversationId || null,
      message: eventPayload,
    });
  }

  if (eventName === 'conversation_updated' || eventName === 'conversation:update') {
    socketServer.emit('conversation:update', eventPayload);
    socketServer.emit('conversation_updated', eventPayload);
    socketServer.emit('conversation-update', eventPayload);
  }

  if (eventName === 'messages.update') {
    socketServer.emit('message:update', eventPayload);
  }
}

function emitConnectionUpdate(io, payload) {
  const socketServer = io || global.io;

  if (!socketServer) {
    return;
  }

  socketServer.emit('connection.update', payload);
  socketServer.emit('connection-update', payload);
}

function emitSessionStatus(io, sessionId, status, sessionName = null) {
  const socketServer = io || global.io;

  if (!socketServer) {
    return;
  }

  const normalizedStatus = (() => {
    const value = String(status || '').toLowerCase();

    if (value === 'qr_ready') {
      return 'qr';
    }

    if (value === 'error') {
      return 'error';
    }

    if (['connected', 'connecting', 'qr', 'disconnected', 'creating'].includes(value)) {
      return value;
    }

    return 'disconnected';
  })();

  const payload = {
    eventAt: Date.now(),
    type: 'status',
    name: sessionName || sessionId,
    sessionId,
    sessionName: sessionName || sessionId,
    status: normalizedStatus,
  };

  socketServer.emit('session_status', payload);
  socketServer.emit('session:status', payload);
  socketServer.emit('connection:event', payload);

  const isOnline = ['connected', 'connecting', 'qr', 'creating'].includes(normalizedStatus);
  const activeSessions = isOnline
    ? [
        {
          name: payload.name,
          sessionId: payload.sessionId,
          sessionName: payload.sessionName,
          status: payload.status,
        },
      ]
    : [];

  socketServer.emit('system:runtime-status', {
    sessions: activeSessions,
    status: isOnline ? 'online' : 'offline',
  });
}

function pushConnectionLog(session, level, event, message) {
  if (!session) {
    return;
  }

  if (!Array.isArray(session.connectionLogs)) {
    session.connectionLogs = [];
  }

  session.connectionLogs.push({
    event,
    level,
    message,
    timestamp: new Date().toISOString(),
  });

  if (session.connectionLogs.length > 25) {
    session.connectionLogs = session.connectionLogs.slice(-25);
  }
}

async function toQrDataUrl(qr) {
  if (!qr) {
    return null;
  }

  return QRCode.toDataURL(qr, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
}

async function ensureSessionsDirectory() {
  await fs.mkdir(SESSIONS_DIRECTORY, { recursive: true });
}

async function ensureSessionPath(sessionName) {
  await ensureSessionsDirectory();
  const normalizedSessionName = normalizeSessionName(sessionName);
  const sessionPath = path.join(SESSIONS_DIRECTORY, normalizedSessionName);

  console.log('Creating session:', normalizedSessionName);
  console.log('Session folder:', `sessions/${normalizedSessionName}`);

  await fs.mkdir(sessionPath, { recursive: true });
  return {
    normalizedSessionName,
    sessionPath,
  };
}

function sessionPhoneFromSock(sock) {
  const userId = sock?.user?.id;

  if (!userId) {
    return null;
  }

  return String(userId).split(':')[0] || null;
}

function getConnectionCloseCode(lastDisconnect) {
  return (
    lastDisconnect?.error?.output?.statusCode ||
    lastDisconnect?.error?.data?.statusCode ||
    lastDisconnect?.error?.statusCode ||
    null
  );
}

function shouldReconnect(lastDisconnect) {
  const closeCode = getConnectionCloseCode(lastDisconnect);
  return closeCode !== DisconnectReason.loggedOut;
}

async function safeCreateSessionRecord(sessionId, sessionName) {
  try {
    await sessionRepository.createSession({
      phoneNumber: null,
      sessionId,
      sessionName,
      status: 'connecting',
    });
  } catch (error) {
    console.warn(`[DB] Session ${sessionId} persistence unavailable:`, error.message || error);
  }
}

async function safeUpdateSessionStatus(sessionId, status, phone, sessionName) {
  try {
    await sessionRepository.updateSessionStatus(sessionId, status, phone, undefined, sessionName);
  } catch (error) {
    console.warn(`[DB] Session ${sessionId} status sync failed:`, error.message || error);
  }
}

async function emitMessageUpdates(io, updates = [], sessionId) {
  const socketServer = io || global.io;

  if (!socketServer || !Array.isArray(updates) || updates.length === 0) {
    return;
  }

  const payload = {
    sessionId,
    updates,
  };

  socketServer.emit('messages.update', payload);
  socketServer.emit('message:update', payload);
  socketServer.emit('message-update', payload);
}

function shouldRefreshSummary(messageHistory = []) {
  return messageHistory.length > 0 && messageHistory.length % 5 === 0;
}

function getConversationPreview(text, mediaType) {
  if (text) {
    return text;
  }

  if (mediaType) {
    return `[${mediaType}]`;
  }

  return '';
}

function toMediaPayload(filePath) {
  const normalized = String(filePath || '').trim();

  if (!normalized) {
    return getMediaUrlPayload(filePath);
  }

  if (normalized.startsWith('data:')) {
    const [, base64Content = ''] = normalized.split(',', 2);
    return Buffer.from(base64Content, 'base64');
  }

  if (isLikelyBase64Payload(normalized)) {
    return Buffer.from(normalized.replace(/\s+/g, ''), 'base64');
  }

  return getMediaUrlPayload(filePath);
}

function normalizeInboundPhone(remoteJid = '') {
  if (!remoteJid) {
    return null;
  }

  return String(remoteJid).replace(/@s\.whatsapp\.net$/i, '');
}

function buildInboundDebugPayload(messageData = {}) {
  const phone = normalizePhone(messageData.key?.remoteJid || '');
  const text = extractMessageText(messageData.message || {}) || '[media]';
  const timestamp = messageData.messageTimestamp
    ? Number(messageData.messageTimestamp) * 1000
    : Date.now();

  return {
    from: phone,
    id: messageData.key?.id || null,
    phone,
    text,
    timestamp,
  };
}

function formatInboundSavedMessage(result = {}, fallback = {}) {
  if (!result?.message) {
    return null;
  }

  return {
    ...result.message,
    content: result.message.content || result.message.text || fallback.text || '',
    conversationId: result.message.conversationId || result.conversation?.id || fallback.conversationId || null,
    createdAt: result.message.createdAt || result.message.timestamp || new Date().toISOString(),
    fromMe:
      typeof result.message.fromMe === 'boolean'
        ? result.message.fromMe
        : result.message.from === 'agent',
    phone: result.message.phone || fallback.phone || null,
    status: result.message.status || 'received',
    text: result.message.text || result.message.content || fallback.text || '',
    timestamp: result.message.timestamp || result.message.createdAt || fallback.timestamp || new Date().toISOString(),
    whatsappMessageId: fallback.id || null,
  };
}

function emitInboundRealtimeMessage(io, savedMessage, conversation = null) {
  if (!savedMessage) {
    return;
  }

  const socketServer = global.io || io;

  if (!socketServer) {
    return;
  }

  const payload = {
    conversationId: savedMessage.conversationId,
    message: savedMessage,
  };

  socketServer.emit('message:new', payload);
  socketServer.emit('new_message', buildRealtimeMessagePayload(savedMessage));

  if (conversation) {
    socketServer.emit('conversation:update', conversation);
    socketServer.emit('conversation_updated', conversation);
    socketServer.emit('conversation-update', conversation);
  }

  console.log('SOCKET EVENT EMITTED');
}

function shouldProcessRealtimeMessage(session, messageId) {
  if (!session || !messageId) {
    return true;
  }

  if (!session.recentMessageIds) {
    session.recentMessageIds = new Set();
    session.recentMessageOrder = [];
  }

  if (session.recentMessageIds.has(messageId)) {
    return false;
  }

  session.recentMessageIds.add(messageId);
  session.recentMessageOrder.push(messageId);

  if (session.recentMessageOrder.length > MAX_RECENT_MESSAGE_IDS) {
    const removedMessageId = session.recentMessageOrder.shift();

    if (removedMessageId) {
      session.recentMessageIds.delete(removedMessageId);
    }
  }

  return true;
}

async function persistRealtimeMessage({ incomingMessage, sessionId }) {
  const payload = await extractIncomingMessage(incomingMessage);

  if (!payload?.phone || (!payload.text && !payload.mediaType)) {
    return null;
  }

  const messagePreview = payload.text || `[${payload.mediaType || 'text'}]`;
  const conversation = await conversationRepository.findOrCreateConversationByPhone({
    companyId: payload.companyId,
    contactName: payload.name || payload.phone,
    lastMessage: messagePreview,
    lastMessageType: payload.mediaType || 'text',
    phone: payload.phone,
    sessionId,
  });

  const savedMessage = await messageRepository.create({
    companyId: payload.companyId,
    content: messagePreview,
    conversationId: conversation.id,
    createdAt: payload.timestamp || new Date().toISOString(),
    fromMe: Boolean(incomingMessage.key?.fromMe),
    mediaPath: payload.mediaPath,
    messageType: payload.mediaType || 'text',
    phone: payload.phone,
    sessionId,
    status: incomingMessage.key?.fromMe ? 'sent' : 'received',
  });

  const updatedConversation = await conversationRepository.updateConversationState(conversation.id, {
    lastMessage: messagePreview,
    lastMessageType: payload.mediaType || 'text',
    session_id: sessionId,
    status: 'open',
    unreadCount: incomingMessage.key?.fromMe ? 0 : (Number(conversation.unreadCount) || 0) + 1,
  });

  return {
    conversation: updatedConversation || conversation,
    message: savedMessage,
  };
}

async function persistInboundMessageFallback(sessionId, incomingMessage, debugPayload) {
  const phone = debugPayload.phone;

  if (!phone) {
    return null;
  }

  const text = debugPayload.text || '[media]';
  const conversation = await conversationRepository.findOrCreateConversationByPhone({
    companyId: process.env.DEFAULT_COMPANY_ID || 'default',
    contactName: incomingMessage.pushName || phone,
    lastMessage: text,
    lastMessageType: text === '[media]' ? 'media' : 'text',
    phone,
    sessionId,
  });

  const savedMessage = await messageRepository.create({
    content: text,
    conversationId: conversation.id,
    createdAt: new Date(debugPayload.timestamp).toISOString(),
    fromMe: false,
    messageType: text === '[media]' ? 'media' : 'text',
    phone,
    sessionId,
    status: 'received',
  });

  if (!savedMessage) {
    throw new Error('Failed to persist incoming message');
  }

  console.log('MESSAGE SAVED', savedMessage);

  const updatedConversation = await conversationRepository.updateConversationState(conversation.id, {
    lastMessage: text,
    lastMessageType: text === '[media]' ? 'media' : 'text',
    session_id: sessionId,
    status: 'open',
    unreadCount: (Number(conversation.unreadCount) || 0) + 1,
  });

  return {
    conversation: updatedConversation || conversation,
    message: savedMessage,
  };
}

function syncMessageCache(store, message) {
  if (!store?.messages) {
    return;
  }

  const existingIndex = store.messages.findIndex((entry) => entry.id === message.id);

  if (existingIndex >= 0) {
    store.messages[existingIndex] = message;
    return;
  }

  store.messages.push(message);
}

function syncConversationCache(store, conversation) {
  if (!store?.conversations) {
    return;
  }

  const existingIndex = store.conversations.findIndex((entry) => entry.id === conversation.id);

  if (existingIndex >= 0) {
    store.conversations[existingIndex] = conversation;
    return;
  }

  store.conversations.push(conversation);
}

async function findOrCreateContact({ companyId, name, phone }) {
  const normalizedCompanyId = getCompanyId(companyId);
  console.log('Saving lead to database');
  let contact = await contactRepository.findContactByPhone(phone, normalizedCompanyId);

  if (!contact) {
    return contactRepository.createContact({
      companyId: normalizedCompanyId,
      name,
      phone,
    });
  }

  if (name && name !== 'Unknown' && contact.name !== name) {
    contact = await contactRepository.updateContactName(phone, name, normalizedCompanyId);
  }

  return contact;
}

async function findOrCreateConversation({
  assignedAgent,
  companyId,
  contactId,
  sessionId,
}) {
  const normalizedCompanyId = getCompanyId(companyId);
  let conversation = await conversationRepository.getConversationByContact(
    contactId,
    normalizedCompanyId,
    sessionId
  );
  let isNewConversation = false;

  if (!conversation) {
    conversation = await conversationRepository.createConversation({
      assignedAgent,
      companyId: normalizedCompanyId,
      contactId,
      funnelStage: 'new_lead',
      sessionId,
      status: 'open',
      tags: [],
    });
    isNewConversation = true;
  }

  return {
    conversation,
    isNewConversation,
  };
}

async function maybeGenerateAiSummary(store, messageHistory, fallbackSummary) {
  return fallbackSummary;
}

async function persistConversationMessage(store, payload) {
  const companyId = getCompanyId(payload.companyId);
  const sessionId = payload.sessionId || DEFAULT_SESSION;
  const assignedAgent = pickRandomAgent();
  let taskPayload = await runTask('createLead', {
    companyId,
    name: payload.name,
    phone: payload.phone,
    sessionId,
    store,
  });

  taskPayload = await runTask('createConversation', {
    ...taskPayload,
    assignedAgent: assignedAgent.name,
  });

  const contact = taskPayload.contact;
  const currentConversation = taskPayload.currentConversation;
  const isNewConversation = taskPayload.isNewConversation;
  console.log('Saving conversation to database');
  const existingMessages = await messageRepository.getMessagesByConversation(currentConversation.id);
  const messagePreview = getConversationPreview(payload.text, payload.mediaType);
  const leadAnalysis =
    payload.from === 'client'
      ? analyzeLeadIntent(messagePreview, existingMessages)
      : null;
  const salesStrategy = generateSalesStrategy(
    leadAnalysis || {
      intent: currentConversation.lead_intent,
      lead_temperature: currentConversation.lead_temperature,
    }
  );
  const nextFunnelStage = getNextFunnelStage(
    currentConversation.funnel_stage,
    leadAnalysis || {
      intent: currentConversation.lead_intent,
      lead_temperature: currentConversation.lead_temperature,
    },
    payload.text || messagePreview
  );
  const tags = buildLeadTags(
    leadAnalysis || {
      intent: currentConversation.lead_intent,
      lead_temperature: currentConversation.lead_temperature,
      next_action: currentConversation.next_action,
    },
    nextFunnelStage
  );

  console.log('Saving message to database');
  taskPayload = await runTask('saveMessage', {
    ...taskPayload,
    from: payload.from,
    mediaPath: payload.mediaPath,
    mediaType: payload.mediaType,
    messagePreview,
    text: payload.text || messagePreview,
    timestamp: payload.timestamp || getMessageTimestamp(),
  });
  const savedMessage = taskPayload.savedMessage;

  const conversationHistory = [...existingMessages, savedMessage];
  const fallbackSummary = generateConversationSummary(conversationHistory);
  const summary = await maybeGenerateAiSummary(store, conversationHistory, fallbackSummary);

  taskPayload = await runTask('updateConversation', {
    ...taskPayload,
    conversationUpdate: {
      lastMessage: messagePreview,
      lastMessageType: payload.mediaType || 'text',
      lead_confidence:
        typeof leadAnalysis?.confidence === 'number'
          ? leadAnalysis.confidence
          : currentConversation.lead_confidence,
      lead_intent: leadAnalysis?.intent || currentConversation.lead_intent,
      lead_temperature:
        leadAnalysis?.lead_temperature || currentConversation.lead_temperature,
      next_action: leadAnalysis?.next_action || currentConversation.next_action,
      agent_name: currentConversation.agent_name || assignedAgent.name,
      funnel_stage: nextFunnelStage,
      session_id: sessionId,
      status: 'open',
      summary,
      tags,
      unreadCount:
        payload.from === 'client'
          ? (Number(currentConversation.unreadCount) || 0) + 1
          : 0,
    },
  });
  const updatedConversation = taskPayload.updatedConversation;

  syncMessageCache(store, savedMessage);
  syncConversationCache(store, updatedConversation);
  conversationRepository.invalidateConversationCache(companyId);

  emitRealtimeEvent(store?.io, 'lead_updated', {
    conversationId: updatedConversation.id,
    intent: updatedConversation.lead_intent,
    lead_temperature: updatedConversation.lead_temperature,
    next_action: updatedConversation.next_action,
    phone: updatedConversation.phone,
    tags: updatedConversation.tags,
  });
  emitRealtimeEvent(store?.io, 'funnel_updated', {
    conversationId: updatedConversation.id,
    funnel_stage: updatedConversation.funnel_stage,
    phone: updatedConversation.phone,
  });

  const campaign = evaluateCampaign(updatedConversation);

  taskPayload = await runTask('emitSocketEvent', {
    ...taskPayload,
    campaign,
    currentConversation,
    isNewConversation,
    savedMessage,
    store,
    updatedConversation,
  });
  await runTask('updateMetrics', {
    ...taskPayload,
    campaign,
    currentConversation,
    isNewConversation,
    savedMessage,
    store,
    updatedConversation,
  });

  return {
    agent: getAgentByName(updatedConversation.agent_name),
    campaign,
    conversation: updatedConversation,
    isNewConversation,
    leadAnalysis,
    message: savedMessage,
    salesStrategy,
  };
}

async function createStableSession({
  displayName,
  io,
  onConnectionUpdate = async () => {},
  onIncomingMessage = async () => {},
  onMessageUpdate = async () => {},
  onQrGenerated = () => {},
  onReconnectRequested = async () => {},
  onSessionConnected = async () => {},
  sessionName = DEFAULT_SESSION,
} = {}) {
  const { normalizedSessionName, sessionPath } = await ensureSessionPath(sessionName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    browser: ['Windows', 'Chrome', '122.0.0'],
    logger: pino({ level: 'silent' }),
    version,
  });

  const session = {
    authState: state,
    displayName: displayName || normalizedSessionName,
    hasEmittedQr: false,
    phone: null,
    qrCode: null,
    recentMessageIds: new Set(),
    recentMessageOrder: [],
    connectionLogs: [],
    sessionId: normalizedSessionName,
    sessionName: displayName || normalizedSessionName,
    sessionPath,
    systemConnected: true,
    sock,
    status: 'connecting',
  };

  console.log(`[WHATSAPP] Connecting: ${normalizedSessionName}`);
  pushConnectionLog(session, 'info', 'connecting', 'Session is initializing connection with WhatsApp.');

  await safeCreateSessionRecord(normalizedSessionName, session.sessionName);
  emitSessionStatus(io, normalizedSessionName, session.status, session.sessionName);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const qrDataUrl = qr ? await toQrDataUrl(qr) : null;

    if (connection === 'connecting') {
      session.status = 'connecting';
      pushConnectionLog(session, 'info', 'connecting', 'Attempting to connect to WhatsApp.');
      emitSessionStatus(io, normalizedSessionName, session.status, session.sessionName);
    }

    emitConnectionUpdate(io, {
      connection,
      qr: qrDataUrl,
      hasQr: Boolean(qrDataUrl),
      reasonCode: getConnectionCloseCode(lastDisconnect),
      session: normalizedSessionName,
      sessionId: normalizedSessionName,
      sessionName: session.sessionName,
    });

    if (qrDataUrl) {
      session.status = 'qr_ready';
      session.qrCode = qrDataUrl;
      session.qrGeneratedAt = Date.now();
      session.hasEmittedQr = true;
      pushConnectionLog(session, 'info', 'qr_ready', 'QR is ready for authentication.');
      console.log(`[WHATSAPP] QR generated: ${normalizedSessionName}`);
      onQrGenerated(qrDataUrl);
      (io || global.io)?.emit('session_qr', {
        eventAt: Date.now(),
        name: session.sessionName,
        sessionId: normalizedSessionName,
        status: 'qr',
        type: 'qr',
        qr: qrDataUrl,
        sessionName: session.sessionName,
      });
      emitSessionStatus(io, normalizedSessionName, session.status, session.sessionName);
    }

    await onConnectionUpdate({
      ...update,
      session,
      sessionId: normalizedSessionName,
      sessionName: normalizedSessionName,
    });

    if (connection === 'open') {
      session.status = 'connected';
      session.hasEmittedQr = false;
      session.phone = sessionPhoneFromSock(sock);
      session.qrCode = null;
      session.lastError = null;
      pushConnectionLog(session, 'info', 'connected', 'Session connected successfully.');
      await safeUpdateSessionStatus(
        normalizedSessionName,
        'connected',
        session.phone,
        session.sessionName
      );

      console.log(`[WHATSAPP] Connected: ${normalizedSessionName}, phone: ${session.phone}`);

      (io || global.io)?.emit('session_connected', {
        eventAt: Date.now(),
        name: session.sessionName,
        phone: session.phone,
        sessionId: normalizedSessionName,
        status: 'connected',
        type: 'status',
        sessionName: session.sessionName,
      });
      emitSessionStatus(io, normalizedSessionName, session.status, session.sessionName);

      await onSessionConnected(session);
      return;
    }

    if (connection === 'close') {
      session.hasEmittedQr = false;
      session.qrCode = null;
      const closeCode = getConnectionCloseCode(lastDisconnect);
      const willReconnect = !session.isClosing && !session.isDisposed && shouldReconnect(lastDisconnect);

      if (willReconnect) {
        session.status = 'error';
        session.lastError = `Connection closed (${closeCode || 'unknown'}), retry scheduled.`;
        pushConnectionLog(session, 'error', 'error', session.lastError);
      } else {
        session.status = 'disconnected';
        session.lastError = shouldReconnect(lastDisconnect)
          ? 'Connection closed by runtime.'
          : 'WhatsApp session logged out.';
        pushConnectionLog(session, shouldReconnect(lastDisconnect) ? 'warn' : 'info', 'disconnected', session.lastError);
      }

      await safeUpdateSessionStatus(
        normalizedSessionName,
        'disconnected',
        session.phone,
        session.sessionName
      );

      console.log(`[WHATSAPP] Disconnected: ${normalizedSessionName}, code: ${closeCode}, willReconnect: ${willReconnect}`);

      (io || global.io)?.emit('session_disconnected', {
        eventAt: Date.now(),
        name: session.sessionName,
        sessionId: normalizedSessionName,
        status: 'disconnected',
        type: 'status',
        sessionName: session.sessionName,
      });
      emitSessionStatus(io, normalizedSessionName, session.status, session.sessionName);

      if (willReconnect) {
        setTimeout(() => {
          onReconnectRequested(normalizedSessionName).catch((error) => {
            console.error(`[WHATSAPP] Session ${normalizedSessionName} reconnect failed:`, error.message);
          });
        }, DEFAULT_RECONNECT_DELAY_MS);
      } else if (!shouldReconnect(lastDisconnect)) {
        // loggedOut — clear stale auth so next connect gets a fresh QR
        console.log(`[WHATSAPP] Logged out: ${normalizedSessionName} — clearing auth state`);
        try {
          await fs.rm(sessionPath, { force: true, recursive: true });
        } catch (rmErr) {
          console.warn(`[WHATSAPP] Could not clear auth state for ${normalizedSessionName}:`, rmErr.message);
        }
        (io || global.io)?.emit('session_logged_out', {
          name: session.sessionName,
          sessionId: normalizedSessionName,
          sessionName: session.sessionName,
        });
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log('[BAILEYS] messages.upsert', {
      count: Array.isArray(messages) ? messages.length : 0,
      sessionId: normalizedSessionName,
      type: type || 'unknown',
    });

    if (type !== 'notify') {
      return;
    }

    for (const incomingMessage of messages || []) {
      const remoteJid = incomingMessage?.key?.remoteJid || '';
      const messageId = incomingMessage?.key?.id || null;
      const fromMe = Boolean(incomingMessage?.key?.fromMe);

      if (!incomingMessage?.message) {
        continue;
      }

      if (session.systemConnected === false) {
        continue;
      }

      if (!shouldProcessRealtimeMessage(session, messageId)) {
        continue;
      }

      if (
        remoteJid.endsWith('@g.us') ||
        remoteJid.endsWith('@newsletter')
      ) {
        console.log('GROUP MESSAGE IGNORED');
        continue;
      }

      if (!remoteJid.endsWith('@s.whatsapp.net')) {
        continue;
      }

      console.log('INBOUND MESSAGE RECEIVED');
      console.log(safeSerializeInboundMessage(incomingMessage));

      const inboundDebugPayload = buildInboundDebugPayload(incomingMessage);

      console.log('INBOUND WHATSAPP MESSAGE', {
        from: inboundDebugPayload.from,
        fromMe,
        id: inboundDebugPayload.id,
        text: inboundDebugPayload.text,
        timestamp: inboundDebugPayload.timestamp,
      });

      let result = null;

      if (fromMe) {
        try {
          result = await persistRealtimeMessage({
            incomingMessage,
            sessionId: normalizedSessionName,
          });
        } catch (error) {
          console.error('[WHATSAPP] outbound realtime persistence failed:', error?.message || error);
        }
      } else {
        try {
          result = await onIncomingMessage({
            incomingMessage,
            session,
            sessionId: normalizedSessionName,
            sock,
          });
        } catch (error) {
          console.error('[WHATSAPP] inbound persistence pipeline failed:', error?.message || error);
        }

        if (!result?.message) {
          result = await persistInboundMessageFallback(
            normalizedSessionName,
            incomingMessage,
            inboundDebugPayload
          );
        }
      }

      const savedMessage = formatInboundSavedMessage(result, inboundDebugPayload);
      const realtimeMediaPayload = buildRealtimeMediaPayload({
        messageData: incomingMessage,
        savedMessage: savedMessage || {},
        sessionId: normalizedSessionName,
      });
      const realtimeMessagePayload = {
        chatId: remoteJid,
        conversationId: savedMessage?.conversationId || result?.conversation?.id || null,
        fromMe,
        id: messageId,
        sessionId: normalizedSessionName,
        text: inboundDebugPayload.text === '[media]' ? '' : inboundDebugPayload.text,
        timestamp: inboundDebugPayload.timestamp,
        type: realtimeMediaPayload?.type || 'text',
      };

      if (savedMessage) {
        console.log(`MESSAGE SAVED: ${inboundDebugPayload.phone}`);
        emitInboundRealtimeMessage(io, savedMessage, result?.conversation || null);
      }

      if (!savedMessage) {
        console.log('BAILEYS MESSAGE RECEIVED', realtimeMessagePayload);
        (io || global.io)?.emit('new_message', realtimeMessagePayload);
      }

      if (realtimeMediaPayload) {
        console.log('BAILEYS MEDIA RECEIVED', realtimeMediaPayload);
        (io || global.io)?.emit('new_media', realtimeMediaPayload);
      }
    }
  });

  sock.ev.on('messages.update', async (updates) => {
    await emitMessageUpdates(io, updates, normalizedSessionName);
    await onMessageUpdate({
      session,
      sessionId: normalizedSessionName,
      updates,
    });
  });

  return session;
}

async function sendMessage(sock, phone, text) {
  if (!sock) {
    throw new Error('Baileys socket is not initialized yet.');
  }

  return sock.sendMessage(ensureWhatsAppJid(phone), { text });
}

function ensureSocket(sock) {
  if (!sock) {
    throw new Error('Baileys socket is not initialized yet.');
  }
}

function getMediaUrlPayload(filePath) {
  return {
    url: filePath,
  };
}

function getDocumentFileName(docPath, fileName) {
  return fileName || path.basename(docPath || '') || `document-${Date.now()}`;
}

async function sendImage(sock, phone, imagePath, caption = '') {
  ensureSocket(sock);

  return sock.sendMessage(ensureWhatsAppJid(phone), {
    image: toMediaPayload(imagePath),
    ...(caption ? { caption } : {}),
  });
}

async function sendVideo(sock, phone, videoPath, caption = '') {
  ensureSocket(sock);

  return sock.sendMessage(ensureWhatsAppJid(phone), {
    video: toMediaPayload(videoPath),
    ...(caption ? { caption } : {}),
  });
}

async function sendAudio(sock, phone, audioPath, ptt = false) {
  ensureSocket(sock);

  return sock.sendMessage(ensureWhatsAppJid(phone), {
    audio: toMediaPayload(audioPath),
    ptt,
  });
}

async function sendDocument(sock, phone, docPath, fileName, mimetype) {
  ensureSocket(sock);

  return sock.sendMessage(ensureWhatsAppJid(phone), {
    document: toMediaPayload(docPath),
    fileName: getDocumentFileName(docPath, fileName),
    ...(mimetype ? { mimetype } : {}),
  });
}

async function sendMediaMessage(
  sock,
  phone,
  mediaType,
  mediaPath,
  { caption = '', fileName, mimetype, ptt = false } = {}
) {
  switch (mediaType) {
    case 'image':
      return sendImage(sock, phone, mediaPath, caption);
    case 'video':
      return sendVideo(sock, phone, mediaPath, caption);
    case 'audio':
      return sendAudio(sock, phone, mediaPath, ptt);
    case 'document':
      return sendDocument(sock, phone, mediaPath, fileName, mimetype);
    default:
      throw new Error('Unsupported mediaType. Use image, video, audio, or document.');
  }
}

function getMessageTimestamp() {
  return new Date().toISOString();
}

function normalizeUtf8Text(value = '') {
  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (value == null) {
    return '';
  }

  return String(value);
}

function unwrapMessageContent(message = {}) {
  if (!message || typeof message !== 'object') {
    return {};
  }

  if (message.ephemeralMessage?.message) {
    return unwrapMessageContent(message.ephemeralMessage.message);
  }

  if (message.viewOnceMessage?.message) {
    return unwrapMessageContent(message.viewOnceMessage.message);
  }

  if (message.viewOnceMessageV2?.message) {
    return unwrapMessageContent(message.viewOnceMessageV2.message);
  }

  if (message.viewOnceMessageV2Extension?.message) {
    return unwrapMessageContent(message.viewOnceMessageV2Extension.message);
  }

  if (message.editedMessage?.message) {
    return unwrapMessageContent(message.editedMessage.message);
  }

  return message;
}

function extractMessageText(msg = {}) {
  const rawMessage = msg?.message || msg;
  const message = unwrapMessageContent(rawMessage);

  return normalizeUtf8Text(
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  );
}

function getMediaDescriptor(message = {}) {
  const normalizedMessage = unwrapMessageContent(message);

  if (normalizedMessage.imageMessage) {
    return { mediaMessage: normalizedMessage.imageMessage, mediaType: 'image' };
  }

  if (normalizedMessage.videoMessage) {
    return { mediaMessage: normalizedMessage.videoMessage, mediaType: 'video' };
  }

  if (normalizedMessage.audioMessage) {
    return { mediaMessage: normalizedMessage.audioMessage, mediaType: 'audio' };
  }

  if (normalizedMessage.documentMessage) {
    return { mediaMessage: normalizedMessage.documentMessage, mediaType: 'document' };
  }

  return { mediaMessage: null, mediaType: null };
}

function extensionFromMimeType(mimeType = '') {
  const normalizedMimeType = String(mimeType).toLowerCase();

  if (normalizedMimeType.includes('jpeg') || normalizedMimeType.includes('jpg')) {
    return '.jpg';
  }

  if (normalizedMimeType.includes('png')) {
    return '.png';
  }

  if (normalizedMimeType.includes('mp4')) {
    return '.mp4';
  }

  if (normalizedMimeType.includes('mpeg') || normalizedMimeType.includes('mp3')) {
    return '.mp3';
  }

  if (normalizedMimeType.includes('ogg')) {
    return '.ogg';
  }

  if (normalizedMimeType.includes('pdf')) {
    return '.pdf';
  }

  if (normalizedMimeType.includes('msword')) {
    return '.doc';
  }

  if (normalizedMimeType.includes('wordprocessingml')) {
    return '.docx';
  }

  return '.bin';
}

async function downloadMedia(mediaMessage, mediaType) {
  if (!mediaMessage || !mediaType) {
    return null;
  }

  await fs.mkdir(MEDIA_DIRECTORY, { recursive: true });
  await fs.mkdir(UPLOADS_DIRECTORY, { recursive: true });

  const folderByType = {
    audio: 'audios',
    document: 'documents',
    image: 'images',
    video: 'videos',
  };
  const mediaFolder = folderByType[mediaType] || 'documents';
  const targetDirectory = path.join(UPLOADS_DIRECTORY, mediaFolder);
  await fs.mkdir(targetDirectory, { recursive: true });

  let buffer = null;

  try {
    // Prefer Baileys helper for stable media download pipeline.
    buffer = await downloadMediaMessage(
      { message: { [`${mediaType}Message`]: mediaMessage } },
      'buffer',
      {},
      {}
    );
  } catch {
    const stream = await downloadContentFromMessage(mediaMessage, mediaType);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    buffer = Buffer.concat(chunks);
  }

  const fileExtension =
    path.extname(mediaMessage.fileName || '') ||
    extensionFromMimeType(mediaMessage.mimetype);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExtension}`;
  const filePath = path.join(targetDirectory, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath: `/uploads/${mediaFolder}/${fileName}`,
    mimeType: mediaMessage.mimetype || null,
    size: buffer.length,
    type: mediaType,
  };
}

async function extractIncomingMessage(messageData = {}) {
  const phone = messageData.key?.remoteJid;
  const name = messageData.pushName || 'Unknown';
  const timestamp = messageData.messageTimestamp
    ? Number(messageData.messageTimestamp) * 1000
    : Date.now();

  if (!phone || !phone.endsWith('@s.whatsapp.net')) {
    return null;
  }

  const normalizedMessage = unwrapMessageContent(messageData.message || {});
  const { mediaMessage, mediaType } = getMediaDescriptor(normalizedMessage);
  const text = extractMessageText(messageData);
  const mediaInfo = mediaMessage ? await downloadMedia(mediaMessage, mediaType) : null;
  const mediaPath = mediaInfo?.filePath || null;

  return {
    companyId: process.env.DEFAULT_COMPANY_ID || 'default',
    externalMessageId: messageData.key?.id || null,
    fileName: mediaInfo?.fileName || null,
    mediaPath,
    mediaType,
    mimeType: mediaInfo?.mimeType || null,
    name,
    phone: normalizePhone(phone),
    size: mediaInfo?.size || null,
    text,
    timestamp: new Date(timestamp).toISOString(),
    type: mediaInfo?.type || mediaType || 'text',
  };
}

module.exports = {
  DEFAULT_SESSION,
  buildRealtimeMessagePayload,
  createStableSession,
  ensureWhatsAppJid,
  extractMessageText,
  extractIncomingMessage,
  getMessageTimestamp,
  normalizePhone,
  normalizeSessionName,
  persistConversationMessage,
  sendAudio,
  sendDocument,
  sendImage,
  sendMediaMessage,
  sendMessage,
  sendVideo,
};

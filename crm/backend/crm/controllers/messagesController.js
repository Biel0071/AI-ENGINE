const fs = require('fs/promises');
const path = require('path');

const sessionManager = require('../services/sessionManager');
const messageService = require('../services/messageService');
const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const whatsappService = require('../services/whatsappService');
const MessageAuditService = require('../services/messageAuditService');
const messageStore = require('../store/messageStore');
const webhookService = require('../services/webhookService');
const inboxConversationService = require('../backend/inbox/services/ConversationService');
const conversationRuntimeService = require('../backend/inbox/services/ConversationRuntimeService');

const MEDIA_TEMP_PUBLIC_PREFIX = '/media/temp';

function getStore(req) {
  return req.app.locals.store;
}

function getRequestedSessionId(req) {
  const raw = String(
    req?.headers?.['x-session-id'] || req?.query?.sessionId || req?.body?.sessionId || sessionManager.DEFAULT_SESSION
  ).trim();

  return sessionManager.normalizeSessionName(raw || sessionManager.DEFAULT_SESSION);
}

function emitInboxRealtimeEvent(req, savedMessage) {
  const io = req.app.get('io') || getStore(req)?.io;

  if (!io || !savedMessage) {
    return;
  }

  const payload = {
    conversationId: savedMessage.conversationId,
    message: savedMessage,
  };

  messageService.safeSocketEmit(io, 'message:new', payload, ['new_message']);
  messageService.safeSocketEmit(
    io,
    'conversation:update',
    {
      conversationId: savedMessage.conversationId,
      lastMessage: savedMessage.content || savedMessage.text || '',
      mediaType: savedMessage.mediaType || null,
      phone: savedMessage.phone || null,
      timestamp: savedMessage.timestamp || savedMessage.createdAt || new Date().toISOString(),
    },
    ['conversation_updated', 'conversation-update']
  );
  messageService.safeSocketEmit(io, 'new_message', {
    conversationId: savedMessage.conversationId,
    id: savedMessage.id,
    phone: savedMessage.phone,
    sessionId: savedMessage.sessionId || sessionManager.DEFAULT_SESSION,
    text: savedMessage.content || savedMessage.text || '',
    timestamp: savedMessage.timestamp || savedMessage.createdAt || new Date().toISOString(),
  });

  console.log('[INBOX] realtime event emitted');
}

function emitInboxRealtimeEventFromStore(store, savedMessage) {
  const io = store?.io || global.io;

  if (!io || !savedMessage) {
    return;
  }

  const payload = {
    conversationId: savedMessage.conversationId,
    message: savedMessage,
  };

  messageService.safeSocketEmit(io, 'message:new', payload, ['new_message']);
  messageService.safeSocketEmit(
    io,
    'conversation:update',
    {
      conversationId: savedMessage.conversationId,
      lastMessage: savedMessage.content || savedMessage.text || '',
      mediaType: savedMessage.mediaType || null,
      phone: savedMessage.phone || null,
      timestamp: savedMessage.timestamp || savedMessage.createdAt || new Date().toISOString(),
    },
    ['conversation_updated', 'conversation-update']
  );
  messageService.safeSocketEmit(io, 'new_message', {
    conversationId: savedMessage.conversationId,
    id: savedMessage.id,
    phone: savedMessage.phone,
    sessionId: savedMessage.sessionId || sessionManager.DEFAULT_SESSION,
    text: savedMessage.content || savedMessage.text || '',
    timestamp: savedMessage.timestamp || savedMessage.createdAt || new Date().toISOString(),
  });

  console.log('[INBOX] realtime event emitted');
}

function emitSocketEvent(reqOrStore, eventName, payload) {
  const io = reqOrStore?.app?.get?.('io') || reqOrStore?.app?.locals?.store?.io || reqOrStore?.io || global.io;
  const aliasesByEvent = {
    'conversation:update': ['conversation_updated', 'conversation-update'],
    'message:new': ['new_message'],
    'message:update': ['messages.update', 'message-update'],
    'session:status': ['session_status'],
  };

  messageService.safeSocketEmit(io, eventName, payload, aliasesByEvent[eventName] || []);
}

function toExactMessageText(value) {
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

function formatApiMessage(message) {
  if (!message) {
    return null;
  }

  const normalizedMediaPath = messageService.toPublicMediaPath(message.mediaPath || null);

  return {
    content: message.content || message.text || '',
    conversationId: message.conversationId || message.conversation_id || null,
    createdAt: message.createdAt || message.timestamp || new Date().toISOString(),
    fromMe:
      typeof message.fromMe === 'boolean'
        ? message.fromMe
        : message.from === 'agent' || message.sender === 'agent',
    id: message.id,
    mediaPath: normalizedMediaPath,
    mediaType: message.mediaType || null,
    phone: message.phone || null,
    status: message.status || 'sent',
  };
}

function inferMediaType(mediaPath = '') {
  const normalizedPath = String(mediaPath || '').toLowerCase();

  if (!normalizedPath) {
    return null;
  }

  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(normalizedPath)) {
    return 'image';
  }

  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(normalizedPath)) {
    return 'video';
  }

  if (/\.(mp3|wav|ogg|aac|m4a)$/i.test(normalizedPath)) {
    return 'audio';
  }

  return 'document';
}

function isBase64MediaInput(value = '') {
  const normalized = String(value || '').trim();

  if (!normalized || normalized.length < 32) {
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

function extensionFromMimeType(mimetype = '', mediaType = 'document') {
  const normalizedMimeType = String(mimetype || '').toLowerCase();

  if (normalizedMimeType.includes('jpeg') || normalizedMimeType.includes('jpg')) {
    return '.jpg';
  }

  if (normalizedMimeType.includes('png')) {
    return '.png';
  }

  if (normalizedMimeType.includes('webp')) {
    return '.webp';
  }

  if (normalizedMimeType.includes('gif')) {
    return '.gif';
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

  if (normalizedMimeType.includes('wav')) {
    return '.wav';
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

  switch (mediaType) {
    case 'image':
      return '.jpg';
    case 'video':
      return '.mp4';
    case 'audio':
      return '.mp3';
    default:
      return '.bin';
  }
}

async function saveBase64MediaToTempFile(base64Data, { mediaType, mimetype } = {}) {
  const normalized = String(base64Data || '').trim();

  if (!isBase64MediaInput(normalized)) {
    return null;
  }

  const dataUrlMatch = normalized.match(/^data:([^;]+);base64,(.+)$/s);
  const resolvedMimeType = mimetype || dataUrlMatch?.[1] || '';
  const base64Content = dataUrlMatch?.[2] || normalized;
  const fileExtension = extensionFromMimeType(resolvedMimeType, mediaType);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExtension}`;
  const absolutePath = path.join(messageService.MEDIA_TEMP_DIRECTORY, fileName);
  const publicPath = `${MEDIA_TEMP_PUBLIC_PREFIX}/${fileName}`;

  await messageService.ensureUploadDirectories();
  await fs.writeFile(absolutePath, Buffer.from(base64Content.replace(/\s+/g, ''), 'base64'));

  return {
    absolutePath,
    publicPath,
  };
}

async function ensureConversationForMessage({ companyId, mediaType, name, phone, sessionId, text }) {
  return conversationRepository.findOrCreateConversationByPhone({
    companyId: companyId || process.env.DEFAULT_COMPANY_ID || 'default',
    contactName: name || phone,
    lastMessage: text || '',
    lastMessageType: mediaType || 'text',
    phone,
    sessionId,
  });
}

async function persistOutgoingMessageRecord(store, payload) {
  const conversation = await ensureConversationForMessage(payload);
  const exactText = toExactMessageText(payload.text);
  const messagePreview = exactText || `[${payload.mediaType || 'text'}]`;
  const savedMessage = await messageRepository.create({
    content: exactText || messagePreview,
    conversationId: conversation.id,
    createdAt: new Date().toISOString(),
    fromMe: true,
    mediaPath: payload.mediaPath || null,
    messageType: payload.mediaType || 'text',
    phone: payload.phone,
    sessionId: payload.sessionId || sessionManager.DEFAULT_SESSION,
    status: 'sent',
  });

  if (!savedMessage) {
    return null;
  }

  const updatedConversation = await conversationRepository.updateConversationState(
    conversation.id,
    {
      lastMessage: messagePreview,
      lastMessageType: payload.mediaType || 'text',
      status: 'open',
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    }
  );

  if (store?.messages) {
    store.messages.push(savedMessage);
  }

  if (store?.conversations && updatedConversation) {
    const existingIndex = store.conversations.findIndex((item) => item.id === updatedConversation.id);

    if (existingIndex >= 0) {
      store.conversations[existingIndex] = updatedConversation;
    } else {
      store.conversations.push(updatedConversation);
    }
  }

  return {
    conversation: updatedConversation || conversation,
    message: savedMessage,
  };
}

async function registerIncomingMessage(store, payload) {
  const exactText = toExactMessageText(payload.text);
  MessageAuditService.log('message_received', payload);
  console.log('[BAILEYS] inbound message received', {
    id: payload.externalMessageId || null,
    phone: payload.phone,
    sessionId: payload.sessionId || sessionManager.DEFAULT_SESSION,
    text: exactText || '[media]',
    timestamp: payload.timestamp || null,
  });

  let result = null;

  try {
    result = await messageService.persistIncomingMessage({
      ...payload,
      text: exactText,
      sessionId: payload.sessionId || sessionManager.DEFAULT_SESSION,
      status: 'received',
    });

    if (result?.message) {
      console.log('MESSAGE SAVED');
    }
  } catch (err) {
    console.error('MESSAGE SAVE ERROR:', err);
    throw err;
  }

  if (result.isNewConversation) {
    console.log(`[CRM] new conversation created: ${payload.phone}`);
  }

  const resolvedConversationId = result?.conversation?.id || result?.message?.conversationId;
  if (resolvedConversationId) {
    conversationRuntimeService.registerIncomingMessage(store, resolvedConversationId, exactText || '');
  }

  console.log(`[INCOMING] message from ${payload.phone}`);
  MessageAuditService.log('message_persisted', result.message);

  try {
    const aiAnalysis = await inboxConversationService.analyzeIncomingMessage({
      conversationId: resolvedConversationId,
      metadata: {
        phone: payload.phone,
        sessionId: payload.sessionId,
      },
      text: exactText || '',
      options: {
        store,
      },
    });

    if (aiAnalysis?.conversation) {
      emitSocketEvent(store, 'conversation:update', aiAnalysis.conversation);
    }
  } catch (error) {
    console.warn('[INBOX] AI analysis failed for incoming message:', error.message || error);
  }

  await webhookService.dispatchEvent({
    tenantId: payload.companyId,
    event: 'message_received',
    payload: {
      conversationId: result?.message?.conversationId || null,
      messageId: result?.message?.id || null,
      phone: payload.phone,
      text: exactText || '',
      timestamp: payload.timestamp || new Date().toISOString(),
    },
  });

  return result;
}

async function registerOutgoingMessage(store, payload) {
  const exactText = toExactMessageText(payload.text);
  MessageAuditService.log('message_sent', payload);

  const result = await persistOutgoingMessageRecord(store, {
    ...payload,
    name: payload.name || 'Unknown',
    sessionId: payload.sessionId || sessionManager.DEFAULT_SESSION,
    text: exactText,
  });

  console.log(`[OUTGOING] message sent to ${payload.phone}`);
  MessageAuditService.log('message_persisted', result?.message);

  if (result?.message) {
    if (payload.source === 'human') {
      conversationRuntimeService.registerHumanReply(store, result.message.conversationId);
    }

    emitInboxRealtimeEventFromStore(store, formatApiMessage(result.message));
    console.log('[OUTGOING] realtime inbox event emitted');

    const conversationKey = String(result.message.conversationId || payload.phone || '');
    if (payload.source === 'human' && payload.systemTag !== 'absence' && store?.absenceState && conversationKey) {
      delete store.absenceState[conversationKey];
      delete store.absenceState[String(payload.phone || '')];
    }

    await webhookService.dispatchEvent({
      tenantId: payload.companyId,
      event: 'message_sent',
      payload: {
        conversationId: result.message.conversationId,
        messageId: result.message.id,
        phone: payload.phone,
        text: exactText || '',
      },
    });
  }

  return result;
}

async function sendMessage(req, res) {
  const {
    _transportMediaPath,
    chatId,
    fileName,
    mediaPath = null,
    mediaType = null,
    message,
    mimetype,
    phone,
    ptt = false,
    sessionId,
    sessionName,
    text,
  } = req.body;
  const store = getStore(req);
  const normalizedPhone = whatsappService.normalizePhone(chatId || phone);
  const mediaTransportPath = await messageService.resolveOutboundMediaPath(_transportMediaPath || mediaPath);
  const resolvedMediaType = mediaType || inferMediaType(mediaTransportPath || mediaPath);
  const resolvedText = toExactMessageText(message || text || null) || null;
  const persistedMediaPath = messageService.toPublicMediaPath(mediaPath || mediaTransportPath);
  const requestedSessionId = getRequestedSessionId(req);
  const targetSessionName = sessionManager.normalizeSessionName(
    sessionName || sessionId || requestedSessionId || sessionManager.DEFAULT_SESSION
  );
  const session = sessionManager.getSession(targetSessionName) || (await sessionManager.getDefaultSession());
  const sock = session?.sock || store.sock;

  if (!sessionManager.isRuntimeActive()) {
    return res.status(409).json({
      error: 'System is inactive. Activate it with POST /system/start.',
    });
  }

  if (!normalizedPhone || (!resolvedText && !mediaTransportPath && !mediaPath)) {
    return res.status(400).json({
      error: 'The field phone/chatId and at least one of text/message or mediaPath are required.',
    });
  }

  if (!sock) {
    return res.status(409).json({
      error: 'No active WhatsApp session is available.',
    });
  }

  try {
    let sendResult;

    if (mediaTransportPath || mediaPath) {
      const checkedMediaTransportPath = await messageService.assertLocalMediaPathExists(
        mediaTransportPath || mediaPath
      );
      await messageService.ensureUploadDirectories();
      sendResult = await whatsappService.sendMediaMessage(
        sock,
        normalizedPhone,
        resolvedMediaType,
        checkedMediaTransportPath || mediaPath,
        {
        caption: resolvedText || '',
        fileName,
        mimetype,
        ptt,
        }
      );
    } else {
      sendResult = await whatsappService.sendMessage(sock, normalizedPhone, resolvedText);
    }

    if (!sendResult) {
      MessageAuditService.log('message_failed', {
        error: 'Message send failed',
        phone: normalizedPhone,
        text: resolvedText,
      });

      return res.status(500).json({
        error: 'Message send failed',
        success: false,
      });
    }

    if (!store.databaseEnabled) {
      // Persist to in-memory store when PostgreSQL is unavailable
      const memEntry = messageStore.addMessage(normalizedPhone, {
        content: resolvedText || '',
        createdAt: new Date().toISOString(),
        fromMe: true,
        mediaPath: persistedMediaPath || mediaTransportPath || mediaPath || null,
        mediaType: resolvedMediaType || null,
        sessionId: session?.sessionId || targetSessionName,
        conversationId: `chat-${normalizedPhone}`,
        status: 'sent',
      });

      MessageAuditService.log('message_sent_memory', {
        phone: normalizedPhone,
        text: resolvedText,
      });

      emitSocketEvent(req, 'message_sent', {
        chatId: normalizedPhone,
        conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
        id: memEntry?.id,
        message: resolvedText,
        phone: normalizedPhone,
        timestamp: memEntry?.createdAt || new Date().toISOString(),
      });
      emitSocketEvent(req, 'message:update', {
        conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
        id: memEntry?.id,
        status: 'sent',
      });

      const inboxPayload = {
        conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
        content: resolvedText || '',
        createdAt: memEntry?.createdAt || new Date().toISOString(),
        fromMe: true,
        id: memEntry?.id,
        mediaPath: messageService.toPublicMediaPath(memEntry?.mediaPath || persistedMediaPath || null),
        mediaType: memEntry?.mediaType || null,
        phone: normalizedPhone,
        status: 'sent',
      };
      emitInboxRealtimeEvent(req, inboxPayload);

      return res.status(200).json({
        message: inboxPayload,
        success: true,
      });
    }

    const persistedResult = await registerOutgoingMessage(store, {
      companyId: req.body?.companyId,
      mediaPath: persistedMediaPath || mediaPath,
      mediaType: resolvedMediaType,
      name: session?.phone || 'Unknown',
      phone: normalizedPhone,
      sessionId: session?.sessionId || targetSessionName,
      source: 'human',
      text: resolvedText,
    });

    if (!persistedResult?.message) {
      MessageAuditService.log('message_failed', {
        error: 'Message persistence failed',
        phone: normalizedPhone,
        text: resolvedText,
      });

      return res.status(500).json({
        error: 'Message persistence failed',
        success: false,
      });
    }

    const apiMessage = formatApiMessage(persistedResult.message);
    console.log('MESSAGE SAVED', apiMessage);

    emitSocketEvent(req, 'message_sent', {
      chatId: normalizedPhone,
      conversationId: apiMessage.conversationId,
      id: apiMessage.id,
      message: apiMessage.content,
      phone: apiMessage.phone,
      timestamp: apiMessage.createdAt,
    });
    emitSocketEvent(req, 'message:update', {
      conversationId: apiMessage.conversationId,
      id: apiMessage.id,
      status: 'sent',
    });

    return res.status(200).json({
      message: apiMessage,
      success: true,
    });
  } catch (error) {
    if (error?.code === 'MEDIA_FILE_NOT_FOUND') {
      return res.status(404).json({
        error: error.message,
        success: false,
      });
    }

    MessageAuditService.log('message_failed', {
      error: error.message || String(error),
      phone: normalizedPhone,
      text: resolvedText,
    });

    return res.status(500).json({
      error: error.message || 'Failed to send WhatsApp message.',
      success: false,
    });
  }
}

async function sendMedia(req, res) {
  const {
    caption = '',
    chatId,
    file,
    fileName,
    mediaPath,
    mimetype,
    phone,
    ptt = false,
    sessionId,
    sessionName,
    type,
  } = req.body || {};

  try {
    await messageService.ensureUploadDirectories();

    const resolvedMediaPath = mediaPath || file || null;
    const resolvedMediaType = type || inferMediaType(resolvedMediaPath);

    if (!resolvedMediaPath || !resolvedMediaType) {
      return res.status(400).json({
        error: 'The fields file/mediaPath and type are required for media sending.',
        success: false,
      });
    }

    const tempFile = await saveBase64MediaToTempFile(resolvedMediaPath, {
      mediaType: resolvedMediaType,
      mimetype,
    });
    const resolvedTransportPath = await messageService.resolveOutboundMediaPath(
      tempFile?.absolutePath || resolvedMediaPath
    );
    const persistedMediaPath =
      tempFile?.publicPath || messageService.toPublicMediaPath(resolvedTransportPath || resolvedMediaPath);
    const transportMediaPath = resolvedTransportPath || resolvedMediaPath;

    req.body = {
      ...req.body,
      chatId: chatId || phone,
      _transportMediaPath: transportMediaPath,
      fileName,
      mediaPath: persistedMediaPath,
      mediaType: resolvedMediaType,
      mimetype,
      ptt,
      sessionId,
      sessionName,
      text: caption,
    };

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (res.statusCode === 200 && payload?.message) {
        emitSocketEvent(req, 'media_sent', {
          caption,
          chatId: payload.message.phone || chatId || phone,
          conversationId: payload.message.conversationId,
          file: payload.message.mediaPath || persistedMediaPath,
          fileName: fileName || null,
          id: payload.message.id,
          mediaPath: payload.message.mediaPath || persistedMediaPath,
          mediaType: payload.message.mediaType || resolvedMediaType,
          message: payload.message.content,
          ptt,
          timestamp: payload.message.createdAt,
        });
      }

      return originalJson(payload);
    };

    return sendMessage(req, res);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to process media upload.',
      success: false,
    });
  }
}

async function receiveMessage(req, res) {
  const {
    mediaPath = null,
    mediaType = null,
    name,
    phone,
    sessionId,
    text,
  } = req.body;
  const store = getStore(req);
  const requestedSessionId = getRequestedSessionId(req);
  const resolvedIncomingMediaType = mediaType || inferMediaType(mediaPath || '');
  const resolvedIncomingMediaPath = messageService.toPublicMediaPath(
    await messageService.resolveOutboundMediaPath(mediaPath || '')
  ) || null;

  if (!phone || (!text && !resolvedIncomingMediaType && !resolvedIncomingMediaPath)) {
    return res.status(400).json({
      error: 'The field phone and at least one of text or mediaType are required.',
    });
  }

  let savedMessage;

  if (!store.databaseEnabled) {
    // Persist to in-memory store when PostgreSQL is unavailable
    const normalizedPhone = whatsappService.normalizePhone(phone);
    const memEntry = messageStore.addMessage(normalizedPhone, {
      content: text || '',
      createdAt: new Date().toISOString(),
      fromMe: false,
      mediaPath: resolvedIncomingMediaPath,
      mediaType: resolvedIncomingMediaType || null,
      name: name || normalizedPhone,
      sessionId: sessionId || requestedSessionId || sessionManager.DEFAULT_SESSION,
      conversationId: `chat-${normalizedPhone}`,
      status: 'received',
    });

    MessageAuditService.log('message_received_memory', { phone: normalizedPhone, text });

    const inboxPayload = {
      conversationId: memEntry?.conversationId || `chat-${normalizedPhone}`,
      content: text || '',
      createdAt: memEntry?.createdAt || new Date().toISOString(),
      fromMe: false,
      id: memEntry?.id,
      mediaPath: resolvedIncomingMediaPath,
      mediaType: resolvedIncomingMediaType || null,
      phone: normalizedPhone,
      status: 'received',
    };

    emitInboxRealtimeEvent(req, inboxPayload);

    return res.status(200).json({
      message: inboxPayload,
      success: true,
    });
  }

  try {
    savedMessage = await registerIncomingMessage(store, {
      companyId: req.body?.companyId,
      mediaPath: resolvedIncomingMediaPath,
      mediaType: resolvedIncomingMediaType || null,
      name,
      phone,
      sessionId: sessionId || requestedSessionId || sessionManager.DEFAULT_SESSION,
      text,
    });
  } catch (error) {
    MessageAuditService.log('message_failed', {
      error: error.message || String(error),
      phone,
      text,
    });

    return res.status(500).json({
      error: error.message || 'Failed to persist incoming message.',
    });
  }

  return res.status(200).json({
    message: (() => {
      const apiMessage = formatApiMessage(savedMessage?.message);
      emitInboxRealtimeEvent(req, apiMessage);
      return apiMessage;
    })(),
    success: true,
  });
}

async function getMessagesByPhone(req, res) {
  const { phone } = req.params;
  const requestedSessionId = getRequestedSessionId(req);

  try {
    const filteredMessages = await messageRepository.getMessagesByPhone(
      phone,
      req.query?.companyId || process.env.DEFAULT_COMPANY_ID || 'default',
      requestedSessionId
    );

    return res.status(200).json(filteredMessages);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch messages.',
    });
  }
}

async function getMessagesByConversationId(req, res) {
  const { conversationId } = req.params;

  try {
    const messages = await messageRepository.findByConversationId(conversationId);
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0)
    );

    return res.status(200).json(sortedMessages);
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch conversation messages.',
    });
  }
}

async function createMessage(req, res) {
  const {
    body,
    companyId,
    conversationId,
    direction,
    from,
    mediaPath = null,
    mediaType = null,
    name,
    phone,
    sessionId,
    timestamp,
  } = req.body || {};
  const store = getStore(req);
  const requestedSessionId = getRequestedSessionId(req);
  const normalizedPhone = whatsappService.normalizePhone(phone || from);
  const resolvedText = body || req.body?.text || '';

  if (!normalizedPhone || (!resolvedText && !mediaType)) {
    return res.status(400).json({
      error: 'The field phone and at least one of body/text or mediaType are required.',
    });
  }

  if (!store.databaseEnabled) {
    return res.status(500).json({
      error: 'Message received but database persistence is unavailable.',
    });
  }

  try {
    let result;

    if (direction === 'outbound') {
      result = await registerOutgoingMessage(store, {
        companyId,
        mediaPath,
        mediaType,
        name: name || normalizedPhone,
        phone: normalizedPhone,
        sessionId: sessionId || requestedSessionId || sessionManager.DEFAULT_SESSION,
        source: req.body?.source || 'human',
        text: resolvedText,
      });
    } else {
      result = await registerIncomingMessage(store, {
        companyId,
        conversationId,
        externalMessageId: req.body?.id || null,
        mediaPath,
        mediaType,
        name: name || normalizedPhone,
        phone: normalizedPhone,
        sessionId: sessionId || requestedSessionId || sessionManager.DEFAULT_SESSION,
        text: resolvedText,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      });
    }

    const apiMessage = formatApiMessage(result?.message);

    if (!apiMessage) {
      return res.status(500).json({
        error: 'Failed to persist message.',
      });
    }

    emitInboxRealtimeEvent(req, apiMessage);

    return res.status(200).json({
      message: apiMessage,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to persist message.',
      success: false,
    });
  }
}

/**
 * GET /chats
 * Returns the list of recent chat contacts from the in-memory store (falls back to conversations DB).
 */
async function getChats(req, res) {
  const store = getStore(req);
  const requestedSessionId = getRequestedSessionId(req);

  // Try DB first when enabled
  if (store?.databaseEnabled) {
    try {
      const dbConversations = await conversationRepository.listConversations(
        req.query?.companyId || process.env.DEFAULT_COMPANY_ID || 'default',
        Number(req.query?.limit) || 50,
        {
          sessionId: requestedSessionId,
        }
      );

      if (Array.isArray(dbConversations) && dbConversations.length > 0) {
        return res.status(200).json(dbConversations);
      }
    } catch (_err) {
      // fall through to memory store
    }
  }

  // Return from in-memory store
  const memChats = messageStore
    .getChats()
    .filter((chat) => String(chat.sessionId || sessionManager.DEFAULT_SESSION) === requestedSessionId);
  const normalized = memChats.map((chat) => ({
    id: chat.id,
    contactName: chat.name,
    lastMessage: chat.lastMessage,
    lastMessageType: 'text',
    phone: chat.phone,
    sessionId: chat.sessionId,
    status: 'open',
    tags: [],
    unread: chat.unread || 0,
    updatedAt: chat.lastMessageTimestamp || new Date().toISOString(),
  }));

  return res.status(200).json(normalized);
}

/**
 * GET /chats/:chatId/messages
 * Returns messages for a chatId (phone) from in-memory store (with DB fallback).
 */
async function getMessagesByChatId(req, res) {
  const { chatId } = req.params;
  const normalizedChatId = messageStore.normalizeChatId(chatId);
  const limit = Number(req.query?.limit) || 50;
  const before = req.query?.before || null;

  const store = getStore(req);

  // Try DB first when enabled
  if (store?.databaseEnabled) {
    try {
      const dbMessages = await messageRepository.findByConversationId(chatId);
      if (Array.isArray(dbMessages) && dbMessages.length > 0) {
        const sorted = [...dbMessages].sort(
          (a, b) => new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0)
        );
        return res.status(200).json(sorted);
      }
    } catch (_err) {
      // fall through to memory store
    }
  }

  // Return from in-memory store
  const memMessages = messageStore.getMessages(normalizedChatId, limit, before);
  return res.status(200).json(memMessages);
}

module.exports = {
  createMessage,
  extractIncomingMessage: whatsappService.extractIncomingMessage,
  getChats,
  getMessagesByChatId,
  getMessagesByConversationId,
  getMessagesByPhone,
  receiveMessage,
  registerIncomingMessage,
  registerOutgoingMessage,
  sendMedia,
  sendMessage,
};

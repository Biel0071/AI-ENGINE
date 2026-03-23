jest.mock('../crm/services/sessionManager', () => ({
  DEFAULT_SESSION: 'main',
  getDefaultSession: jest.fn(async () => ({ sessionId: 'main', sock: {} })),
  getSession: jest.fn(() => ({ sessionId: 'main', sock: {} })),
  isRuntimeActive: jest.fn(() => true),
  normalizeSessionName: jest.fn((value) => value || 'main'),
}));

const persistedMessages = [];

jest.mock('../crm/services/whatsappService', () => ({
  extractIncomingMessage: jest.fn(),
  persistConversationMessage: jest.fn(async (_store, payload) => ({
    conversation: {
      id: 'conv-1',
      phone: payload.phone,
      unreadCount: 1,
    },
    isNewConversation: true,
    message: {
      content: payload.text,
      conversationId: 'conv-1',
      createdAt: payload.timestamp || new Date('2026-03-10T00:00:00.000Z').toISOString(),
      from: 'client',
      fromMe: false,
      id: 'msg-in-1',
      phone: payload.phone,
      sessionId: payload.sessionId || 'main',
      status: 'received',
      text: payload.text,
      timestamp: payload.timestamp || new Date('2026-03-10T00:00:00.000Z').toISOString(),
    },
  })),
  normalizePhone: jest.fn((value) => String(value || '').replace(/@s\.whatsapp\.net$/i, '')),
  sendMediaMessage: jest.fn(async () => ({ id: 'wa-media-1' })),
  sendMessage: jest.fn(async () => ({ id: 'wa-msg-1' })),
}));

jest.mock('../crm/repositories/messageRepository', () => ({
  create: jest.fn(async ({ content, conversationId, phone, status }) => {
    const savedMessage = {
      content,
      conversationId,
      createdAt: new Date('2026-03-10T00:00:00.000Z').toISOString(),
      from: 'agent',
      fromMe: true,
      id: `msg-${persistedMessages.length + 1}`,
      phone,
      status,
      text: content,
      timestamp: new Date('2026-03-10T00:00:00.000Z').toISOString(),
    };

    persistedMessages.push(savedMessage);
    return savedMessage;
  }),
  findByConversationId: jest.fn(async () => [...persistedMessages]),
  getMessagesByConversation: jest.fn(async () => [...persistedMessages]),
  getMessagesByPhone: jest.fn(async () => []),
}));

jest.mock('../crm/repositories/conversationRepository', () => ({
  findOrCreateConversationByPhone: jest.fn(async () => ({ id: 'conv-1' })),
  listConversations: jest.fn(async () => []),
  updateConversationState: jest.fn(async () => ({ id: 'conv-1' })),
  updateConversationAfterMessage: jest.fn(async () => ({ id: 'conv-1' })),
}));

const conversationRepository = require('../crm/repositories/conversationRepository');

const express = require('express');
const request = require('supertest');
const messagesRouter = require('../crm/routes/messages');
const conversationsRouter = require('../crm/routes/conversations');

function createApp() {
  const app = express();
  app.use(express.json());
  app.set('io', { emit: jest.fn() });
  app.locals.store = {
    conversations: [],
    databaseEnabled: true,
    io: { emit: jest.fn() },
    messages: [],
    sock: {},
  };
  app.use(messagesRouter);
  app.use(conversationsRouter);
  return app;
}

beforeEach(() => {
  persistedMessages.length = 0;
});

test('send-message persists and returns saved message visible in conversation history', async () => {
  const app = createApp();

  const sendResponse = await request(app)
    .post('/send-message')
    .send({ phone: '5511999999999@s.whatsapp.net', text: 'hello persisted' });

  expect(sendResponse.status).toBe(200);
  expect(sendResponse.body.success).toBe(true);
  expect(sendResponse.body.message.id).toBeTruthy();
  expect(sendResponse.body.message.conversationId).toBe('conv-1');
  expect(sendResponse.body.message.content).toBe('hello persisted');
  expect(sendResponse.body.message.fromMe).toBe(true);

  const historyResponse = await request(app).get('/conversations/conv-1/messages');

  expect(historyResponse.status).toBe(200);
  expect(Array.isArray(historyResponse.body)).toBe(true);
  expect(historyResponse.body[0].id).toBe(sendResponse.body.message.id);
  expect(historyResponse.body.some((message) => message.content === 'hello persisted')).toBe(true);
});

test('post messages persists inbound message and emits inbox-compatible payload', async () => {
  const app = createApp();

  const response = await request(app)
    .post('/messages')
    .send({
      body: 'hello inbound',
      direction: 'inbound',
      id: 'wamid.demo',
      phone: '5511999999999',
      timestamp: '2026-03-12T23:10:00.000Z',
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.message.conversationId).toBe('conv-1');
  expect(response.body.message.content).toBe('hello inbound');
});

test('post conversations creates or reuses conversation by phone', async () => {
  const app = createApp();

  const response = await request(app)
    .post('/conversations')
    .send({
      name: '5511999999999',
      phone: '5511999999999',
      sessionId: 'main',
      text: 'first contact',
    });

  expect(response.status).toBe(200);
  expect(conversationRepository.findOrCreateConversationByPhone).toHaveBeenCalledWith({
    companyId: 'default',
    contactName: '5511999999999',
    lastMessage: 'first contact',
    lastMessageType: 'text',
    phone: '5511999999999',
    sessionId: 'main',
  });
});


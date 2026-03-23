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
  persistConversationMessage: jest.fn(),
  normalizePhone: jest.fn((value) => String(value || '').replace(/@s\.whatsapp\.net$/i, '')),
  sendMediaMessage: jest.fn(async () => ({ id: 'wa-media-1' })),
  sendMessage: jest.fn(async () => ({ id: 'wa-msg-1' })),
}));

jest.mock('../crm/repositories/conversationRepository', () => ({
  findOrCreateConversationByPhone: jest.fn(async () => ({ id: 'conv-1' })),
  updateConversationAfterMessage: jest.fn(async () => ({ id: 'conv-1' })),
  updateConversationState: jest.fn(async () => ({ id: 'conv-1' })),
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
}));

const express = require('express');
const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: createClient } = require('socket.io-client');
const messagesRouter = require('../crm/routes/messages');

function createApp() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  app.set('io', io);
  app.locals.store = {
    conversations: [],
    databaseEnabled: true,
    io,
    messages: [],
    sock: {},
  };

  app.use(messagesRouter);
  app.use('/api', messagesRouter);

  return { app, io, server };
}

async function closeTestServer(io, server) {
  await io.close();

  if (!server.listening) {
    return;
  }

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

beforeEach(() => {
  persistedMessages.length = 0;
});

test('send-message emits message:new websocket event with saved message payload', async () => {
  const { app, io, server } = createApp();

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const client = createClient(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
  });

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for message:new event.')), 5000);

      client.once('message:new', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const sendResponse = await request(app)
      .post('/send-message')
      .send({ phone: '5511999999999@s.whatsapp.net', text: 'hello realtime' });

    expect(sendResponse.status).toBe(200);
    expect(sendResponse.body.message.id).toBeTruthy();

    const payload = await eventPromise;

    expect(payload.conversationId).toBe('conv-1');
    expect(payload.message).toBeTruthy();
    expect(payload.message.id).toBe(sendResponse.body.message.id);
    expect(payload.message.content).toBe('hello realtime');
  } finally {
    client.close();
    await closeTestServer(io, server);
  }
});

test('api send-message emits message_sent websocket event with frontend payload', async () => {
  const { app, io, server } = createApp();

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const client = createClient(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
  });

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for message_sent event.')), 5000);

      client.once('message_sent', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const response = await request(app)
      .post('/api/send-message')
      .send({ chatId: '5511999999999@s.whatsapp.net', message: 'hello api realtime' });

    expect(response.status).toBe(200);

    const payload = await eventPromise;

    expect(payload.chatId).toBe('5511999999999');
    expect(payload.message).toBe('hello api realtime');
    expect(payload.conversationId).toBe('conv-1');
  } finally {
    client.close();
    await closeTestServer(io, server);
  }
});

test('api send-media emits media_sent websocket event with media payload', async () => {
  const { app, io, server } = createApp();

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const client = createClient(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
  });

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for media_sent event.')), 5000);

      client.once('media_sent', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const response = await request(app)
      .post('/api/send-media')
      .send({
        caption: 'photo caption',
        chatId: '5511999999999@s.whatsapp.net',
        file: 'C:/temp/photo.jpg',
        type: 'image',
      });

    expect(response.status).toBe(200);

    const payload = await eventPromise;

    expect(payload.chatId).toBe('5511999999999');
    expect(payload.mediaType).toBe('image');
    expect(payload.file).toBe('C:/temp/photo.jpg');
    expect(payload.conversationId).toBe('conv-1');
  } finally {
    client.close();
    await closeTestServer(io, server);
  }
});

test('api send-media converts base64 image into temporary media file payload', async () => {
  const { app, io, server } = createApp();

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const client = createClient(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
  });

  try {
    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for media_sent event.')), 5000);

      client.once('media_sent', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const response = await request(app)
      .post('/api/send-media')
      .send({
        chatId: '5511999999999@s.whatsapp.net',
        file: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==',
        type: 'image',
      });

    expect(response.status).toBe(200);

    const payload = await eventPromise;

    expect(payload.chatId).toBe('5511999999999');
    expect(payload.mediaType).toBe('image');
    expect(payload.file).toMatch(/^\/media\/temp\/.+\.jpg$/);
    expect(payload.mediaPath).toMatch(/^\/media\/temp\/.+\.jpg$/);
  } finally {
    client.close();
    await closeTestServer(io, server);
  }
});


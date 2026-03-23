jest.mock('../crm/services/sessionManager', () => ({
  DEFAULT_SESSION: 'main',
  getDefaultSession: jest.fn(async () => ({ sessionId: 'main', sock: {} })),
  getSession: jest.fn(() => ({ sessionId: 'main', sock: {} })),
  isRuntimeActive: jest.fn(() => true),
  normalizeSessionName: jest.fn((value) => value || 'main'),
}));

jest.mock('../crm/repositories/messageRepository', () => ({
  create: jest.fn(async () => ({ id: 'msg-1' })),
  findByConversationId: jest.fn(async () => [{ id: 'msg-conv-1' }]),
  getMessagesByPhone: jest.fn(async () => []),
}));

jest.mock('../crm/repositories/conversationRepository', () => ({
  findOrCreateConversationByPhone: jest.fn(async () => ({ id: 'conv-1' })),
  updateConversationState: jest.fn(async () => ({ id: 'conv-1' })),
  updateConversationAfterMessage: jest.fn(async () => ({ id: 'conv-1' })),
}));

jest.mock('../crm/services/whatsappService', () => ({
  normalizePhone: jest.fn((value) => String(value || '').replace(/@s\.whatsapp\.net$/i, '')),
  sendMessage: jest.fn(async () => true),
  sendMediaMessage: jest.fn(async () => true),
}));

const messagesController = require('../crm/controllers/messagesController');
const messageRepository = require('../crm/repositories/messageRepository');
const whatsappService = require('../crm/services/whatsappService');
const fs = require('fs/promises');
const path = require('path');

function createResponse() {
  return {
    json: jest.fn(function (payload) { this.payload = payload; return this; }),
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
  };
}

test('send message validates phone', async () => {
  const req = { app: { get: jest.fn(), locals: { store: {} } }, body: { text: 'hello' } };
  const res = createResponse();

  await messagesController.sendMessage(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
});

test('send message accepts mediaPath without explicit mediaType', async () => {
  const req = {
    app: { get: jest.fn(() => ({ emit: jest.fn() })), locals: { store: { databaseEnabled: true, sock: {}, conversations: [], messages: [] } } },
    body: { mediaPath: 'C:/temp/photo.jpg', phone: '5511999999999' },
  };
  const res = createResponse();

  await messagesController.sendMessage(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload.success).toBe(true);
});

test('get messages by conversation id returns repository payload', async () => {
  const req = { params: { conversationId: 'conv-1' } };
  const res = createResponse();

  await messagesController.getMessagesByConversationId(req, res);

  expect(messageRepository.findByConversationId).toHaveBeenCalledWith('conv-1');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload).toEqual([{ id: 'msg-conv-1' }]);
});

test('send-media resolves upload token path and succeeds', async () => {
  const uploadsDir = path.join(__dirname, '..', 'crm', 'uploads');
  const fileName = 'WhatsApp Image 2026-03-19 at 15.28.50.jpeg';
  const absolutePath = path.join(uploadsDir, fileName);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from('test-media'));

  const req = {
    app: { get: jest.fn(() => ({ emit: jest.fn() })), locals: { store: { databaseEnabled: true, sock: {}, conversations: [], messages: [] } } },
    body: {
      chatId: '5511999999999@s.whatsapp.net',
      file: `upload:${fileName}`,
      type: 'image',
    },
  };
  const res = createResponse();

  await messagesController.sendMedia(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload.success).toBe(true);
  expect(whatsappService.sendMediaMessage).toHaveBeenCalled();
  const sendMediaArgs = whatsappService.sendMediaMessage.mock.calls.at(-1);
  expect(sendMediaArgs[3]).toContain('uploads');
  expect(sendMediaArgs[3]).toContain(fileName);

  await fs.unlink(absolutePath);
});

test('receive-message accepts media payload without explicit mediaType', async () => {
  const req = {
    app: { get: jest.fn(() => ({ emit: jest.fn() })), locals: { store: { databaseEnabled: false, sock: {}, conversations: [], messages: [] } } },
    body: {
      mediaPath: '/uploads/example-photo.jpg',
      phone: '5511999999999@s.whatsapp.net',
    },
  };
  const res = createResponse();

  await messagesController.receiveMessage(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload.success).toBe(true);
  expect(res.payload.message.mediaType).toBe('image');
  expect(res.payload.message.mediaPath).toBe('/uploads/example-photo.jpg');
});



jest.mock('../crm/repositories/conversationRepository', () => ({
  listConversations: jest.fn(async () => []),
  updateConversationState: jest.fn(async () => ({
    id: 'conv-1',
    unreadCount: 0,
  })),
}));

jest.mock('../crm/repositories/messageRepository', () => ({
  findByConversationId: jest.fn(async () => []),
  getMessagesByConversation: jest.fn(async () => []),
}));

jest.mock('../crm/config/ngrok', () => ({
  getPublicUrl: jest.fn(async (fallbackUrl) => fallbackUrl),
}));

jest.mock('../crm/services/whatsappService', () => ({
  normalizePhone: jest.fn((value) => String(value || '').replace(/@s\.whatsapp\.net$/i, '')),
}));

const conversationsController = require('../crm/controllers/conversationsController');
const { getPublicUrl } = require('../crm/config/ngrok');
const messageStore = require('../crm/store/messageStore');

function createResponse() {
  return {
    json: jest.fn(function (payload) { this.payload = payload; return this; }),
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
  };
}

test('get conversations returns array', async () => {
  const req = { query: {} };
  const res = createResponse();

  await conversationsController.getConversations(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(Array.isArray(res.payload)).toBe(true);
});

test('get public url refreshes store with ngrok url when available', async () => {
  getPublicUrl.mockResolvedValueOnce('https://demo.ngrok-free.app');

  const req = {
    app: {
      locals: {
        store: {
          publicUrl: 'http://localhost:4000',
        },
      },
    },
  };
  const res = createResponse();

  await conversationsController.getPublicUrl(req, res);

  expect(getPublicUrl).toHaveBeenCalledWith('http://localhost:4000');
  expect(req.app.locals.store.publicUrl).toBe('https://demo.ngrok-free.app');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload).toEqual({ api: 'https://demo.ngrok-free.app' });
});

test('save and get conversation draft', async () => {
  const reqSave = {
    app: {
      locals: {
        store: {},
      },
    },
    body: { draft: 'mensagem em rascunho' },
    params: { conversationId: 'conv-99' },
  };
  const saveRes = createResponse();

  await conversationsController.saveConversationDraft(reqSave, saveRes);

  expect(saveRes.status).toHaveBeenCalledWith(200);
  expect(saveRes.payload.success).toBe(true);

  const reqGet = {
    app: reqSave.app,
    params: { conversationId: 'conv-99' },
  };
  const getRes = createResponse();

  await conversationsController.getConversationDraft(reqGet, getRes);

  expect(getRes.status).toHaveBeenCalledWith(200);
  expect(getRes.payload.draft).toBe('mensagem em rascunho');
});

test('mark conversation read in memory mode', async () => {
  messageStore.clearAll();
  messageStore.addMessage('5511999999999', {
    content: 'oi',
    fromMe: false,
    sessionId: 'main',
  });

  const req = {
    app: {
      locals: {
        store: {
          databaseEnabled: false,
        },
      },
    },
    params: { conversationId: '5511999999999' },
  };
  const res = createResponse();

  await conversationsController.markConversationRead(req, res);

  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.payload.success).toBe(true);
  expect(res.payload.unreadCount).toBe(0);
});



jest.mock('../crm/services/sessionManager', () => ({
  DEFAULT_SESSION: 'main',
  isRuntimeActive: jest.fn(() => true),
  normalizeSessionName: jest.fn((value) => value || 'main'),
  startSession: jest.fn(async (name, options) => ({
    displayName: options?.displayName || name,
    sessionId: 'main',
    sessionName: options?.displayName || name,
    status: 'connecting',
  })),
}));

jest.mock('../crm/repositories/sessionRepository', () => ({
  getSessions: jest.fn(async () => []),
}));

const sessionsController = require('../crm/controllers/sessionsController');

function createResponse() {
  return {
    json: jest.fn(function (payload) { this.payload = payload; return this; }),
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
  };
}

test('create session returns payload', async () => {
  const req = { body: { sessionName: 'Support Team' } };
  const res = createResponse();

  await sessionsController.create(req, res);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.payload.sessionName).toBe('Support Team');
});



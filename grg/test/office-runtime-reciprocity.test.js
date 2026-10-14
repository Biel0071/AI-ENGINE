'use strict';

/**
 * Test: Office Runtime Full-Stack Reciprocity (Fase 14)
 * Verifies backend route endpoints for living agent office, knock, chat, meetings, and war room.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleOfficeCommunicationRoutes } = require('../src/api/office-communication-routes');

function createMockHttp(method, path, body = {}) {
  const req = {
    method,
    headers: { 'content-type': 'application/json' }
  };
  let responseData = null;
  let responseStatus = 200;
  const res = {
    setHeader: () => {},
    writeHead: (st) => { responseStatus = st; },
    end: (payload) => { responseData = payload ? JSON.parse(payload) : null; }
  };
  const url = new URL(`http://localhost:4400${path}`);

  const sendJson = (resObj, status, data) => {
    responseStatus = status;
    responseData = data;
    return true;
  };
  const readJson = async () => body;

  return { req, res, url, sendJson, readJson, getStatus: () => responseStatus, getData: () => responseData };
}

test('RECIPROCITY 1: GET /api/v2/office/state returns live offices, presence, and activity feed', async () => {
  const mock = createMockHttp('GET', '/api/v2/office/state');
  const handled = await handleOfficeCommunicationRoutes(
    mock.req, mock.res, mock.url, {}, mock.sendJson, mock.readJson, { tenantId: 'grg', actorId: 'grg-admin' }
  );

  assert.equal(handled, true);
  assert.equal(mock.getStatus(), 200);
  const data = mock.getData();
  assert.ok(data.ok);
  assert.equal(data.source, 'measured');
  assert.ok(Array.isArray(data.offices));
  assert.ok(data.presence.agents);
  assert.ok(data.presence.human);
  assert.ok(Array.isArray(data.activityFeed));
});

test('RECIPROCITY 2: Door Knock and Response Lifecycle over HTTP', async () => {
  // 1. Post Knock
  const knockMock = createMockHttp('POST', '/api/v2/office/knock', {
    fromAgent: 'agent-qa',
    toAgent: 'agent-backend',
    reason: 'Verify regression tests'
  });
  await handleOfficeCommunicationRoutes(
    knockMock.req, knockMock.res, knockMock.url, {}, knockMock.sendJson, knockMock.readJson, { tenantId: 'grg', actorId: 'agent-qa' }
  );
  assert.equal(knockMock.getStatus(), 201);
  const knock = knockMock.getData().knock;
  assert.ok(knock.knockId);

  // 2. Respond Accept
  const respondMock = createMockHttp('POST', '/api/v2/office/knock/respond', {
    knockId: knock.knockId,
    action: 'ACCEPT'
  });
  await handleOfficeCommunicationRoutes(
    respondMock.req, respondMock.res, respondMock.url, {}, respondMock.sendJson, respondMock.readJson, { tenantId: 'grg', actorId: 'agent-backend' }
  );
  assert.equal(respondMock.getStatus(), 200);
  const conv = respondMock.getData().result.conversation;
  assert.ok(conv);
  assert.equal(conv.status, 'ACTIVE');

  // 3. Post Message
  const msgMock = createMockHttp('POST', `/api/v2/office/conversations/${conv.conversationId}/messages`, {
    content: 'Tests running now. Will update with report.'
  });
  await handleOfficeCommunicationRoutes(
    msgMock.req, msgMock.res, msgMock.url, {}, msgMock.sendJson, msgMock.readJson, { tenantId: 'grg', actorId: 'agent-qa' }
  );
  assert.equal(msgMock.getStatus(), 201);
  assert.equal(msgMock.getData().message.content, 'Tests running now. Will update with report.');
});

test('RECIPROCITY 3: Multi-Agent Meeting Lifecycle over HTTP', async () => {
  // Create Meeting
  const createMock = createMockHttp('POST', '/api/v2/office/meetings', {
    topic: 'Fênix Zero-AI Alignment',
    roomId: 'room-meeting-a',
    participants: ['grg-admin', 'agent-architect', 'agent-security']
  });
  await handleOfficeCommunicationRoutes(
    createMock.req, createMock.res, createMock.url, {}, createMock.sendJson, createMock.readJson, { tenantId: 'grg', actorId: 'grg-admin' }
  );
  assert.equal(createMock.getStatus(), 201);
  const meeting = createMock.getData().meeting;

  // Add Decision
  const decMock = createMockHttp('POST', `/api/v2/office/meetings/${meeting.meetingId}/decisions`, {
    decision: 'All communication must pass through circuit breaker'
  });
  await handleOfficeCommunicationRoutes(
    decMock.req, decMock.res, decMock.url, {}, decMock.sendJson, decMock.readJson, { tenantId: 'grg', actorId: 'agent-security' }
  );
  assert.equal(decMock.getStatus(), 201);

  // End Meeting
  const endMock = createMockHttp('POST', `/api/v2/office/meetings/${meeting.meetingId}/end`, {
    summary: 'Decision ratified unanimously'
  });
  await handleOfficeCommunicationRoutes(
    endMock.req, endMock.res, endMock.url, {}, endMock.sendJson, endMock.readJson, { tenantId: 'grg', actorId: 'grg-admin' }
  );
  assert.equal(endMock.getStatus(), 200);
  assert.equal(endMock.getData().meeting.status, 'ENDED');
});

test('RECIPROCITY 4: War Room and Agent Handoff over HTTP', async () => {
  // Handoff
  const handoffMock = createMockHttp('POST', '/api/v2/office/handoff', {
    sourceAgent: 'agent-frontend',
    targetAgent: 'agent-qa',
    missionId: 'm-fase14-delivery',
    reason: 'Validate office view in browser'
  });
  await handleOfficeCommunicationRoutes(
    handoffMock.req, handoffMock.res, handoffMock.url, {}, handoffMock.sendJson, handoffMock.readJson, { tenantId: 'grg', actorId: 'agent-frontend' }
  );
  assert.equal(handoffMock.getStatus(), 201);
  assert.ok(handoffMock.getData().handoff.handoffId);

  // War Room Activation
  const warMock = createMockHttp('POST', '/api/v2/office/war-room', {
    incidentId: 'inc-database-lock',
    severity: 'HIGH'
  });
  await handleOfficeCommunicationRoutes(
    warMock.req, warMock.res, warMock.url, {}, warMock.sendJson, warMock.readJson, { tenantId: 'grg', actorId: 'grg-admin' }
  );
  assert.equal(warMock.getStatus(), 201);

  // Resolve War Room
  const resolveMock = createMockHttp('POST', '/api/v2/office/war-room/inc-database-lock/resolve', {});
  await handleOfficeCommunicationRoutes(
    resolveMock.req, resolveMock.res, resolveMock.url, {}, resolveMock.sendJson, resolveMock.readJson, { tenantId: 'grg', actorId: 'grg-admin' }
  );
  assert.equal(resolveMock.getStatus(), 200);
  assert.equal(resolveMock.getData().resolved, true);
});

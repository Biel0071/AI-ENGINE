'use strict';

/**
 * FÊNIX OS — Office Communication Routes (Fase 14)
 * =================================================
 * Full-stack HTTP endpoints for the Living Agent Office,
 * door knocks, conversations, multi-agent meetings, and handoffs.
 */

const {
  globalOfficeManager,
  globalPresenceManager,
  globalRoomManager,
  globalConversationManager,
  globalMeetingManager,
  globalCommunicationRouter,
  globalConversationStore,
  globalConversationMemory
} = require('../communication');

async function handleOfficeCommunicationRoutes(req, res, url, app, sendJson, readJson, authContext = {}) {
  const method = req.method;
  const pathname = url.pathname;
  const tenantId = authContext.tenantId || 'grg';
  const actorId = authContext.actorId || 'grg-admin';

  // 1. Overall Office State (Digital Twin + Spatial Presence)
  if (method === 'GET' && pathname === '/api/v2/office/state') {
    // Sync with live JobEngine if available
    try {
      if (app && app.jobs && typeof app.jobs.list === 'function') {
        const jobs = await app.jobs.list(tenantId, actorId);
        const state = await app.store?.read?.() || {};
        const agents = state.agents || [];
        globalPresenceManager.syncRuntimeState(jobs, agents);
      }
    } catch (err) {
      // In-memory fallback is safe
    }

    const offices = globalOfficeManager.listOffices();
    const presence = globalPresenceManager.getAllPresence();
    const activeConversations = globalConversationStore.listConversations({ status: 'ACTIVE' });
    const activeMeetings = Array.from(globalMeetingManager.activeMeetings.values());
    const activityFeed = globalConversationStore.getActivityFeed(30);

    return sendJson(res, 200, {
      ok: true,
      source: 'measured',
      offices,
      presence,
      activeConversations,
      activeMeetings,
      activityFeed,
      timestamp: new Date().toISOString()
    });
  }

  // 2. List Offices
  if (method === 'GET' && pathname === '/api/v2/office/offices') {
    const districtId = url.searchParams.get('districtId');
    const type = url.searchParams.get('type');
    const filter = {};
    if (districtId) filter.districtId = districtId;
    if (type) filter.type = type;

    return sendJson(res, 200, {
      ok: true,
      offices: globalOfficeManager.listOffices(filter)
    });
  }

  // 3. Single Office Details
  const officeDetailMatch = pathname.match(/^\/api\/v2\/office\/offices\/([^/]+)$/);
  if (method === 'GET' && officeDetailMatch) {
    const officeId = officeDetailMatch[1];
    const office = globalOfficeManager.getOffice(officeId);
    if (!office) return sendJson(res, 404, { error: 'Office not found' });

    const occupants = office.participants.map(id => ({
      id,
      presence: globalPresenceManager.getAgentPresence(id) || null
    }));

    return sendJson(res, 200, {
      ok: true,
      office,
      occupants
    });
  }

  // 4. Door Knock (Initiate Collaboration)
  if (method === 'POST' && pathname === '/api/v2/office/knock') {
    const body = await readJson(req);
    try {
      const knock = globalConversationManager.knock({
        fromAgent: body.fromAgent || actorId,
        toAgent: body.toAgent,
        officeId: body.officeId,
        reason: body.reason,
        missionId: body.missionId,
        projectId: body.projectId,
        context: body.context || {}
      });
      return sendJson(res, 201, { ok: true, knock });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 5. Respond to Knock
  if (method === 'POST' && pathname === '/api/v2/office/knock/respond') {
    const body = await readJson(req);
    try {
      const result = await globalConversationManager.respondKnock(
        body.knockId,
        body.action || 'ACCEPT',
        { redirectTo: body.redirectTo }
      );
      return sendJson(res, 200, { ok: true, result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 6. List Conversations
  if (method === 'GET' && pathname === '/api/v2/office/conversations') {
    const status = url.searchParams.get('status');
    const agentId = url.searchParams.get('agentId');
    const missionId = url.searchParams.get('missionId');
    const filter = {};
    if (status) filter.status = status;
    if (agentId) filter.agentId = agentId;
    if (missionId) filter.missionId = missionId;

    return sendJson(res, 200, {
      ok: true,
      conversations: globalConversationStore.listConversations(filter)
    });
  }

  // 7. Conversation Messages & Details
  const convDetailMatch = pathname.match(/^\/api\/v2\/office\/conversations\/([^/]+)$/);
  if (method === 'GET' && convDetailMatch) {
    const conversationId = convDetailMatch[1];
    const conversation = globalConversationStore.getConversation(conversationId);
    if (!conversation) return sendJson(res, 404, { error: 'Conversation not found' });

    const messages = globalConversationStore.getMessagesForConversation(conversationId, 100);
    return sendJson(res, 200, {
      ok: true,
      conversation,
      messages
    });
  }

  // 8. Post Message in Conversation
  const convMessageMatch = pathname.match(/^\/api\/v2\/office\/conversations\/([^/]+)\/messages$/);
  if (method === 'POST' && convMessageMatch) {
    const conversationId = convMessageMatch[1];
    const body = await readJson(req);
    try {
      const message = globalConversationManager.sendMessage({
        conversationId,
        senderId: body.senderId || actorId,
        content: body.content,
        type: body.type,
        context: body.context || {}
      });
      return sendJson(res, 201, { ok: true, message });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 9. Complete Conversation
  const convCompleteMatch = pathname.match(/^\/api\/v2\/office\/conversations\/([^/]+)\/complete$/);
  if (method === 'POST' && convCompleteMatch) {
    const conversationId = convCompleteMatch[1];
    const body = await readJson(req);
    try {
      const completed = await globalConversationManager.completeConversation(conversationId, body.reason || 'RESOLVED');
      return sendJson(res, 200, { ok: true, conversation: completed });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 10. Multi-Agent Meetings
  if (method === 'POST' && pathname === '/api/v2/office/meetings') {
    const body = await readJson(req);
    try {
      const meeting = globalMeetingManager.createMeeting({
        topic: body.topic,
        roomId: body.roomId || 'room-meeting-a',
        participants: body.participants || [actorId, 'agent-architect', 'agent-backend'],
        missionId: body.missionId,
        projectId: body.projectId
      });
      return sendJson(res, 201, { ok: true, meeting });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const meetingDecisionMatch = pathname.match(/^\/api\/v2\/office\/meetings\/([^/]+)\/decisions$/);
  if (method === 'POST' && meetingDecisionMatch) {
    const meetingId = meetingDecisionMatch[1];
    const body = await readJson(req);
    try {
      const decision = globalMeetingManager.addDecision(meetingId, body.decision, body.author || actorId);
      return sendJson(res, 201, { ok: true, decision });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const meetingActionMatch = pathname.match(/^\/api\/v2\/office\/meetings\/([^/]+)\/actions$/);
  if (method === 'POST' && meetingActionMatch) {
    const meetingId = meetingActionMatch[1];
    const body = await readJson(req);
    try {
      const actionItem = globalMeetingManager.addActionItem(meetingId, {
        task: body.task,
        assigneeId: body.assigneeId,
        deadline: body.deadline
      });
      return sendJson(res, 201, { ok: true, actionItem });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const meetingEndMatch = pathname.match(/^\/api\/v2\/office\/meetings\/([^/]+)\/end$/);
  if (method === 'POST' && meetingEndMatch) {
    const meetingId = meetingEndMatch[1];
    const body = await readJson(req);
    try {
      const meeting = await globalMeetingManager.endMeeting(meetingId, body.summary);
      return sendJson(res, 200, { ok: true, meeting });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 11. Agent Handoff
  if (method === 'POST' && pathname === '/api/v2/office/handoff') {
    const body = await readJson(req);
    try {
      const handoff = globalCommunicationRouter.executeHandoff({
        sourceAgent: body.sourceAgent,
        targetAgent: body.targetAgent,
        missionId: body.missionId,
        taskId: body.taskId,
        reason: body.reason,
        context: body.context || {},
        artifacts: body.artifacts || [],
        expectedOutcome: body.expectedOutcome
      });
      return sendJson(res, 201, { ok: true, handoff });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 12. War Room Activation & Resolution
  if (method === 'POST' && pathname === '/api/v2/office/war-room') {
    const body = await readJson(req);
    try {
      const warRoom = globalRoomManager.activateWarRoom({
        id: body.incidentId,
        description: body.description,
        severity: body.severity,
        specialists: body.specialists
      });
      return sendJson(res, 201, { ok: true, warRoom });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  const warRoomResolveMatch = pathname.match(/^\/api\/v2\/office\/war-room\/([^/]+)\/resolve$/);
  if (method === 'POST' && warRoomResolveMatch) {
    const incidentId = warRoomResolveMatch[1];
    const resolved = globalRoomManager.resolveWarRoom(incidentId);
    return sendJson(res, 200, { ok: true, resolved });
  }

  // 13. Human Presence
  if (method === 'POST' && pathname === '/api/v2/office/human/presence') {
    const body = await readJson(req);
    const updated = globalPresenceManager.setHumanPresence(body);
    return sendJson(res, 200, { ok: true, human: updated });
  }

  // 14. Activity Feed
  if (method === 'GET' && pathname === '/api/v2/office/feed') {
    return sendJson(res, 200, {
      ok: true,
      feed: globalConversationStore.getActivityFeed(50)
    });
  }

  // 15. Distilled Memory
  if (method === 'GET' && pathname === '/api/v2/office/memory') {
    return sendJson(res, 200, {
      ok: true,
      memory: globalConversationMemory.getDistilledEntries(50)
    });
  }

  return false;
}

module.exports = { handleOfficeCommunicationRoutes };

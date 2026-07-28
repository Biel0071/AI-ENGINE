const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX Cognitive Workspace OS & ECA Test Suite', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. 4 Workspace Modes (Focus, Assistant, Collaborator, Autonomous)
  const defaultMode = await app.workspaceModes.getActiveMode(tenantId, actorId);
  assert.equal(defaultMode.activeMode, 'COLLABORATOR');

  const setAutonomous = await app.workspaceModes.setMode(tenantId, actorId, 'AUTONOMOUS');
  assert.equal(setAutonomous.activeMode, 'AUTONOMOUS');
  assert.ok(setAutonomous.config.policyGates.includes('NO_PROD_DEPLOY'));

  const setFocus = await app.workspaceModes.setMode(tenantId, actorId, 'FOCUS');
  assert.equal(setFocus.activeMode, 'FOCUS');
  assert.equal(setFocus.config.allowInterrupts, false);

  // 2. Executive Cognitive Assistant (ECA) Inbox & Decision Resolution
  const inbox = await app.eca.getInbox(tenantId, actorId);
  assert.ok(inbox.items.length >= 2);
  assert.equal(inbox.unreadCount, 2);

  const decisionResolution = await app.eca.resolveDecision(tenantId, actorId, 'dec-1', 'PROMOTES_STAGING');
  assert.equal(decisionResolution.status, 'RESOLVED');
  assert.equal(decisionResolution.resolvedAction, 'PROMOTES_STAGING');

  // 3. Daily Briefing & Evening ROI Report
  const dailyBrief = await app.eca.getDailyBriefing(tenantId, actorId);
  assert.ok(dailyBrief.greeting.includes('Gabriel'));
  assert.ok(dailyBrief.summary.includes('14 melhorias'));

  const eveningReport = await app.eca.getEveningReport(tenantId, actorId);
  assert.equal(eveningReport.stats.hoursSaved, 12.0);
  assert.equal(eveningReport.stats.tokenReductionPct, '-41.0%');

  // 4. Mood Engine & Temperature Controls & Cognitive Presence
  const presenceConfig = await app.cognitivePresence.getPresenceConfig(tenantId, actorId);
  assert.equal(presenceConfig.mood, 'EXECUTIVO');

  const updatedPresence = await app.cognitivePresence.updatePresenceConfig(tenantId, actorId, {
    mood: 'MENTOR',
    presenceState: 'MOBILE',
    temperature: { creativity: 75 },
  });
  assert.equal(updatedPresence.mood, 'MENTOR');
  assert.equal(updatedPresence.presenceState, 'MOBILE');
  assert.equal(updatedPresence.temperature.creativity, 75);

  await app.close();
});

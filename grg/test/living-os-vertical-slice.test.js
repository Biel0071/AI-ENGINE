'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('../src/app');
const { handleConversationRoutes } = require('../src/api/conversation-routes');

function request(body) {
  return {
    method: 'POST',
    url: '/api/v2/conversation',
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)); },
  };
}

test('read-only audit chat flows through plan, mission, job, tool, artifact and persistent memory', async () => {
  const previousWorkspaceRoot = process.env.FENIX_WORKSPACE_ROOT;
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-audit-workspaces-'));
  await fs.writeFile(path.join(workspaceRoot, 'README.md'), '# Isolated Fênix audit fixture\n');
  execFileSync('git', ['init'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Fênix Test'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'fenix-test@example.invalid'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['add', 'README.md'], { cwd: workspaceRoot, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'Create isolated audit fixture'], { cwd: workspaceRoot, stdio: 'ignore' });
  process.env.FENIX_WORKSPACE_ROOT = workspaceRoot;
  let app;

  try {
    app = await createApp({ autoStartHeart: false });
    assert.equal(app.workspaceRoot, workspaceRoot);
    await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
    const toolEvents = [];
    app.bus.on('execution.tool.started', event => toolEvents.push(event.type || 'started'));
    app.bus.on('execution.tool.completed', event => toolEvents.push(event.type || 'completed'));
    const response = {};

    const handled = await handleConversationRoutes(
      request({ message: 'Analise o Fênix e me diga os três maiores problemas atuais.', projectId: 'fenix-os' }),
      response,
      new URL('http://localhost/api/v2/conversation'),
      (res, status, data) => Object.assign(res, { status, data }),
      async req => { let raw = ''; for await (const chunk of req) raw += chunk; return JSON.parse(raw); },
      { tenantId: 'grg', actorId: 'alice' },
      app,
    );

    assert.equal(handled, true);
    assert.equal(response.status, 202);
    assert.equal(response.data.lane, 'MISSION_LANE');
    assert.ok(response.data.conversationId);
    assert.equal(response.data.plan.mode, 'AUDIT');
    assert.equal(response.data.mission.steps[0].type, 'audit');
    assert.equal(response.data.job.type, 'fenix.readonly.audit');
    assert.equal(response.data.job.payload.root, '.');

    await app.jobs.runBatch('vertical-slice-worker', 1);
    const deadline = Date.now() + 30_000;
    let mission = await app.missions.get('grg', 'alice', response.data.mission.id);
    let job = await app.jobs.get('grg', 'alice', response.data.job.id);
    while (Date.now() < deadline && (!['SUCCEEDED', 'FAILED', 'DEAD_LETTER'].includes(job.status) || !['SUCCEEDED', 'FAILED'].includes(mission.status))) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      mission = await app.missions.get('grg', 'alice', response.data.mission.id);
      job = await app.jobs.get('grg', 'alice', response.data.job.id);
    }
    const history = await app.conversations.history('grg', response.data.conversationId, { actorId: 'alice' });
    const state = await app.store.read();

    assert.equal(mission.status, 'SUCCEEDED');
    assert.equal(job.status, 'SUCCEEDED');
    assert.equal(job.result.toolId, 'system.readonly.audit');
    assert.ok(toolEvents.includes('execution.tool.started'));
    assert.ok(toolEvents.includes('execution.tool.completed'));
    assert.ok(app.bus.history('mission.step.started').length > 0);
    assert.ok(app.bus.history('mission.step.completed').length > 0);
    assert.ok(app.bus.history('conversation.message.appended').length >= 3);
    assert.ok(state.artifacts.some(item => item.id === job.result.result.artifactId));
    assert.deepEqual(history.map(message => message.role), ['user', 'assistant', 'assistant']);
    assert.match(history.at(-1).content, /FENIX_ARCHITECTURE_ANALYSIS\.md/);
    assert.ok(state.memories.some(memory => memory.content === history.at(-1).content));
  } finally {
    await app?.close();
    if (previousWorkspaceRoot === undefined) delete process.env.FENIX_WORKSPACE_ROOT;
    else process.env.FENIX_WORKSPACE_ROOT = previousWorkspaceRoot;
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  }
});

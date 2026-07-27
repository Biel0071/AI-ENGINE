const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { isOperationalRequest } = require('../src/cognitive/master-avatar');

async function bootstrap() { const app = await createApp(); await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice'); return app; }

test('Master Avatar keeps casual conversation outside the execution plane', async () => {
  const app = await bootstrap(); const output = await app.masterAvatar.handle('grg', 'alice', { message: 'Olá, tudo bem?' });
  assert.equal(output.interface, 'MASTER_AVATAR'); assert.equal(output.mission, null); assert.equal((await app.store.read()).missionPlans.length, 0); assert.equal(typeof output.reply, 'string');
});

test('Master Avatar converts operational conversation into a running governed mission', async () => {
  const app = await bootstrap(); const output = await app.masterAvatar.handle('grg', 'alice', { message: 'Verifique a saúde do sistema' });
  assert.equal(output.plan.mode, 'OPERATE'); assert.equal(output.mission.status, 'RUNNING'); assert.equal((await app.store.read()).runtimeJobs.length, 1); assert.match(output.reply, /Missão/);
});

test('Master Avatar asks for missing inspection context instead of fabricating it', async () => {
  const app = await bootstrap(); const output = await app.masterAvatar.handle('grg', 'alice', { message: 'Analise este ERP' });
  assert.equal(output.mission, null); assert.equal(output.plan.status, 'NEEDS_INPUT'); assert.match(output.reply, /workspace autorizado/);
});

test('operational intent recognizer separates commands from casual speech', () => {
  assert.equal(isOperationalRequest('Crie um CRM'), true); assert.equal(isOperationalRequest('monitore a VPS'), true); assert.equal(isOperationalRequest('bom dia'), false);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('ChatAgent handles basic conversation ("qual seu nome") without errors', async () => {
  const app = await createApp({ llm: true });
  assert.ok(app.chat);

  const response = await app.masterAvatar.handle('grg', 'master_admin', { message: 'qual seu nome como vc se chama?' });

  assert.ok(response);
  assert.equal(response.interface, 'MASTER_AVATAR');
  assert.ok(typeof response.reply === 'string');
  assert.ok(response.reply.length > 5);
});

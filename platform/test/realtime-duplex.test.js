const test = require('node:test');
const assert = require('node:assert/strict');
const { FenixRealtimeDuplexEngine } = require('../src/services/realtime-engine');

test('FenixRealtimeDuplexEngine - Fluxo de Sessão e Interrupção (Barge-In)', async () => {
  const engine = new FenixRealtimeDuplexEngine();

  // 1. Criar sessão
  const session = engine.createSession({ tenantId: 'tenant-demo', actorId: 'user-demo' });
  assert.ok(session.id.startsWith('rt-session-'));
  assert.equal(session.voiceMode, 'duplex_simultaneous');

  // 2. Stream duplex de resposta
  const generator = engine.streamDuplexResponse(session.id, 'Olá Fênix');
  const firstChunk = await generator.next();
  assert.equal(firstChunk.value.type, 'session_start');

  const secondChunk = await generator.next();
  assert.equal(secondChunk.value.type, 'token_chunk');
  assert.ok(secondChunk.value.token.length > 0);

  // 3. Simular fala simultânea do usuário (Interrupção / Barge-In)
  const interruptResult = engine.processAudioChunk(session.id, 'audio_base64_sample');
  assert.equal(interruptResult.ok, true);
  assert.equal(interruptResult.bargeInTriggered, true);

  // 4. Próximo chunk do gerador deve reportar interrupção
  const interruptedChunk = await generator.next();
  assert.equal(interruptedChunk.value.type, 'interrupted');
  assert.equal(interruptedChunk.value.reason, 'user_barge_in');

  // 5. Fechar sessão
  const closeResult = engine.closeSession(session.id);
  assert.equal(closeResult.status, 'CLOSED');
});

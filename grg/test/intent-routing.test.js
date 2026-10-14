const test = require('node:test');
const assert = require('node:assert/strict');
const { ChatAgent } = require('../src/chat/chat-agent');

test('intent router keeps conversation out of Mission Control', () => {
  const agent = new ChatAgent({ app: {} });
  assert.deepEqual(agent.classifyRequest('Oi Fênix'), {
    category: 'CONVERSATION', requiresConfirmation: false, intent: 'help'
  });
  assert.equal(agent.classifyRequest('Você consegue analisar meu projeto?').category, 'CONVERSATION');
});

test('intent router classifies a focused edit as one small task', () => {
  const agent = new ChatAgent({ app: {} });
  const result = agent.classifyRequest('corrija esse botão');
  assert.equal(result.category, 'SMALL_TASK');
  assert.equal(result.requiresConfirmation, false);
});

test('intent router requires confirmation before long mission', () => {
  const agent = new ChatAgent({ app: {} });
  const result = agent.classifyRequest('melhore o Command Center inteiro com frontend, backend, agentes e testes');
  assert.equal(result.category, 'LONG_MISSION');
  assert.equal(result.requiresConfirmation, true);
});

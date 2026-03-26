const test = require('node:test');
const assert = require('node:assert/strict');

const { tokenizeProject } = require('../tokenizer');

test('tokenizer generates tokens from context flows and critical points', () => {
  const context = {
    mainFlows: [
      {
        name: 'inbox-flow',
        from: 'ui',
        to: 'api',
        confidence: 0.9,
        sources: ['frontend/inbox.tsx', 'api/inbox.routes.ts'],
      },
    ],
    criticalPoints: [
      {
        type: 'bottleneck',
        message: 'High density in services folder.',
        confidence: 0.8,
        sources: ['services'],
      },
    ],
  };

  const tokens = tokenizeProject({ context });

  assert.ok(Array.isArray(tokens));
  assert.ok(tokens.length >= 2);
  assert.ok(tokens.some((token) => token.id.includes('inbox-flow')));
  assert.ok(tokens.every((token) => typeof token.importance === 'number'));
});

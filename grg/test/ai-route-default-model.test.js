const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadRoutes } = require('../src/ai-runtime/provider-registry');

test('plan and generate use the configured default model when no override exists', () => {
  const routes = loadRoutes({ FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', FENIX_AI_DEFAULT_MODEL: 'qwen2.5:0.5b' }, { production: true });
  assert.deepEqual(routes.plan, { provider: 'aiplatform', model: 'qwen2.5:0.5b' });
  assert.deepEqual(routes.generate, { provider: 'aiplatform', model: 'qwen2.5:0.5b' });
});

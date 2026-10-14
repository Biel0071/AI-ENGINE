const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AgentExecutionRuntime } = require('../src/agents/agent-execution-runtime');

test('AI agent rejects a no-op provider plan before touching the workspace', async () => {
  let executed = false;
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ text: JSON.stringify({ operations: [], tests: [] }), provider: 'test', model: 'test' }) },
    workspaceExecutor: { execute: async () => { executed = true; } },
    events: null,
  });
  await assert.rejects(runtime.execute('tenant', 'actor', { projectId: 'project', prompt: 'Improve UI', agent: { agentId: 'Frontend' } }), /empty execution plan/);
  assert.equal(executed, false);
});

test('AI agent reports failed workspace tests as failure', async () => {
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ text: JSON.stringify({ tests: ['node --check src/index.js'] }), provider: 'test', model: 'test' }) },
    workspaceExecutor: { execute: async () => ({ testsPassed: false }) },
    events: null,
  });
  await assert.rejects(runtime.execute('tenant', 'actor', { projectId: 'project', prompt: 'Validate code', agent: { agentId: 'Testing' } }), /tests failed/);
});

test('AI agent accepts a fenced JSON plan but rejects code changes without tests', async () => {
  let executed = false;
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ text: '```json\n{"operations":[{"operation":"create","path":"proof.js","content":"module.exports = true;"}],"tests":[]}\n```', provider: 'test', model: 'test' }) },
    workspaceExecutor: { execute: async () => { executed = true; } },
    events: null,
  });
  await assert.rejects(runtime.execute('tenant', 'actor', { projectId: 'project', prompt: 'Change code', agent: { agentId: 'Backend' } }), /without validation tests/);
  assert.equal(executed, false);
});

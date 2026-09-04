const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentExecutionRuntime } = require('../src/agents/agent-execution-runtime');

test('agent runtime emits tool success only after the real workspace executor succeeds', async () => {
  const events = [];
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ provider: 'test', model: 'test', text: JSON.stringify({ operations: [{ tool: 'filesystem.write', operation: 'write', path: 'proof.js' }] }) }) },
    workspaceExecutor: { execute: async () => ({ status: 'SUCCEEDED', artifact: 'proof.js' }) },
    events: { publish: async (event) => events.push(event) },
  });
  const result = await runtime.execute('tenant', 'actor', { jobId: 'job-1', projectId: 'project-1', agent: { agentId: 'agent-1', name: 'Test Agent' } });
  assert.equal(result.toolCalls[0].tool, 'filesystem.write');
  assert.equal(events.find((event) => event.type === 'agent.tool.result').data.status, 'SUCCEEDED');
});

test('agent runtime emits a failed tool result and propagates executor errors', async () => {
  const events = [];
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ provider: 'test', model: 'test', text: JSON.stringify({ operations: [{ tool: 'terminal.execute', operation: 'run', path: null }] }) }) },
    workspaceExecutor: { execute: async () => { throw new Error('executor unavailable'); } },
    events: { publish: async (event) => events.push(event) },
  });
  await assert.rejects(() => runtime.execute('tenant', 'actor', { jobId: 'job-2', projectId: 'project-1', agent: { agentId: 'agent-1' } }), /executor unavailable/);
  assert.equal(events.find((event) => event.type === 'agent.tool.result').data.status, 'FAILED');
  assert.ok(events.some((event) => event.type === 'agent.execution.failed'));
});

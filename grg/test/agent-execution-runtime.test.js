const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentExecutionRuntime } = require('../src/agents/agent-execution-runtime');

test('agent runtime emits tool success only after the real workspace executor succeeds', async () => {
  const events = [];
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ provider: 'test', model: 'test', text: JSON.stringify({ operations: [{ tool: 'filesystem.write', operation: 'write', path: 'proof.js' }], tests: ['node --check proof.js'] }) }) },
    workspaceExecutor: { execute: async () => ({ status: 'SUCCEEDED', artifact: 'proof.js' }) },
    events: { publish: async (event) => events.push(event) },
  });
  const result = await runtime.execute('tenant', 'actor', { jobId: 'job-1', projectId: 'project-1', agent: { agentId: 'agent-1', name: 'Test Agent' } });
  assert.equal(result.toolCalls[0].tool, 'filesystem.write');
  assert.equal(events.find((event) => event.type === 'agent.tool.result').data.status, 'SUCCEEDED');
});

test('agent runtime includes selected skill instructions in the provider prompt', async () => {
  let receivedPrompt = '';
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async (_tenant, _actor, request) => {
      receivedPrompt = request.prompt;
      return { provider: 'test', model: 'test', text: JSON.stringify({ operations: [{ operation: 'create', path: 'proof.js', content: 'module.exports = true;' }], tests: ['node --check proof.js'] }) };
    } },
    workspaceExecutor: { execute: async () => ({ status: 'SUCCEEDED' }) },
    skillRegistry: { contextForAgent: async () => ({
      selectedSkills: [{ id: 'apple-hig-adapter', name: 'Project Design Review' }],
      prompt: 'Review the selected project using its existing design system. Return evidence, prioritized findings, and measurable closure criteria.'
    }) },
    events: null,
  });

  await runtime.execute('tenant', 'actor', { jobId: 'job-skill', projectId: 'project-1', prompt: 'Review this UI', agent: { agentId: 'agent-frontend' } });
  assert.match(receivedPrompt, /Project Design Review/);
  assert.match(receivedPrompt, /measurable closure criteria/);
});

test('agent runtime emits a failed tool result and propagates executor errors', async () => {
  const events = [];
  const runtime = new AgentExecutionRuntime({
    aiGateway: { invoke: async () => ({ provider: 'test', model: 'test', text: JSON.stringify({ operations: [{ tool: 'terminal.execute', operation: 'run', path: null }], tests: ['node --check proof.js'] }) }) },
    workspaceExecutor: { execute: async () => { throw new Error('executor unavailable'); } },
    events: { publish: async (event) => events.push(event) },
  });
  await assert.rejects(() => runtime.execute('tenant', 'actor', { jobId: 'job-2', projectId: 'project-1', agent: { agentId: 'agent-1' } }), /executor unavailable/);
  assert.equal(events.find((event) => event.type === 'agent.tool.result').data.status, 'FAILED');
  assert.ok(events.some((event) => event.type === 'agent.execution.failed'));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createApp } = require('../src/app');
const run = promisify(execFile);
async function git(cwd, ...args) { return run('git', args, { cwd, windowsHide: true }); }

test('agent workspace executor writes through policy, validates and commits audited output', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-agent-'));
  await git(root, 'init', '-b', 'fenix-agent'); await git(root, 'config', 'user.email', 'fenix@test.invalid'); await git(root, 'config', 'user.name', 'FENIX Test');
  await fs.writeFile(path.join(root, 'README.md'), 'agent project\n'); await git(root, 'add', 'README.md'); await git(root, 'commit', '-m', 'initial');
  const app = await createApp({ dataFile: null }); await app.controlPlane.createTenant({ id: 'agent-e2e', name: 'Agent E2E' }, 'operator');
  try {
    const project = await app.projectKernel.create('agent-e2e', 'operator', { id: 'agent-project', name: 'Agent Project', workspace: root, branch: 'fenix-agent' });
    const job = await app.jobs.submit('agent-e2e', 'operator', { type: 'agent.workspace.execute', source: 'api', projectId: project.id, prompt: 'Implement backend API', requiredCapabilities: ['backend'], payload: { projectId: project.id, operations: [{ operation: 'create', path: 'src/api.js', content: 'module.exports = { ok: true };\n' }], tests: ['node --check src/api.js'], runTests: true, validationPassed: true, policyAllows: true, commit: true, missionId: 'mission-agent' } });
    assert.equal(job.agent.agentId, 'Backend');
    const [done] = await app.jobs.runBatch('agent-executor', 1);
    assert.equal(done.status, 'SUCCEEDED', JSON.stringify(done.error)); assert.equal(done.result.result, 'COMMITTED'); assert.match(done.result.commit.commit, /^[0-9a-f]{40}$/);
    assert.match((await git(root, 'log', '-1', '--format=%B')).stdout, /Project-Id: agent-project/);
    assert.ok((await app.projectKernel.state('agent-e2e', 'operator', project.id)).artifacts.some((item) => item.type === 'FENIX_AGENT_EXECUTION_REPORT'));
    const mission = await app.missions.create('agent-e2e', 'operator', { projectId: project.id, title: 'Build controlled API', objective: 'Build and validate a small API', steps: [{ key: 'implement', type: 'implement', payload: { projectId: project.id, operations: [{ operation: 'create', path: 'src/mission-api.js', content: 'module.exports = { mission: true };\n' }], tests: ['node --check src/mission-api.js'], runTests: true, validationPassed: true, policyAllows: true, commit: true, requiredCapabilities: ['backend'] } , validation: { testsPassed: true, risk: 'low', impactKnown: true } }] });
    await app.missions.start('agent-e2e', 'operator', mission.id); const [missionJob] = await app.jobs.runBatch('agent-mission-worker', 1);
    assert.equal(missionJob.status, 'SUCCEEDED'); const finalMission = await app.missions.get('agent-e2e', 'operator', mission.id); assert.equal(finalMission.status, 'SUCCEEDED');
  } finally { await app.close(); await fs.rm(root, { recursive: true, force: true }); }
});

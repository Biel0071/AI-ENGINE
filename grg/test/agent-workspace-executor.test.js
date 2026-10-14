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

test('agent.execute uses a provider plan to write and validate a registered project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-agent-plan-'));
  await git(root, 'init', '-b', 'fenix-agent');
  await fs.writeFile(path.join(root, 'README.md'), 'agent project\n');
  await git(root, 'add', 'README.md');
  await git(root, '-c', 'user.email=fenix@test.invalid', '-c', 'user.name=FENIX Test', 'commit', '-m', 'initial');
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'agent-plan', name: 'Agent Plan' }, 'operator');
  try {
    app.aiGateway.invoke = async () => ({ provider: 'configured-test', model: 'plan-model', text: JSON.stringify({
      operations: [{ operation: 'create', path: 'src/feature.js', content: 'module.exports = { feature: true };\n' }],
      tests: ['node --check src/feature.js'], validationPassed: true, commit: false,
    }) });
    const project = await app.projectKernel.create('agent-plan', 'operator', { name: 'Agent Plan', workspace: root, branch: 'fenix-agent' });
    const job = await app.jobs.submit('agent-plan', 'operator', { type: 'agent.execute', projectId: project.id, prompt: 'Create a feature', requiredCapabilities: ['backend'], payload: { projectId: project.id, prompt: 'Create a feature' }, maxAttempts: 1 });
    const done = await app.jobs.run('agent-plan', job.id, 'agent-plan-worker');
    assert.equal(done.status, 'SUCCEEDED', JSON.stringify(done.error));
    assert.equal(done.result.testsPassed, true);
    assert.match(await fs.readFile(path.join(root, 'src/feature.js'), 'utf8'), /feature: true/);
    assert.ok((await app.projectKernel.state('agent-plan', 'operator', project.id)).artifacts.some((item) => item.type === 'FENIX_AGENT_EXECUTION_REPORT'));
  } finally { await app.close(); await fs.rm(root, { recursive: true, force: true }); }
});

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

test('concurrent agents keep writes and tests inside their assigned project', async () => {
  const roots = await Promise.all(['a', 'b'].map(async (name) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `fenix-agent-${name}-`));
    await git(root, 'init', '-b', 'main');
    await git(root, 'config', 'user.email', 'fenix@test.invalid');
    await git(root, 'config', 'user.name', 'FENIX Test');
    await fs.writeFile(path.join(root, 'README.md'), name);
    await git(root, 'add', 'README.md');
    await git(root, 'commit', '-m', 'initial');
    return root;
  }));
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'concurrent-agents', name: 'Concurrent Agents' }, 'operator');
  try {
    const projects = await Promise.all(roots.map((root, index) => app.projectKernel.create('concurrent-agents', 'operator', { name: `Project ${index}`, workspace: root, branch: 'main' })));
    await assert.rejects(app.agentWorkspaceExecutor.execute('concurrent-agents', 'operator', {
      projectId: projects[0].id, agentId: 'agent-0', operations: [{ operation: 'create', path: 'untested.js', content: 'module.exports = 1;' }],
    }), /require validation tests/);
    await assert.rejects(fs.access(path.join(roots[0], 'untested.js')));
    const failedJob = await app.jobs.submit('concurrent-agents', 'operator', {
      type: 'agent.workspace.execute', source: 'api', projectId: projects[0].id, maxAttempts: 1,
      payload: { projectId: projects[0].id, operations: [], tests: ['node --check missing-validation-file.js'], commit: false },
    });
    const failedResult = await app.jobs.run('concurrent-agents', failedJob.id, 'failed-test-worker');
    assert.equal(failedResult.status, 'DEAD_LETTER');
    assert.match(failedResult.error.message, /validation tests failed/);
    assert.ok((await app.store.read()).artifacts.some((item) => item.jobId === failedJob.id));
    const results = await Promise.all(projects.map((project, index) => app.agentWorkspaceExecutor.execute('concurrent-agents', 'operator', {
      projectId: project.id, agentId: `agent-${index}`, jobId: `job-${index}`,
      operations: [{ tool: 'filesystem.write', operation: 'create', path: `agent-${index}.js`, content: `module.exports = ${index};\n` }],
      tests: [`node --check agent-${index}.js`],
    })));
    assert.ok(results.every((result) => result.testsPassed));
    for (let index = 0; index < roots.length; index += 1) {
      assert.equal(await fs.readFile(path.join(roots[index], `agent-${index}.js`), 'utf8'), `module.exports = ${index};\n`);
      await assert.rejects(fs.access(path.join(roots[index], `agent-${1 - index}.js`)));
    }
  } finally { await app.close(); await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true }))); }
});

test('configured agent test sandbox receives only the selected file and reports isolation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-agent-sandbox-'));
  await git(root, 'init', '-b', 'main');
  await fs.writeFile(path.join(root, 'README.md'), 'sandbox project\n');
  await fs.writeFile(path.join(root, '.env'), 'PRIVATE_TEST_SECRET=hidden\n');
  await git(root, 'add', 'README.md');
  await git(root, '-c', 'user.email=fenix@test.invalid', '-c', 'user.name=FENIX Test', 'commit', '-m', 'initial');
  const observed = [];
  const app = await createApp({ dataFile: null, agentTestImage: `node@sha256:${'a'.repeat(64)}`, agentTestSandboxFactory: ({ workspaceRoot }) => ({
    run: async (input) => {
      observed.push({ workspaceRoot, ...input });
      assert.equal(await fs.readFile(path.join(input.workspacePath, 'src', 'check.js'), 'utf8'), 'module.exports = true;\n');
      await assert.rejects(fs.access(path.join(input.workspacePath, '.env')));
      return { exitCode: 0, stdout: '', stderr: '', sandbox: { driver: 'docker-rootless' } };
    },
  }) });
  await app.controlPlane.createTenant({ id: 'agent-sandbox', name: 'Agent Sandbox' }, 'operator');
  try {
    const project = await app.projectKernel.create('agent-sandbox', 'operator', { name: 'Sandbox', workspace: root, branch: 'main' });
    const result = await app.agentWorkspaceExecutor.execute('agent-sandbox', 'operator', { projectId: project.id, operations: [{ operation: 'create', path: 'src/check.js', content: 'module.exports = true;\n' }], tests: ['node --check src/check.js'] });
    assert.equal(result.testsPassed, true);
    assert.equal(result.tests[0].sandbox.driver, 'docker-rootless');
    assert.equal(observed.length, 1);
    assert.deepEqual(observed[0].argv, ['node', '--check', 'src/check.js']);
    await assert.rejects(app.agentWorkspaceExecutor.execute('agent-sandbox', 'operator', { projectId: project.id, tests: ['npm test'] }), /validation tests failed/);
    assert.equal(observed.length, 1);
  } finally { await app.close(); await fs.rm(root, { recursive: true, force: true }); }
});

test('mission kernel advances a dependent development mission without manual continue', async () => {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'mission-chain', name: 'Mission Chain' }, 'operator');
  try {
    const mission = await app.missions.create('mission-chain', 'operator', {
      title: 'Persistent multi-job development mission',
      objective: 'Discover, analyze and activate a project in sequence',
      steps: [
        { key: 'discover', type: 'discover', payload: {} },
        { key: 'analyze', type: 'analyze', payload: {}, dependsOn: ['discover'] },
        { key: 'activate', type: 'activate', payload: {}, dependsOn: ['analyze'] },
      ],
    });
    await app.missions.start('mission-chain', 'operator', mission.id);

    const observed = [];
    for (let i = 0; i < 8; i += 1) {
      const batch = await app.jobs.runBatch('mission-chain-worker', 1);
      observed.push(...batch.map((job) => job.type));
      await app.missions.reconcile('mission-chain', 'operator');
      const current = await app.missions.get('mission-chain', 'operator', mission.id);
      if (current.status === 'SUCCEEDED') break;
    }

    const finalMission = await app.missions.get('mission-chain', 'operator', mission.id);
    assert.equal(finalMission.status, 'SUCCEEDED', JSON.stringify(finalMission));
    assert.deepEqual(finalMission.steps.map((step) => step.status), ['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED']);
    assert.deepEqual(observed, ['discovery.scan', 'cognitive.cycle', 'operational.activation']);
    assert.ok(finalMission.events.some((event) => event.type === 'mission.step.dispatched' && event.stepKey === 'analyze'));
    assert.ok(finalMission.events.some((event) => event.type === 'mission.step.dispatched' && event.stepKey === 'activate'));
    assert.ok(finalMission.summary, 'completion checkpoint summary is persisted');
  } finally { await app.close(); }
});

test('development mission writes code, repairs a failed job and continues to validation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-dev-mission-'));
  await git(root, 'init', '-b', 'fenix-dev'); await git(root, 'config', 'user.email', 'fenix@test.invalid'); await git(root, 'config', 'user.name', 'FENIX Test');
  await fs.writeFile(path.join(root, 'README.md'), 'development mission\n'); await git(root, 'add', 'README.md'); await git(root, 'commit', '-m', 'initial');
  const app = await createApp({ dataFile: null, operationalActivation: false });
  await app.controlPlane.createTenant({ id: 'dev-mission', name: 'Dev Mission' }, 'operator');
  let failures = 0;
  app.jobs.handlers.set('operational.daily-intelligence', async () => {
    if (failures < 3) { failures += 1; throw new Error('controlled validation failure'); }
    return { validated: true };
  });
  try {
    const project = await app.projectKernel.create('dev-mission', 'operator', { id: 'dev-project', name: 'Dev Project', workspace: root, branch: 'fenix-dev' });
    const mission = await app.missions.create('dev-mission', 'operator', {
      projectId: project.id, title: 'Real development with repair', objective: 'Write, repair and validate code',
      steps: [
        { key: 'implement', type: 'implement', payload: { projectId: project.id, operations: [{ operation: 'create', path: 'src/mission.js', content: 'module.exports = { healthy: true };\n' }], tests: ['node --check src/mission.js'], runTests: true, validationPassed: true, policyAllows: true, commit: true, requiredCapabilities: ['backend'] }, validation: { testsPassed: true, risk: 'low', impactKnown: true } },
        { key: 'repairable-check', type: 'daily-intelligence', dependsOn: ['implement'] },
        { key: 'validate', type: 'analyze', dependsOn: ['repairable-check'] },
      ],
    });
    await app.missions.start('dev-mission', 'operator', mission.id);
    for (let i = 0; i < 12; i += 1) {
      await app.jobs.runBatch('dev-mission-worker', 2);
      await app.missions.reconcile('dev-mission', 'operator');
      if ((await app.missions.get('dev-mission', 'operator', mission.id)).status === 'SUCCEEDED') break;
      // Job completion and MissionKernel projection are delivered asynchronously.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const result = await app.missions.get('dev-mission', 'operator', mission.id);
    const state = await app.store.read();
    assert.equal(result.status, 'SUCCEEDED', JSON.stringify(result));
    assert.deepEqual(result.steps.map((step) => step.status), ['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED']);
    assert.equal(await fs.readFile(path.join(root, 'src/mission.js'), 'utf8'), 'module.exports = { healthy: true };\n');
    assert.ok(result.events.some((event) => event.type === 'mission.repair.created'));
    assert.ok(state.runtimeJobs.some((job) => job.missionId === mission.id && job.type === 'mission.repair' && job.status === 'SUCCEEDED'));
    assert.ok((await git(root, 'log', '-1', '--format=%B')).stdout.includes('Project-Id: dev-project'));
    assert.equal(state.runtimeJobs.filter((job) => job.missionId === mission.id && job.status === 'QUEUED').length, 0);
  } finally { await app.close(); await fs.rm(root, { recursive: true, force: true }); }
});

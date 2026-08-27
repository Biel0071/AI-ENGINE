const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('../src/app');

function git(cwd, args) { return execFileSync('git', args, { cwd, encoding: 'utf8' }); }

test('development.execute uses AI, changes only an isolated worktree and passes real gates', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-safe-pipeline-'));
  const source = path.join(root, 'source'); const worktrees = path.join(root, 'worktrees');
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, 'app.js'), 'module.exports = 1;\n');
  git(source, ['init']); git(source, ['config', 'user.email', 'fenix-test@example.invalid']); git(source, ['config', 'user.name', 'Fenix Test']);
  git(source, ['add', 'app.js']); git(source, ['commit', '-m', 'initial']);
  const previousRoot = process.env.FENIX_WORKTREE_ROOT; process.env.FENIX_WORKTREE_ROOT = worktrees;
  const provider = {
    name: 'test-ai',
    async complete() {
      return { text: JSON.stringify({ summary: 'add feature', files: [{ path: 'feature.js', content: 'module.exports = () => 42;\n' }] }), model: 'test-model', promptTokens: 10, completionTokens: 10 };
    },
    async available() { return true; },
  };
  const app = await createApp({
    providers: { test: provider },
    routes: { default: { provider: 'test', model: 'test-model' }, generate: { provider: 'test', model: 'test-model' } },
    evolution: false,
  });
  try {
    await app.controlPlane.createTenant({ id: 'dev-test', name: 'Dev Test' }, 'owner');
    const job = await app.jobs.submit('dev-test', 'owner', {
      type: 'development.execute', source: 'codex', prompt: 'add a feature', workspace: source,
      riskLevel: 'MEDIUM', policy: { blockedPaths: ['app.js'] },
    });
    const [done] = await app.jobs.runBatch('worker-dev', 1);
    assert.equal(done.id, job.id);
    assert.equal(done.status, 'SUCCEEDED');
    assert.equal(fs.existsSync(path.join(source, 'feature.js')), false, 'main workspace must remain untouched');
    const persisted = await app.jobs.get('dev-test', 'owner', job.id);
    const worktree = persisted.artifacts.find((item) => item.type === 'worktree');
    assert.ok(worktree);
    assert.equal(fs.readFileSync(path.join(worktree.path, 'feature.js'), 'utf8'), 'module.exports = () => 42;\n');
    assert.equal(persisted.tests[0].status, 'PASS');
    assert.equal(persisted.validation.passed, true);
    const events = await app.jobs.eventsFor('dev-test', 'owner', job.id);
    for (const type of ['context.loaded', 'ai.started', 'files.changed', 'tests.completed', 'validation.completed']) assert.ok(events.some((event) => event.type === type), type);
    const rolledBack = await app.jobs.rollbackJob('dev-test', 'owner', job.id, (record) => app.devPipeline.rollback(record));
    assert.equal(rolledBack.status, 'ROLLED_BACK');
    assert.equal(fs.existsSync(worktree.path), false);
  } finally {
    await app.close();
    if (previousRoot === undefined) delete process.env.FENIX_WORKTREE_ROOT; else process.env.FENIX_WORKTREE_ROOT = previousRoot;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('../src/app');
const { collectContext, parseAnalysis } = require('../src/software-factory/safe-dev-pipeline');

function git(cwd, args) { return execFileSync('git', args, { cwd, encoding: 'utf8' }); }

test('analysis parser accepts one valid JSON object wrapped by model prose', () => {
  const payload = { summary: 'grounded', proposals: Array.from({ length: 3 }, (_, index) => ({ title: `P${index + 1}`, rationale: 'evidence', files: [] })) };
  assert.deepEqual(parseAnalysis(`Here is the analysis:\n\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``), payload);
});

test('analysis parser rejects proposals that invent project files', () => {
  const payload = { summary: 'invalid', proposals: Array.from({ length: 3 }, (_, index) => ({ title: `P${index + 1}`, rationale: 'evidence', files: [index === 0 ? 'invented.js' : 'command.js'] })) };
  assert.throws(() => parseAnalysis(JSON.stringify(payload), new Set(['command.js'])), /unknown files: invented\.js/);
});

test('context collection prioritizes Project Mirror source files beyond the traversal cap', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-context-priority-'));
  try {
    const generated = path.join(root, 'generated'); fs.mkdirSync(generated);
    for (let index = 0; index < 130; index += 1) fs.writeFileSync(path.join(generated, `${String(index).padStart(3, '0')}.js`), `module.exports = ${index};\n`);
    fs.mkdirSync(path.join(root, 'public'));
    fs.writeFileSync(path.join(root, 'public', 'command.js'), 'const command = true;\n');
    const context = await collectContext(root, { sourceFiles: [{ file: 'public/command.js', line: 1 }] }, { hintedOnly: true, contentBudget: 24_000, maxSelected: 12 });
    assert.equal(context.contents[0].path, 'public/command.js');
    assert.match(context.contents[0].content, /command = true/);
    assert.equal(context.contents.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('development.analyze returns three grounded proposals without creating a worktree or changing files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-read-only-analysis-'));
  fs.writeFileSync(path.join(root, 'command.js'), 'module.exports = "command";\n');
  const before = fs.readFileSync(path.join(root, 'command.js'), 'utf8');
  let providerInput = null;
  const provider = {
    name: 'test-ai',
    async complete(input) {
      providerInput = input;
      return {
        text: JSON.stringify({
          summary: 'Three grounded UX improvements',
          proposals: [
            { title: 'Clarify empty state', impact: 'HIGH', risk: 'LOW', rationale: 'The command surface needs guidance.', files: ['command.js'], tests: ['empty state renders'] },
            { title: 'Improve focus state', impact: 'MEDIUM', risk: 'LOW', rationale: 'Keyboard focus should remain visible.', files: ['command.js'], tests: ['focus is visible'] },
            { title: 'Expose job status', impact: 'HIGH', risk: 'MEDIUM', rationale: 'Users need execution feedback.', files: ['command.js'], tests: ['status updates'] },
          ],
        }),
        model: 'test-model', promptTokens: 10, completionTokens: 10,
      };
    },
    async available() { return true; },
  };
  const app = await createApp({
    providers: { test: provider },
    routes: { default: { provider: 'test', model: 'test-model' }, plan: { provider: 'test', model: 'test-model' } },
    evolution: false,
  });
  try {
    await app.controlPlane.createTenant({ id: 'analysis-test', name: 'Analysis Test' }, 'owner');
    const job = await app.jobs.submit('analysis-test', 'owner', {
      type: 'development.analyze', source: 'codex', prompt: 'analyze Command', workspace: root, riskLevel: 'LOW',
    });
    const [done] = await app.jobs.runBatch('worker-analysis', 1);
    assert.equal(done.id, job.id);
    assert.equal(done.status, 'SUCCEEDED');
    assert.equal(done.result.readOnly, true);
    assert.equal(providerInput.format, 'json');
    assert.equal(done.result.proposals.length, 3);
    assert.equal(fs.readFileSync(path.join(root, 'command.js'), 'utf8'), before);
    assert.equal(done.artifacts.some((item) => item.type === 'worktree'), false);
    assert.equal(done.artifacts.find((item) => item.type === 'analysis').status, 'READ_ONLY');
  } finally {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

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
    const preview = persisted.artifacts.find((item) => item.type === 'preview');
    assert.equal(preview.status, 'NOT_AVAILABLE');
    assert.equal(fs.readFileSync(path.join(worktree.path, 'feature.js'), 'utf8'), 'module.exports = () => 42;\n');
    assert.equal(persisted.tests[0].status, 'PASS');
    assert.equal(persisted.validation.passed, true);
    assert.notEqual(persisted.result.truncated, true);
    assert.match(persisted.result.diffPreview, /feature\.js/);
    const diff = await app.devPipeline.diff(persisted);
    assert.match(diff.diff, /feature\.js/);
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

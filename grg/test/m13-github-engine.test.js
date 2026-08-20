const test = require('node:test');
const assert = require('node:assert');
const { GitHubEngine } = require('../src/connectors/github-engine');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { FENIX_EVENTS } = require('../src/core/contracts/event-types');

test('M13: GitHubEngine — Semantic Commits & Pull Request Creation', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const github = new GitHubEngine({ eventBus: bus });
  await github.start();

  // 1. Test Semantic Commit Generation
  const commitMsg = github.generateSemanticCommit({
    type: 'feat',
    scope: 'visual',
    description: 'align checkout button margin to 40px',
    details: ['Incremented width by 20%', 'Passed visual regression match test'],
    breaking: false
  });

  assert.strictEqual(commitMsg.startsWith('feat(visual): align checkout button margin to 40px'), true);
  assert.strictEqual(commitMsg.includes('- Incremented width by 20%'), true);

  // 2. Test Pull Request creation
  let prEventReceived = false;
  bus.on(FENIX_EVENTS.GITHUB_PR_CREATED, (evt) => {
    if (evt.payload.title === 'Reconstrução de Frontend CRM') prEventReceived = true;
  });

  const pr = await github.createPullRequest({
    projectId: 'prj_crm',
    title: 'Reconstrução de Frontend CRM',
    headBranch: 'fenix/rebuild-frontend',
    baseBranch: 'main',
    summary: 'Reconstrução automatizada de componentes React com Tailwind tokens',
    changedFiles: ['src/components/CheckoutButton.tsx'],
    reconstructionScore: 95.5
  });

  assert.strictEqual(pr.status, 'OPEN');
  assert.strictEqual(pr.reconstructionScore, 95.5);
  assert.strictEqual(prEventReceived, true);

  await github.stop();
  await bus.stop();
});

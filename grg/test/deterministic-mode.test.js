const test = require('node:test');
const assert = require('node:assert/strict');
const { ModelRouter } = require('../src/ai/model-router');
const { ExecutableSkill } = require('../src/skills/executable-skill-schema');

test('ModelRouter: DETERMINISTIC route requires 0 tokens and 0 cost', () => {
  const router = new ModelRouter();
  const decision = router.route({ taskType: 'deterministic' });
  assert.equal(decision.provider, 'DETERMINISTIC');
  assert.equal(decision.model, 'none');
  assert.equal(decision.costPer1kTokens, 0.0);
});

test('ModelRouter: executeRequest with deterministic complexity completes without external LLM', async () => {
  const router = new ModelRouter();
  const res = await router.executeRequest({
    prompt: 'Execute deterministic build and test pipeline',
    contextData: { files: ['server.js', 'package.json'] },
    taskType: 'deterministic',
    complexity: 'NONE'
  });
  assert.equal(res.success, true);
  assert.equal(res.provider, 'DETERMINISTIC');
  assert.equal(res.tokens, 0);
  assert.equal(res.latencyMs, 0);
});

test('ExecutableSkill: embodies Skill ≠ Prompt as a verified program', () => {
  const skill = new ExecutableSkill({
    id: 'git-sync-audit',
    name: 'Git Sync & Audit Engine',
    domain: 'devops',
    tools: ['git', 'shell'],
    steps: [
      { id: '1', action: 'git status' },
      { id: '2', action: 'verify zero uncommitted regressions' }
    ],
    verification: [
      { testName: 'git cleanliness', expectedResult: true }
    ]
  });
  const json = skill.toJSON();
  assert.equal(json.id, 'git-sync-audit');
  assert.equal(json.verificationCount, 1);
  assert.equal(skill.validatePreconditions().ok, true);
});

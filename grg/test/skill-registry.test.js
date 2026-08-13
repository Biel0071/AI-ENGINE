const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { SkillRegistry, parseSkillFile } = require('../src/skills/skill-registry');

test('SkillRegistry parses SKILL.md frontmatter and estimates compact context', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-skill-'));
  const skillDir = path.join(dir, 'skills', 'api-debugger');
  fs.mkdirSync(skillDir, { recursive: true });
  const file = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(file, [
    '---',
    'name: api-debugger',
    'description: Debug API errors with correlation IDs.',
    'trigger: [api, http, endpoint]',
    'domains: [backend, observability]',
    '---',
    '# API Debugger',
    'Read the failing endpoint, status code, body, and correlation id before changing code.',
  ].join('\n'));

  const parsed = parseSkillFile(file, dir);
  assert.equal(parsed.id, 'api-debugger');
  assert.deepEqual(parsed.triggers, ['api', 'http', 'endpoint']);
  assert.ok(parsed.estimatedTokens > 0);
});

test('skills are discovered, selected by objective, and attached to agent events', async () => {
  const app = await createApp({ dataFile: null });
  const tenantId = 'grg';
  const actorId = 'grg-admin';
  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  const listed = await app.skillRegistry.listSkills(tenantId, actorId);
  assert.ok(listed.skills.some((skill) => skill.id === 'frontend-click-qa'));
  assert.ok(listed.skills.some((skill) => skill.id === 'fenix-operational-routing'));

  const pack = await app.skillRegistry.selectForTask(tenantId, actorId, {
    objective: 'validar frontend clicando botoes e checar deploy na VPS',
    maxTokens: 900,
  });
  assert.ok(pack.selectedSkills.some((skill) => skill.id === 'frontend-click-qa'));
  assert.ok(pack.estimatedTokens <= 900);
  assert.ok(pack.savedBySelectiveLoad >= 0);
  assert.match(pack.prompt, /Frontend Click QA/);

  const agents = await app.agentSwarm.listAgents(tenantId, actorId);
  const frontend = agents.agents.find((agent) => agent.id === 'agent-frontend');
  assert.ok(frontend.skills.some((skill) => skill.id === 'frontend-click-qa'));

  const event = await app.agentSwarm.dispatchEvent(tenantId, actorId, {
    targetAgent: 'agent-frontend',
    type: 'frontend.click.qa',
    data: { prompt: 'testar botoes do dashboard' },
  });
  assert.ok(event.data.skillContext.selectedSkills.some((skill) => skill.id === 'frontend-click-qa'));

  await app.close();
});

test('skill-global files without extension are valid skill sources', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-skill-global-'));
  const file = path.join(root, 'skill-global');
  fs.writeFileSync(file, [
    '---',
    'name: global-token-discipline',
    'description: Always load only the minimum required context.',
    '---',
    'Prefer compact summaries and selected skill context over full repository dumps.',
  ].join('\n'));
  const app = await createApp({ dataFile: null, skillPaths: [file] });
  const tenantId = 'grg';
  const actorId = 'grg-admin';
  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  const listed = await app.skillRegistry.listSkills(tenantId, actorId);
  assert.ok(listed.skills.some((skill) => skill.id === 'global-token-discipline'));

  await app.close();
});

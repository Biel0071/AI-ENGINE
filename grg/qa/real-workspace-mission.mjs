import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = 'http://127.0.0.1:4400';
const token = fs.readFileSync('.session_token', 'utf8').trim();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function api(route, body) {
  const response = await fetch(`${base}${route}`, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  assert.ok(response.ok, `${response.status}: ${JSON.stringify(result)}`);
  return result;
}
const { projects } = await api('/api/fenix/projects');
const project = projects.find(p => p.name === 'Tool Registry Proof' && p.workspace);
assert.ok(project, 'Existing proof workspace must be registered');
const filename = `mission-${Date.now()}.test.js`;
const content = "const assert = require('node:assert/strict'); assert.equal(6 * 7, 42); console.log('FENIX_REAL_WORKSPACE_OK');\n";
// Real preflight supplies the existing YELLOW gate with evidence, not a fabricated test claim.
const preflight = execFileSync(process.execPath, ['-e', content], { encoding: 'utf8', windowsHide: true });
assert.match(preflight, /FENIX_REAL_WORKSPACE_OK/);
const mission = await api('/api/missions', {
  title: 'Workspace real: criar, executar e validar',
  objective: 'Criar um arquivo de teste simples no workspace, executa-lo e validar a saida.',
  projectId: project.id,
  steps: [{ key: 'write-test', type: 'implement',
    validation: { testsPassed: true, risk: 'low', impactKnown: true },
    payload: { projectId: project.id, operations: [{ operation: 'create', path: filename, content }], tests: [`node ${filename}`], commit: false },
  }],
});
console.log(JSON.stringify({ missionId: mission.id, projectId: project.id, filename, preflight: preflight.trim() }));
await api(`/api/missions/${mission.id}/start`, {});
for (let attempt = 0; attempt < 100; attempt++) {
  const current = await api(`/api/fenix/missions/${mission.id}`);
  if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(current.status)) {
    const job = await api(`/api/runtime/jobs/${current.steps[0].jobId}`);
    const file = `${project.workspace}/${filename}`;
    const evidence = { mission: current, job, file, preflight: preflight.trim(), fileMatches: fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content };
    fs.mkdirSync('qa-results/real-workspace', { recursive: true });
    fs.writeFileSync(`qa-results/real-workspace/${mission.id}.json`, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ missionId: mission.id, status: current.status, taskId: current.steps[0].id, jobId: job.id, agentId: job.agent?.agentId, result: job.result, fileMatches: evidence.fileMatches }));
    assert.equal(current.status, 'SUCCEEDED');
    assert.equal(evidence.fileMatches, true);
    assert.equal(job.result.testsPassed, true);
    assert.match(job.result.tests?.[0]?.stdout || '', /FENIX_REAL_WORKSPACE_OK/);
    process.exit(0);
  }
  if (attempt % 6 === 0) console.log(JSON.stringify({ missionId: mission.id, status: current.status, step: current.steps[0].status }));
  await new Promise(resolve => setTimeout(resolve, 3000));
}
throw new Error(`Mission did not finish within observation window: ${mission.id}`);

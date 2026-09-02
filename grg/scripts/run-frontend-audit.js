/* Repeatable read-only frontend audit orchestrator. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const steps = [
  ['screen-map', 'scripts/build-screen-function-map.js', [], 12_000],
  ['screen-plan', 'scripts/generate-screen-qa-plan.js', [], 5_000],
  ['screen-contracts', 'scripts/probe-screen-contracts.js', [], 12_000],
  ['frontend-fast', 'scripts/frontend-navigation-qa.js', ['--fast'], 20_000],
  ['screen-readiness', 'scripts/build-screen-readiness-report.js', [], 5_000],
];
const results = [];
for (const [name, file, args, defaultTimeout] of steps) {
  const run = spawnSync(process.execPath, [path.join(root, file), ...args], { cwd: root, env: process.env, encoding: 'utf8', timeout: Number(process.env.FENIX_AUDIT_STEP_TIMEOUT || defaultTimeout) });
  results.push({ name, exitCode: run.status, timedOut: Boolean(run.error && run.error.code === 'ETIMEDOUT'), output: `${run.stdout || ''}${run.stderr || ''}`.trim() });
}
const result = { startedAt: new Date().toISOString(), steps: results, pass: results.every(step => step.exitCode === 0) };
const out = process.env.FENIX_FULL_AUDIT_OUT || path.join(root, 'qa-results', 'frontend-full-audit.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ pass: result.pass, steps: results.map(step => ({ name: step.name, exitCode: step.exitCode })) }, null, 2));
console.log(`Evidence: ${out}`);
process.exitCode = result.pass ? 0 : 1;

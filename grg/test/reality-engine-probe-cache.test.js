'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const projectRegistry = require('../src/projects/project-registry');
const { RealityEngine } = require('../src/api/reality-engine');

test('Reality Engine coalesces system probes and reuses them for thirty seconds', async () => {
  const originalExecSync = childProcess.execSync;
  const originalGetAllProjects = projectRegistry.getAllProjects;
  const originalDateNow = Date.now;
  const commands = [];
  let now = 1_000;

  childProcess.execSync = (command) => {
    const text = String(command);
    commands.push(text);
    if (text === 'pm2 jlist') return Buffer.from('[]');
    if (text.startsWith('docker ps')) return Buffer.from('');
    if (text.includes('rev-parse --abbrev-ref')) return Buffer.from('master\n');
    if (text.includes('rev-parse HEAD')) return Buffer.from('a'.repeat(40));
    if (text.includes('git status')) return Buffer.from('');
    if (text.includes('git log')) return Buffer.from('test\n');
    if (text.startsWith('df -P /')) return Buffer.from('100000 90000 90%\n');
    return Buffer.from('');
  };
  projectRegistry.getAllProjects = async () => [];
  Date.now = () => now;

  try {
    const engine = new RealityEngine();
    const [first, concurrent] = await Promise.all([
      engine.getRealitySummary(),
      new RealityEngine().getRealitySummary(),
    ]);
    const initialCommandCount = commands.length;

    assert.equal(commands.filter((command) => command === 'pm2 jlist').length, 1);
    assert.deepEqual(first.pm2Processes, concurrent.pm2Processes);

    now += 20_000;
    await engine.getRealitySummary();
    assert.equal(commands.length, initialCommandCount, 'fresh infrastructure data should be reused');

    now += 11_000;
    await engine.getRealitySummary();
    assert.ok(commands.length > initialCommandCount, 'expired infrastructure data should be collected again');
  } finally {
    childProcess.execSync = originalExecSync;
    projectRegistry.getAllProjects = originalGetAllProjects;
    Date.now = originalDateNow;
  }
});

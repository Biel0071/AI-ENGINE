'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('BAI readiness ignores a contradictory healthRate and derives active percentage', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../public/fenix-bai-browser.js'), 'utf8');
  const helper = source.match(/function calculateBaiReadiness\(stats\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(helper, 'client readiness calculator is defined');
  const sandbox = {};
  vm.runInNewContext(`${helper}\nglobalThis.calculateBaiReadiness = calculateBaiReadiness;`, sandbox);

  const liveStats = { totalInstances: 6, runningInstances: 0, connectedAccounts: 6, sessionsWithCookies: 6, healthRate: 100 };
  assert.equal(sandbox.calculateBaiReadiness(liveStats), 0);
  assert.equal(sandbox.calculateBaiReadiness({ ...liveStats, runningInstances: 2 }), 33);
  assert.equal(sandbox.calculateBaiReadiness({ ...liveStats, totalInstances: 0 }), null);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ReaIntelligenceEngine } = require('../src/services/rea-intelligence-engine');

test('REA maps Fênix OS to the application workspace instead of its parent catalog folder', () => {
  const target = new ReaIntelligenceEngine()._resolveProjectTarget('fenix-os');

  assert.equal(path.basename(target.rootPath).toLowerCase(), 'grg');
  assert.equal(path.basename(path.dirname(target.rootPath)).toLowerCase(), 'ai-engine');
});

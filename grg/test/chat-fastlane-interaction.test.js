'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf8');

test('chat batches rapid ordinary messages and serializes server conversation turns', () => {
  assert.ok(source.includes('flushQueued'), 'queued sends have an explicit flush path');
  assert.ok(source.includes('_conversationRequestTail'), 'server turns are serialized');
  assert.ok(source.includes("overrideMessage: messages.join('\\n')"), 'rapid messages are sent as one contextual turn');
});

test('chat timer displays elapsed whole seconds from the clock, not a synthetic counter', () => {
  assert.ok(source.includes('_liveTimerStartedAt'));
  assert.ok(source.includes('Math.floor((Date.now() - this._liveTimerStartedAt) / 1000)'));
  assert.ok(!source.includes('elapsedSec += 0.1'));
});

test('quick actions expose an editable order and visibility control', () => {
  assert.ok(source.includes('fsbQuickActionsCustomizeBtn'));
  assert.ok(source.includes('fenix.chat.quickActions'));
  assert.ok(source.includes('fsbQuickActionsEditor'));
});

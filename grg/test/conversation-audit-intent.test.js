'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isReadOnlySystemAudit } = require('../src/api/conversation-routes');

test('Portuguese audit requests use the read-only system audit lane', () => {
  assert.equal(isReadOnlySystemAudit('audite o sistema Fênix e confirme o estado real do repositório'), true);
  assert.equal(isReadOnlySystemAudit('audite o Fênix e depois corrija o sistema'), false);
  assert.equal(isReadOnlySystemAudit('audit the Fenix runtime'), true);
});

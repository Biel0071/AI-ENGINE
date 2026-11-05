'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const annotations = require('../public/fenix-project-screen-annotations');

test('project preview annotation is scoped, bounded, and carries operator provenance', () => {
  const record = annotations.create({
    projectId: 'crm-demo', screenId: 'view-settings', screenName: 'Configurações', route: '/settings',
    element: { selector: '#save', tag: 'button', text: 'Salvar', html: '<button id="save">Salvar</button>' },
    note: 'Ajustar espaçamento sem alterar a ação do botão.', annotationId: 'note-01', createdAt: '2026-10-22T13:00:00.000Z'
  });

  assert.equal(record.projectId, 'crm-demo');
  assert.equal(record.screenId, 'view-settings');
  assert.deepEqual(record.element, { selector: '#save', tag: 'button', text: 'Salvar' });
  assert.equal(record.provenance.source, 'operator-preview-annotation');
  assert.ok(!Object.hasOwn(record.element, 'html'), 'raw DOM must not be copied into the annotation');

  const payload = annotations.toMemoryWrite(record);
  assert.equal(payload.stableKey, 'project-annotation:crm-demo:note-01');
  assert.equal(payload.projectId, 'crm-demo');
  assert.deepEqual(payload.provenance.evidence, ['view-settings', '/settings', '#save']);
  assert.equal(annotations.fromMemory({ ...payload, content: JSON.stringify(record) }, 'crm-demo')?.annotationId, 'note-01');
  assert.equal(annotations.fromMemory({ ...payload, content: JSON.stringify(record) }, 'other-project'), null);
});

test('project preview annotation rejects missing selection/text and bounds operator input', () => {
  assert.throws(() => annotations.create({ projectId: 'crm-demo', screenId: 'settings', note: 'A note' }), /elemento/i);
  assert.throws(() => annotations.create({ projectId: 'crm-demo', screenId: 'settings', element: { selector: '#save' }, note: '  ' }), /anotação/i);
  const record = annotations.create({
    projectId: 'crm-demo', screenId: 'settings', element: { selector: '#save' }, note: ` ${'x'.repeat(1500)} `, annotationId: 'note-02'
  });
  assert.equal(record.note.length, 1200);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const elements = new Map();
const makeElement = (id = '') => {
  const classes = new Set();
  return {
    id,
    innerText: '',
    textContent: '',
    innerHTML: '',
    className: '',
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name)
    },
    addEventListener() {},
    querySelector() { return makeElement(); }
  };
};

const document = {
  readyState: 'complete',
  addEventListener() {},
  createElement: () => makeElement(),
  getElementById(id) { return elements.get(id) || null; },
  body: {
    appendChild(element) {
      elements.set(element.id, element);
      for (const [, id] of element.innerHTML.matchAll(/id="([^"]+)"/g)) {
        if (!elements.has(id)) elements.set(id, makeElement(id));
      }
    }
  }
};
const context = {
  document,
  window: { addEventListener() {} },
  setInterval: () => 1,
  clearInterval() {},
  console
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/fenix-task-modal.js'), 'utf8'), context);

const validTask = {
  taskId: 'job-9f31',
  title: 'Revisar rota de autenticação',
  objective: 'Validar o fluxo de sessão e registrar os erros encontrados.',
  requiresApproval: true,
  status: 'APPROVAL_PENDING',
  payload: { source: 'mission-kernel' },
  agent: { id: 'agent-zai', name: 'ZAI', role: 'Atendimento', emoji: '🤖' }
};

test('approval modal displays the identified task that its action will address', () => {
  const modal = context.window.FenixTaskModal;
  assert.equal(modal.show(validTask), true);
  assert.equal(modal.activeTask.taskId, 'job-9f31');
  assert.equal(elements.get('fnxTaskId').textContent, 'job-9f31');
  assert.equal(elements.get('fnxTaskModalTitle').innerText, validTask.title);
  assert.equal(elements.get('fnxTaskModalObjective').innerText, validTask.objective);
  assert.equal(modal.overlayEl.classList.contains('active'), true);
});

test('approval modal refuses numeric, ID-only, test, or incomplete payloads', () => {
  const modal = context.window.FenixTaskModal;
  modal.hide();
  const invalidTasks = [
    { ...validTask, title: '3' },
    { ...validTask, title: validTask.taskId },
    { ...validTask, objective: '42' },
    { ...validTask, payload: { generatedBy: 'test_trigger' } },
    { ...validTask, status: 'RUNNING' },
    { ...validTask, taskId: '' }
  ];
  for (const task of invalidTasks) assert.equal(modal.show(task), false);
  assert.equal(modal.activeTask, null);
  assert.equal(modal.overlayEl.classList.contains('active'), false);
});

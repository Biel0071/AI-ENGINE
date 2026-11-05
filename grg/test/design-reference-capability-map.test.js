'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('design reference map describes the implemented IDE flow without hiding its boundaries', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/fenix-design-reference.js'), 'utf8'), context);
  const profile = context.window.FenixDesignReference.profile;
  const rows = profile.capabilityMap;
  const lovablePlan = rows.find((item) => item.product === 'Lovable' && item.capability === 'Chat de planejamento separado de implementação');
  const lovableDraft = rows.find((item) => item.product === 'Lovable' && item.capability === 'Rascunhos isolados, histórico visual, publicar e reverter');
  const miroCanvas = rows.find((item) => item.product === 'Miro' && item.capability === 'Quadros visuais editáveis, favoritos e grade/lista persistente');
  const stitchDesign = rows.find((item) => item.product === 'Stitch' && item.capability === 'DESIGN.md, crítica por voz e exportação para ferramentas');
  const lovablePreviewTools = rows.find((item) => item.product === 'Lovable' && item.capability === 'Seleção, edição inline, anotações e comentários no preview');
  const miroSidekick = rows.find((item) => item.product === 'Miro' && item.capability === 'Sidekick contextual que entende e edita o canvas');

  assert.equal(lovablePlan.status, 'PARTIAL');
  assert.match(lovablePlan.fenix, /plano.*REA.*memória|memória.*Flow Graph/i);
  assert.match(lovableDraft.fenix, /drafts?.*store.*30 minutos.*reinício.*diff.*confirmação/i);
  assert.doesNotMatch(lovableDraft.fenix, /draft temporário no processo/i);
  assert.match(lovableDraft.fenix, /histórico.*publicação.*rollback/i);
  assert.match(miroCanvas.fenix, /ordem.*navegador/i);
  assert.match(miroCanvas.fenix, /favoritos localmente/i);
  assert.match(miroCanvas.fenix, /não há quadro livre compartilhado.*sincronização.*servidor/i);
  assert.match(stitchDesign.fenix, /importa campos permitidos.*prévia\/confirmar/i);
  assert.equal(lovablePreviewTools.status, 'PARTIAL');
  assert.match(lovablePreviewTools.fenix, /seleciona elemento.*anotação do operador.*memória autenticada.*Flow Graph.*OPERATOR_NOTE/i);
  assert.match(lovablePreviewTools.fenix, /não altera o código.*edição inline.*threads de comentários não existem/i);
  assert.match(lovablePreviewTools.evidence, /preview-toolbar/);
  assert.equal(miroSidekick.status, 'PARTIAL');
  assert.match(miroSidekick.fenix, /memória.*planos.*não é lido como um quadro inteiro editável.*não modifica nós.*perguntas de esclarecimento/i);
  assert.match(miroSidekick.evidence, /39972686949266/);
  assert.equal(profile.version, '2.1', 'updated source facts must invalidate the cached profile bundle');
});

(function attachProjectScreenAnnotations(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FenixProjectScreenAnnotations = api;
})(typeof window !== 'undefined' ? window : globalThis, function createProjectScreenAnnotations() {
  'use strict';
  const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const validId = (value) => /^[\w.-]{1,100}$/.test(String(value || ''));

  function create(input = {}) {
    const projectId = clean(input.projectId, 100);
    const screenId = clean(input.screenId, 160);
    const element = input.element && typeof input.element === 'object' ? input.element : null;
    const selector = clean(element?.selector, 200);
    const note = clean(input.note, 1200);
    const annotationId = clean(input.annotationId || globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, 100);
    if (!validId(projectId)) throw new Error('Projeto inválido para a anotação.');
    if (!screenId) throw new Error('A tela precisa estar identificada para criar a anotação.');
    if (!element || !selector) throw new Error('Selecione um elemento do preview antes de anotar.');
    if (!note) throw new Error('Escreva a anotação antes de salvar.');
    if (!/^[\w.-]{1,100}$/.test(annotationId)) throw new Error('Identificador da anotação inválido.');
    return {
      version: 1,
      annotationId,
      projectId,
      screenId,
      screenName: clean(input.screenName, 160),
      route: clean(input.route, 240),
      element: {
        selector,
        tag: clean(element.tag, 32).toLowerCase(),
        text: clean(element.text, 300)
      },
      note,
      createdAt: Number.isFinite(Date.parse(input.createdAt)) ? new Date(input.createdAt).toISOString() : new Date().toISOString(),
      provenance: { source: 'operator-preview-annotation', status: 'OPERATOR_NOTE' }
    };
  }

  function toMemoryWrite(record) {
    const value = create(record);
    return {
      kind: 'project', classification: 'internal', confidence: 0.85,
      projectId: value.projectId,
      stableKey: `project-annotation:${value.projectId}:${value.annotationId}`,
      title: `Anotação visual · ${value.screenName || value.screenId}`,
      content: JSON.stringify(value),
      tags: ['project-screen-annotation', 'operator-observation', 'rea-context'],
      provenance: {
        type: value.provenance.source,
        reference: value.screenId,
        evidence: [value.screenId, value.route, value.element.selector].filter(Boolean),
        projectId: value.projectId
      }
    };
  }

  function fromMemory(memory, projectId) {
    if (!memory || memory.projectId !== projectId || typeof memory.content !== 'string') return null;
    if (!memory.stableKey?.startsWith(`project-annotation:${projectId}:`)) return null;
    try {
      const record = JSON.parse(memory.content);
      if (record.version !== 1 || record.projectId !== projectId || !validId(record.annotationId)
        || memory.stableKey !== `project-annotation:${projectId}:${record.annotationId}`
        || record.provenance?.source !== 'operator-preview-annotation') return null;
      return create(record);
    } catch (_) { return null; }
  }

  return Object.freeze({ create, toMemoryWrite, fromMemory });
});

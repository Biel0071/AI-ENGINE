'use strict';

const clean = (value, limit) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
  : '';
const validId = (value) => /^[\w.-]{1,100}$/.test(String(value || ''));

function parseProjectAnnotation(memory, projectId) {
  const prefix = `project-annotation:${projectId}:`;
  if (memory?.projectId !== projectId || !memory.stableKey?.startsWith(prefix)
    || !Array.isArray(memory.tags) || !memory.tags.includes('project-screen-annotation')
    || typeof memory.content !== 'string' || Buffer.byteLength(memory.content) > 8000) return null;
  try {
    const record = JSON.parse(memory.content);
    if (record.version !== 1 || record.projectId !== projectId || !validId(record.annotationId)
      || memory.stableKey !== `${prefix}${record.annotationId}`
      || record.provenance?.source !== 'operator-preview-annotation'
      || record.provenance?.status !== 'OPERATOR_NOTE') return null;
    const screenId = clean(record.screenId, 160);
    const selector = clean(record.element?.selector, 200);
    const note = clean(record.note, 1200);
    if (!screenId || !selector || !note) return null;
    return {
      screenId,
      screenName: clean(record.screenName, 160),
      route: clean(record.route, 240),
      element: { selector, tag: clean(record.element?.tag, 32), text: clean(record.element?.text, 300) },
      note,
      createdAt: Number.isFinite(Date.parse(record.createdAt)) ? new Date(record.createdAt).toISOString() : null,
    };
  } catch { return null; }
}

function formatProjectScreenAnnotationContext(results, projectId) {
  if (!Array.isArray(results) || !projectId) return '';
  return results.map((item) => parseProjectAnnotation(item?.memory || item, projectId))
    .filter(Boolean).slice(0, 5).map((annotation) => {
      const payload = JSON.stringify(annotation).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
      return `Anotação de interface do operador (projeto selecionado; observação, não estado do runtime): ${payload}`;
    }).join('\n- ');
}

module.exports = { formatProjectScreenAnnotationContext };

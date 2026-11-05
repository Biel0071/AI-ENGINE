(function attachDesignDocument(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FenixDesignDocument = api;
})(typeof window !== 'undefined' ? window : globalThis, function createDesignDocument() {
  const MAX_BYTES = 64 * 1024;
  const surfaces = new Set(['web', 'app']);
  const directions = new Set(['brand-preserving', 'hig-adaptive', 'data-dense', 'touch-first']);
  const viewports = new Set([375, 768, 1280, 1920]);
  const knownReferences = new Map([
    ['https://docs.lovable.dev/features/projects/editor', 'lovable-editor'],
    ['https://help.miro.com/hc/en-us/articles/360017571294-Home-page', 'miro-dashboard'],
    ['https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/', 'google-stitch-canvas']
  ]);

  function field(lines, expression) {
    const line = lines.find((item) => expression.test(item));
    if (!line) return '';
    return line.replace(expression, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  function parse(markdown) {
    if (typeof markdown !== 'string') throw new TypeError('O arquivo precisa ser texto Markdown.');
    const byteLength = typeof TextEncoder === 'function'
      ? new TextEncoder().encode(markdown).byteLength
      : Buffer.byteLength(markdown, 'utf8');
    if (byteLength > MAX_BYTES) throw new Error('O DESIGN.md excede 64 KiB.');
    const lines = markdown.split(/\r?\n/).map((line) => line.trim());
    const goal = field(lines, /^-\s*Objetivo:\s*/i);
    const surfaceAndDirection = lines.find((line) => /^-\s*Superfície:\s*/i.test(line)) || '';
    const surface = surfaceAndDirection.match(/\bsuperf[ií]cie:\s*(web|app)\b/i)?.[1]?.toLowerCase() || '';
    const direction = surfaceAndDirection.match(/\bdireção:\s*([a-z-]+)\b/i)?.[1]?.toLowerCase() || '';
    const viewportLine = field(lines, /^-\s*Viewports alvo:\s*/i);
    const targetViewports = [...new Set((viewportLine.match(/\d{2,4}/g) || []).map(Number))]
      .filter((width) => viewports.has(width));
    const evidenceId = field(lines, /^-\s*ID REA:\s*/i).slice(0, 120);
    const subjectSha256 = field(lines, /^-\s*SHA-256 do alvo:\s*/i);
    const referenceSources = [...new Set(
      [...markdown.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)]
        .map((match) => knownReferences.get(match[1]))
        .filter(Boolean)
    )];
    const preferences = {
      designGoal: goal,
      surface: surfaces.has(surface) ? surface : 'web',
      visualDirection: directions.has(direction) ? direction : 'brand-preserving',
      referenceSources,
      targetViewports
    };
    if (!goal && !surfaces.has(surface) && !directions.has(direction) && !targetViewports.length && !evidenceId) {
      throw new Error('O DESIGN.md não contém campos reconhecidos para importar com segurança.');
    }
    return {
      status: 'IMPORTED_UNVERIFIED',
      preferences,
      evidence: {
        evidenceId,
        subjectSha256: /^[a-f0-9]{64}$/i.test(subjectSha256) ? subjectSha256.toLowerCase() : ''
      }
    };
  }

  return Object.freeze({ parse, MAX_BYTES });
});

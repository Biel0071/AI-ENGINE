(function attachMemoryProvenance(root, factory) {
  const moduleApi = factory();
  if (typeof module === 'object' && module.exports) module.exports = moduleApi;
  if (root) root.FenixMemoryProvenance = moduleApi;
})(typeof window !== 'undefined' ? window : globalThis, function createMemoryProvenance() {
  'use strict';

  const COLORS = {
    'OpenAI / Codex': '#38bdf8',
    'Anthropic / Claude': '#f97316',
    'Qwen / Ollama / Fênix': '#00d9ff',
    'Misto / compartilhado': '#facc15',
    'unknown': '#93a4b8',
  };

  function resolve(node) {
    const properties = node?.properties || {};
    const provenance = properties.provenance && typeof properties.provenance === 'object' ? properties.provenance : {};
    const raw = [properties.provider, properties.aiProvider, provenance.provider, properties.origin, provenance.origin, properties.source, provenance.source]
      .find((value) => typeof value === 'string' && value.trim());
    if (!raw) return { key: null, label: null, color: COLORS.unknown };
    const value = raw.trim();
    const normalized = value.toLocaleLowerCase('pt-BR');
    let label = value;
    if (/openai|codex|chatgpt/.test(normalized)) label = 'OpenAI / Codex';
    else if (/anthropic|claude/.test(normalized)) label = 'Anthropic / Claude';
    else if (/qwen|ollama|f.nix/.test(normalized)) label = 'Qwen / Ollama / Fênix';
    else if (/shared|mixed|compartilh/.test(normalized)) label = 'Misto / compartilhado';
    const key = label === value ? `other:${normalized}` : label;
    return { key, label, color: COLORS[label] || COLORS.unknown };
  }

  function summarize(nodes) {
    const counts = new Map();
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const source = resolve(node);
      if (!source.key) continue;
      const item = counts.get(source.key) || { key: source.key, label: source.label, color: source.color, count: 0 };
      item.count += 1;
      counts.set(source.key, item);
    }
    return [...counts.values()].sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'));
  }

  return { resolve, summarize };
});

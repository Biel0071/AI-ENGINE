(function attachMemoryBrainLayout(root, factory) {
  const layout = factory();
  if (typeof module === 'object' && module.exports) module.exports = layout;
  if (root) root.FenixMemoryBrainLayout = layout;
})(typeof window !== 'undefined' ? window : globalThis, function createLayoutModule() {
  'use strict';

  function hashText(value) {
    let hash = 2166136261;
    for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function unit(seed) { return hashText(seed) / 0xffffffff; }

  function resolveLayer(id) {
    const key = String(id).toLowerCase();
    if (key.includes('project')) return 1;
    if (key.includes('agent')) return 2;
    if (key.includes('mission') || key.includes('task')) return 3;
    if (key.includes('job') || key.includes('runtime')) return 4;
    if (key.includes('tool') || key.includes('mcp')) return 5;
    if (key.includes('memory') || key.includes('knowledge') || key.includes('pattern')) return 6;
    if (key.includes('decision') || key.includes('ledger') || key.includes('rule')) return 7;
    return (hashText(`${key}:layer`) % 7) + 1;
  }

  function createBrainPosition(id) {
    const key = String(id);
    const hemisphere = (hashText(`${key}:hemisphere`) & 1) ? 'right' : 'left';
    const sign = hemisphere === 'right' ? 1 : -1;
    const u = unit(`${key}:u`);
    const v = unit(`${key}:v`);
    const depth = Math.cbrt(unit(`${key}:r`));
    const directionY = 2 * u - 1;
    const ring = Math.sqrt(Math.max(0, 1 - directionY * directionY));
    const directionX = ring * Math.cos(2 * Math.PI * v);
    const directionZ = ring * Math.sin(2 * Math.PI * v);
    const fold = Math.sin(7 * v + 4 * directionY + (sign > 0 ? 0.55 : 0)) * 0.045;
    const radialDepth = depth * (1 + fold);
    const layer = resolveLayer(key);
    const layerShift = (layer - 4) * 0.06;
    const transverse = Math.max(18, Math.min(88, 70 + directionX * 55 * depth + layerShift * 10));
    const y = directionY * 100 * radialDepth + Math.sin(3 * v + directionY * 5) * 3.5 * radialDepth;
    const z = directionZ * 78 * radialDepth + Math.sin(9 * v + directionY * 3) * 2.5 * radialDepth;
    const lobe = directionY > 0.35 ? 'frontal'
      : directionY < -0.35 ? 'occipital'
        : directionZ > 0 ? 'parietal' : 'temporal';

    const rawX = sign * Math.max(25, transverse * 1.4);
    const rawY = Math.max(-128, Math.min(128, y * 1.25 + layerShift * 5));
    const rawZ = Math.max(-108, Math.min(108, z * 1.35 + layerShift * 3));

    return {
      x: rawX,
      y: rawY,
      z: rawZ,
      hemisphere,
      lobe,
      layer,
    };
  }

  function selectVisibleNodes(nodes, edges, selectedId, limit = 500) {
    const source = Array.isArray(nodes) ? nodes : [];
    const max = Math.max(0, Math.floor(Number(limit) || 0));
    if (source.length <= max) return source.slice();
    const selected = source.find((node) => node?.id === selectedId);
    if (!selected || max === 0) return source.slice(0, max);
    const byId = new Map(source.map((node) => [node?.id, node]));
    const adjacency = new Map(source.map((node) => [node?.id, new Set()]));
    const chosen = [selected];
    const seen = new Set([selected.id]);
    const neighborIds = new Set();
    for (const edge of Array.isArray(edges) ? edges : []) {
      if (!byId.has(edge?.from) || !byId.has(edge?.to)) continue;
      adjacency.get(edge.from).add(edge.to);
      adjacency.get(edge.to).add(edge.from);
      if (edge?.from !== selectedId && edge?.to !== selectedId) continue;
      const neighborId = edge.from === selectedId ? edge.to : edge.from;
      if (byId.has(neighborId) && neighborId !== selectedId) neighborIds.add(neighborId);
    }
    const neighbors = [...neighborIds].sort();
    const neighborBudget = neighbors.length <= max - 1
      ? neighbors.length
      : Math.floor((max - 1) * 0.02);
    for (let index = 0; index < neighborBudget; index += 1) {
      const neighbor = byId.get(neighbors[Math.floor(index * neighbors.length / neighborBudget)]);
      if (neighbor && !seen.has(neighbor.id)) { chosen.push(neighbor); seen.add(neighbor.id); }
    }
    let frontier = chosen.slice(1).map((node) => node.id);
    while (frontier.length && chosen.length < max) {
      const next = [];
      for (const id of frontier) {
        for (const neighborId of [...(adjacency.get(id) || [])].sort()) {
          if (neighborId === selectedId || neighborIds.has(neighborId) || seen.has(neighborId)) continue;
          const node = byId.get(neighborId);
          if (!node) continue;
          chosen.push(node);
          seen.add(neighborId);
          next.push(neighborId);
          if (chosen.length >= max) break;
        }
        if (chosen.length >= max) break;
      }
      frontier = next;
    }
    const fallback = source.filter((node) => !seen.has(node?.id) && !neighborIds.has(node?.id));
    const remaining = max - chosen.length;
    for (let index = 0; index < remaining && fallback.length; index += 1) {
      const node = fallback[Math.floor(index * fallback.length / remaining)];
      if (node && !seen.has(node.id)) { chosen.push(node); seen.add(node.id); }
    }
    return chosen;
  }

  function uniqueVisualRelations(nodes, edges) {
    const ids = new Set((Array.isArray(nodes) ? nodes : []).map((node) => node?.id));
    const seen = new Set();
    const result = [];
    for (const edge of Array.isArray(edges) ? edges : []) {
      if (!ids.has(edge?.from) || !ids.has(edge?.to)) continue;
      const a = String(edge.from), b = String(edge.to);
      const key = a <= b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(edge);
    }
    return result;
  }

  function selectVisibleRelations(nodes, edges, selectedId, limit = 60) {
    const max = Math.max(0, Math.floor(Number(limit) || 0));
    if (!max) return [];
    const unique = uniqueVisualRelations(nodes, edges);
    const focus = unique.filter((edge) => edge.from === selectedId || edge.to === selectedId);
    const context = unique.filter((edge) => edge.from !== selectedId && edge.to !== selectedId);
    const focusBudget = Math.min(focus.length, 8);
    if (unique.length <= max && focus.length <= focusBudget) return unique;
    const contextBudget = max - focusBudget;
    const sample = (items, count) => {
      if (count >= items.length) return items.slice();
      return Array.from({ length: count }, (_, index) => items[Math.floor((index + 0.5) * items.length / count)]);
    };
    return [...sample(focus, focusBudget), ...sample(context, contextBudget)];
  }

  function groupNeighborRelations(edges, selectedId) {
    const byNeighbor = new Map();
    for (const edge of Array.isArray(edges) ? edges : []) {
      if (edge?.from !== selectedId && edge?.to !== selectedId) continue;
      const id = edge.from === selectedId ? edge.to : edge.from;
      if (typeof id !== 'string' || id === selectedId) continue;
      let group = byNeighbor.get(id);
      if (!group) { group = { id, count: 0, types: new Set() }; byNeighbor.set(id, group); }
      group.count += 1;
      if (edge.type) group.types.add(String(edge.type));
    }
    return [...byNeighbor.values()].map(({ id, count, types }) => ({ id, count, types: [...types].sort() }));
  }

  function summarizeConnections(nodes, edges, selectedId) {
    const ids = new Set((Array.isArray(nodes) ? nodes : []).map((node) => node?.id).filter((id) => typeof id === 'string'));
    const relationList = (Array.isArray(edges) ? edges : []).filter((edge) => ids.has(edge?.from) && ids.has(edge?.to));
    const adjacency = new Map([...ids].map((id) => [id, new Set()]));
    for (const edge of relationList) {
      adjacency.get(edge.from).add(edge.to);
      adjacency.get(edge.to).add(edge.from);
    }
    const isolatedIds = [...adjacency].filter(([, neighbors]) => neighbors.size === 0).map(([id]) => id);
    const selectedNeighbors = adjacency.get(selectedId) || new Set();
    return {
      nodeCount: ids.size,
      relationCount: relationList.length,
      isolatedCount: isolatedIds.length,
      isolatedIds,
      selectedRelationCount: relationList.filter((edge) => edge.from === selectedId || edge.to === selectedId).length,
      selectedNeighborIds: [...selectedNeighbors],
    };
  }

  return { createBrainPosition, groupNeighborRelations, selectVisibleNodes, selectVisibleRelations, summarizeConnections, uniqueVisualRelations };
});

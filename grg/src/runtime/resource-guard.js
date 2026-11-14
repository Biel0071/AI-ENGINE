'use strict';
// Guarda de RAM antes de carregar um modelo local. Mede, não estima: lê MemAvailable de
// /proc/meminfo e o tamanho real do modelo no Ollama. Sem leitura (Windows, /proc ausente,
// Ollama sem /api/tags) o resultado é UNKNOWN e não bloqueia — inventar um número seria pior.
const fs = require('node:fs');

function parseMeminfo(text) {
  const kb = {};
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^(\w+):\s+(\d+)\s*kB/);
    if (m) kb[m[1]] = Number(m[2]);
  }
  if (!Number.isFinite(kb.MemTotal) || !Number.isFinite(kb.MemAvailable)) return null;
  const mb = (v) => Math.round(v / 1024);
  const swapTotal = Number.isFinite(kb.SwapTotal) ? kb.SwapTotal : 0;
  const swapFree = Number.isFinite(kb.SwapFree) ? kb.SwapFree : 0;
  return { totalMb: mb(kb.MemTotal), availableMb: mb(kb.MemAvailable), swapTotalMb: mb(swapTotal), swapUsedMb: mb(swapTotal - swapFree) };
}

function readMeminfo(path = '/proc/meminfo') {
  try { return parseMeminfo(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

function checkModelMemory({ meminfo, modelBytes, loaded, marginMb = 512 }) {
  if (loaded) return { ok: true, status: 'LOADED', reason: 'model already resident in Ollama' };
  if (!meminfo || !Number.isFinite(modelBytes) || modelBytes <= 0) return { ok: true, status: 'UNKNOWN', reason: 'available memory or model size could not be measured' };
  const requiredMb = Math.round(modelBytes / (1024 * 1024)) + Number(marginMb || 0);
  const ok = meminfo.availableMb >= requiredMb;
  return { ok, status: ok ? 'OK' : 'INSUFFICIENT', requiredMb, availableMb: meminfo.availableMb, reason: ok ? null : `needs ${requiredMb} MB available, only ${meminfo.availableMb} MB` };
}

// Tamanho do modelo e se ele já está carregado, direto do Ollama. Falha de rede => desconhecido.
async function probeModel(baseUrl, model, fetchImpl = globalThis.fetch, timeoutMs = 3000) {
  const get = async (path) => {
    const res = await fetchImpl(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const result = { modelBytes: null, loaded: false };
  try {
    const tags = await get('/api/tags');
    const found = Array.isArray(tags?.models) ? tags.models.find((m) => m.name === model || m.model === model) : null;
    if (found && Number.isFinite(Number(found.size))) result.modelBytes = Number(found.size);
  } catch { /* unknown */ }
  try {
    const ps = await get('/api/ps');
    result.loaded = Array.isArray(ps?.models) && ps.models.some((m) => m.name === model || m.model === model);
  } catch { /* unknown */ }
  return result;
}

module.exports = { parseMeminfo, readMeminfo, checkModelMemory, probeModel };
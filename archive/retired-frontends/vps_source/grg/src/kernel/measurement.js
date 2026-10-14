// Regra 2 do FENIX: nenhum endpoint pode retornar metrica simulada.
// Se um valor nao pode ser medido, ele volta como UNKNOWN com motivo e pendencia registrada.
// Nunca inventar valores. Nunca apresentar simulacao como telemetria de producao.

const MEASURED = 'measured';
const UNKNOWN = 'unknown';

// Valor medido de fonte real. `source` identifica de onde veio (obrigatorio).
function measured(value, source, extra = {}) {
  if (!source) throw new Error('measured() requires a source identifying the real origin');
  return { state: MEASURED, value, source, ...extra };
}

// Valor indisponivel. Nao ha `value` — quem consome nao pode confundir com zero.
function unknown(reason, pending = null) {
  if (!reason) throw new Error('unknown() requires a reason');
  return { state: UNKNOWN, value: null, reason, ...(pending ? { pending } : {}) };
}

// Executa um coletor real; se falhar, devolve unknown com o erro — nunca um fallback inventado.
async function collect(source, fn, { pending = null, timeoutMs = 2_000 } = {}) {
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`collector timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    const value = await Promise.race([fn(), timeout]);
    if (value === undefined || value === null) return unknown(`${source} returned no value`, pending);
    return measured(value, source);
  } catch (error) {
    return unknown(`${source} unavailable: ${error.message}`, pending);
  } finally {
    clearTimeout(timer);
  }
}

function isMeasured(entry) {
  return Boolean(entry) && entry.state === MEASURED;
}

function valueOf(entry, fallback = null) {
  return isMeasured(entry) ? entry.value : fallback;
}

// Percorre um relatorio e lista tudo que nao pudemos medir. Alimenta a FASE 14 (evidencias):
// sem medicao real nao se promove capability, e a pendencia fica visivel em vez de escondida.
function pendencies(report, path = '') {
  const out = [];
  if (!report || typeof report !== 'object') return out;
  if (report.state === UNKNOWN) {
    out.push({ field: path || '(root)', reason: report.reason, pending: report.pending || null });
    return out;
  }
  if (report.state === MEASURED) return out;
  for (const [key, value] of Object.entries(report)) {
    if (value && typeof value === 'object') out.push(...pendencies(value, path ? `${path}.${key}` : key));
  }
  return out;
}

// Resumo de confiabilidade de um relatorio: quantos campos sao telemetria real.
function coverage(report) {
  let total = 0; let real = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.state === MEASURED) { total += 1; real += 1; return; }
    if (node.state === UNKNOWN) { total += 1; return; }
    for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value);
  };
  walk(report);
  return { fields: total, measured: real, unknown: total - real, ratio: total ? Number((real / total).toFixed(4)) : 0 };
}

module.exports = { MEASURED, UNKNOWN, measured, unknown, collect, isMeasured, valueOf, pendencies, coverage };

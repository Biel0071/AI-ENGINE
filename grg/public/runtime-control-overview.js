(function attachRuntimeControlOverview(root, factory) {
  const view = factory();
  if (typeof module === 'object' && module.exports) module.exports = view;
  if (root) root.FenixRuntimeControlOverview = view;
})(typeof window !== 'undefined' ? window : globalThis, function createRuntimeControlOverview() {
  'use strict';

  const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const display = (value) => value === null ? '—' : value.toLocaleString('pt-BR');

  function renderRuntimeControlOverview(fullStatus) {
    const runtime = fullStatus?.runtime || {};
    const queue = runtime.queue || {};
    const queueMeasured = queue.status === 'MEASURED';
    const queueMetrics = [
      ['Na fila', count(queue.queued)],
      ['Em execução', count(queue.running)],
      ['Concluídos', count(queue.completed)],
      ['Com falha', count(queue.failed)]
    ];
    const measuredQueueTotal = queueMetrics.reduce((sum, [, value]) => sum + (value ?? 0), 0);
    const queueCard = queueMeasured
      ? `<article class="runtime-overview-card" aria-labelledby="runtimeQueueTitle">
          <div class="runtime-overview-card-head"><span aria-hidden="true">⚙️</span><div><h2 id="runtimeQueueTitle">Fila de jobs</h2><small>${display(count(queue.total) ?? measuredQueueTotal)} jobs registrados</small></div><span class="runtime-overview-state">MEDIDO</span></div>
          <div class="runtime-overview-metrics">${queueMetrics.map(([label, value]) => `<div class="runtime-overview-metric"><div><span>${label}</span><strong>${display(value)}</strong></div>${value === null ? '<span class="runtime-overview-no-sample">Sem amostra</span>' : `<progress aria-label="Jobs ${label.toLocaleLowerCase('pt-BR')}: ${value}" max="${Math.max(1, measuredQueueTotal)}" value="${Math.min(value, Math.max(1, measuredQueueTotal))}"></progress>`}</div>`).join('')}</div>
          <p class="runtime-overview-source">Fonte: estado de jobs do runtime</p>
        </article>`
      : `<article class="runtime-overview-card runtime-overview-empty" aria-labelledby="runtimeQueueTitle"><div class="runtime-overview-card-head"><span aria-hidden="true">⚙️</span><div><h2 id="runtimeQueueTitle">Fila de jobs</h2><small>Fila sem medição</small></div><span class="runtime-overview-state">${displayStatus(queue.status)}</span></div><p>A API não forneceu contagens verificáveis nesta leitura.</p></article>`;

    const agents = runtime.agents || {};
    const agentTotal = count(agents.total);
    const working = count(agents.working);
    const idle = count(agents.idle);
    const agentsMeasured = agentTotal !== null;
    const agentMetrics = [['Trabalhando', working], ['Disponíveis', idle]];
    const agentCard = agentsMeasured
      ? `<article class="runtime-overview-card" aria-labelledby="runtimeAgentsTitle">
          <div class="runtime-overview-card-head"><span aria-hidden="true">🤖</span><div><h2 id="runtimeAgentsTitle">Agentes</h2><small>${display(agentTotal)} agentes registrados</small></div><span class="runtime-overview-state">MEDIDO</span></div>
          <div class="runtime-overview-metrics">${agentMetrics.map(([label, value]) => `<div class="runtime-overview-metric"><div><span>${label}</span><strong>${display(value)}</strong></div>${value === null ? '<span class="runtime-overview-no-sample">Sem amostra</span>' : `<progress aria-label="Agentes ${label.toLocaleLowerCase('pt-BR')}: ${value}" max="${Math.max(1, agentTotal)}" value="${Math.min(value, Math.max(1, agentTotal))}"></progress>`}</div>`).join('')}</div>
          <p class="runtime-overview-source">Fonte: runtime e estado persistido</p>
        </article>`
      : `<article class="runtime-overview-card runtime-overview-empty" aria-labelledby="runtimeAgentsTitle"><div class="runtime-overview-card-head"><span aria-hidden="true">🤖</span><div><h2 id="runtimeAgentsTitle">Agentes</h2><small>Agentes sem medição</small></div><span class="runtime-overview-state">NÃO MEDIDO</span></div><p>A API não forneceu uma contagem verificável nesta leitura.</p></article>`;

    return `<section class="runtime-overview" aria-label="Resumo visual do runtime">${queueCard}${agentCard}</section>`;
  }

  function displayStatus(value) {
    return typeof value === 'string' && /^[A-Z_]{1,32}$/.test(value) ? value : 'PENDENTE';
  }

  return { renderRuntimeControlOverview };
});

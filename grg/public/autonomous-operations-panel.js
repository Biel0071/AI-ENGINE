'use strict';
/**
 * FÊNIX OS — Level 26: Autonomous Operations Panel
 * ===================================================
 * Single Source of Truth interactive frontend panel for:
 * 1. Current Autonomous Evolution Cycle (Engine State, Discoveries, Tasks)
 * 2. Work Queue & DAG Pipeline (Backlog, Prioritized P0-P7, Executing, Review, Approval, Completed)
 * 3. Multi-Agent Team (Available, Working, Reviewing, Blocked, Offline, Workload)
 * 4. Software Evolution (Bugs Fixed, Features, Projects Evolved, Tests Passed, Regressions, Patterns)
 * 5. Economy & Budget (Tokens, Cost by Provider, Cost per Task, Duration per Agent, ROI)
 *
 * 100% Zero-Mock Compliance: All data is hydrated from /api/v2/autonomous/v26/operations.
 * Unmeasured initial slots display the honest absence marker ('—').
 */

(function () {
  const state = {
    loading: false,
    data: null,
    error: null,
    lastFetchedAt: null
  };

  function getAuthHeader() {
    const token = window.localStorage?.getItem('grg_token') ||
                  window.localStorage?.getItem('fenix_token') ||
                  window.sessionStorage?.getItem('grg_token') ||
                  (document.cookie.match(/fenix_session=([^;]+)/) || [])[1] || '';
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status} em ${endpoint}`);
    }
    return res.json();
  }

  async function loadData() {
    state.loading = true;
    try {
      const json = await apiFetch('/api/v2/autonomous/v26/operations');
      state.data = json;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
    } catch (err) {
      state.error = err.message;
    } finally {
      state.loading = false;
      render();
    }
  }

  async function triggerCycle() {
    const btn = document.getElementById('fnxAutoOpBtnTriggerCycle');
    if (btn) btn.disabled = true;
    try {
      if (window.FenixToast) window.FenixToast.show('Disparando ciclo autônomo de 10 passos...', 'info', 2000);
      await apiFetch('/api/v2/autonomous/v26/cycle', { method: 'POST', body: '{}' });
      if (window.FenixToast) window.FenixToast.show('Ciclo autônomo concluído e verificado com sucesso!', 'success', 2500);
      await loadData();
    } catch (err) {
      if (window.FenixToast) window.FenixToast.show(`Falha no ciclo: ${err.message}`, 'error', 3500);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function approveTask(taskId) {
    try {
      await apiFetch(`/api/v2/autonomous/v26/tasks/${encodeURIComponent(taskId)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Aprovado via painel Autonomous Operations' })
      });
      if (window.FenixToast) window.FenixToast.show(`Tarefa ${taskId} aprovada com sucesso!`, 'success', 2000);
      await loadData();
    } catch (err) {
      if (window.FenixToast) window.FenixToast.show(`Erro: ${err.message}`, 'error', 3000);
    }
  }

  async function rejectTask(taskId) {
    const reason = (typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt('Motivo da rejeição:') : null) || 'Rejeitado pelo operador';
    try {
      await apiFetch(`/api/v2/autonomous/v26/tasks/${encodeURIComponent(taskId)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      if (window.FenixToast) window.FenixToast.show(`Tarefa ${taskId} rejeitada.`, 'warning', 2000);
      await loadData();
    } catch (err) {
      if (window.FenixToast) window.FenixToast.show(`Erro: ${err.message}`, 'error', 3000);
    }
  }

  function render() {
    const target = document.getElementById('fenixAutonomousOperationsTarget');
    if (!target) return;

    if (!state.data && state.loading) {
      target.innerHTML = `
        <div style="padding:28px; text-align:center; color:#94A3B8; font-size:13px; font-family:var(--fenix-font-sans, system-ui, sans-serif);">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#00D9FF; margin-right:8px; animation:pulse 1.5s infinite;"></span>
          Sincronizando telemetria operacional autônoma...
        </div>
      `;
      return;
    }

    const d = state.data;
    const cur = d?.currentCycle;
    const q = d?.workQueue;
    const team = d?.team;
    const evo = d?.evolution;
    const eco = d?.economy;

    target.innerHTML = `
      <div class="fenix-auto-ops-container" style="display:flex; flex-direction:column; gap:16px; width:100%; color:#F8FAFC; font-family:var(--fenix-font-sans, system-ui, sans-serif);">
        <!-- Top Operational Header & Controls -->
        <div style="background:rgba(8,12,20,0.85); border:1px solid rgba(0,217,255,0.25); border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:10px; font-weight:800; color:#00D9FF; letter-spacing:0.08em; text-transform:uppercase;">FÊNIX OS · LEVEL 26</div>
            <h2 style="margin:2px 0 0; font-size:18px; font-weight:800; color:#F8FAFC; display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">🧭</span> AUTONOMOUS OPERATIONS (OPERAÇÃO AUTÔNOMA CONTÍNUA)
            </h2>
            <div style="font-size:11px; color:#94A3B8; margin-top:4px;">
              Ciclo 24/7 de auto-observação, descoberta, planejamento em DAG, priorização P0-P7, delegação, execução e validação real.
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button id="fnxAutoOpBtnTriggerCycle" type="button" onclick="window.FenixAutonomousOperations.triggerCycle()" style="background:linear-gradient(135deg, #00D9FF, #0284C7); border:none; color:#050810; font-weight:800; font-size:12px; padding:8px 14px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <span>⚡</span> Disparar Ciclo (10 Passos)
            </button>
            <button type="button" onclick="window.FenixAutonomousOperations.loadData()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#F8FAFC; font-weight:600; font-size:12px; padding:8px 12px; border-radius:6px; cursor:pointer;">
              ↻ Atualizar
            </button>
          </div>
        </div>

        ${state.error ? `
          <div style="padding:12px 16px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:8px; color:#F87171; font-size:12px;">
            ⚠️ Falha na leitura de telemetria: ${state.error}
          </div>
        ` : ''}

        <!-- 5 Canonical Operational Cards Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
          
          <!-- CARD 1: CICLO ATUAL -->
          <article style="background:rgba(10,15,26,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <strong style="font-size:13px; color:#F8FAFC; display:flex; align-items:center; gap:6px;">🔄 1. Ciclo Atual</strong>
              <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; background:${cur?.engineState === 'ACTIVE' || cur?.engineState === 'RUNNING' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)'}; color:${cur?.engineState === 'ACTIVE' || cur?.engineState === 'RUNNING' ? '#10B981' : '#94A3B8'};">
                ${cur?.engineState || '—'}
              </span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#CBD5E1;">
              <div style="display:flex; justify-content:space-between;"><span>Ciclo Atual:</span> <strong>#${cur?.cycleCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Último Início:</span> <strong>${cur?.lastCycleAt ? new Date(cur.lastCycleAt).toLocaleTimeString('pt-BR') : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Próximo Previsto:</span> <strong>${cur?.nextCyclePredictedAt ? new Date(cur.nextCyclePredictedAt).toLocaleTimeString('pt-BR') : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Duração:</span> <strong>${cur?.durationMs ? cur.durationMs + 'ms' : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Descobertas:</span> <strong>${cur?.discoveriesCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Tarefas Criadas:</span> <strong>${cur?.tasksCreatedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Tarefas Concluídas:</span> <strong>${cur?.tasksCompletedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Tarefas Bloqueadas:</span> <strong>${cur?.tasksBlockedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Falhas / Retentativas:</span> <strong>${cur?.failuresAndRetries ?? '—'}</strong></div>
            </div>
          </article>

          <!-- CARD 2: FILA DE TRABALHO -->
          <article style="background:rgba(10,15,26,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <strong style="font-size:13px; color:#F8FAFC; display:flex; align-items:center; gap:6px;">📋 2. Fila de Trabalho</strong>
              <span style="font-size:10px; font-weight:700; color:#38BDF8;">${q?.total ?? '—'} tarefas</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#CBD5E1;">
              <div style="display:flex; justify-content:space-between;"><span>Backlog Geral:</span> <strong>${q?.backlogCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Priorizadas (P0-P7):</span> <strong>${q?.prioritizedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Aguardando Agente:</span> <strong>${q?.awaitingAgentCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Em Execução (Jobs):</span> <strong>${q?.executingCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Em Revisão por Pares:</span> <strong>${q?.inReviewCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between; color:${(q?.awaitingApprovalCount || 0) > 0 ? '#F59E0B' : 'inherit'};">
                <span>Aguardando Aprovação Humana:</span> <strong>${q?.awaitingApprovalCount ?? '—'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between;"><span>Concluídas e Validadas:</span> <strong>${q?.completedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Falhas Definitivas:</span> <strong>${q?.failedCount ?? '—'}</strong></div>
            </div>
          </article>

          <!-- CARD 3: EQUIPE DE AGENTES -->
          <article style="background:rgba(10,15,26,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <strong style="font-size:13px; color:#F8FAFC; display:flex; align-items:center; gap:6px;">👥 3. Equipe de Agentes</strong>
              <span style="font-size:10px; font-weight:700; color:#10B981;">${Array.isArray(team?.agents) ? team.agents.length : '—'} ativos</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#CBD5E1;">
              <div style="display:flex; justify-content:space-between;"><span>Disponíveis (AVAILABLE):</span> <strong style="color:#10B981;">${team?.availableCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Trabalhando (WORKING):</span> <strong style="color:#00D9FF;">${team?.busyCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Em Revisão (REVIEWING):</span> <strong style="color:#A855F7;">${team?.reviewingCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Bloqueados (BLOCKED):</span> <strong style="color:#EF4444;">${team?.blockedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Desconectados (OFFLINE):</span> <strong>${team?.offlineCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Supervisão / Roteamento:</span> <strong>Orchestrator</strong></div>
            </div>
          </article>

          <!-- CARD 4: EVOLUÇÃO DO SOFTWARE -->
          <article style="background:rgba(10,15,26,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <strong style="font-size:13px; color:#F8FAFC; display:flex; align-items:center; gap:6px;">🧬 4. Evolução do Software</strong>
              <span style="font-size:10px; font-weight:700; color:#A855F7;">Factual</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#CBD5E1;">
              <div style="display:flex; justify-content:space-between;"><span>Bugs Corrigidos:</span> <strong>${evo?.bugsFixedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Features Implementadas:</span> <strong>${evo?.featuresImplementedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Projetos Evoluídos:</span> <strong>${evo?.projectsEvolvedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Testes Aprovados:</span> <strong>${evo?.testsPassedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Regressões Detectadas:</span> <strong>${evo?.regressionsDetectedCount ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Padrões Reutilizados:</span> <strong>${evo?.patternsReusedCount ?? '—'}</strong></div>
            </div>
          </article>

          <!-- CARD 5: ECONOMIA & CUSTOS -->
          <article style="background:rgba(10,15,26,0.9); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
              <strong style="font-size:13px; color:#F8FAFC; display:flex; align-items:center; gap:6px;">💰 5. Economia &amp; Custos</strong>
              <span style="font-size:10px; font-weight:700; color:#25D366;">Zero-Waste</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; color:#CBD5E1;">
              <div style="display:flex; justify-content:space-between;"><span>Tokens Consumidos:</span> <strong>${eco?.tokensConsumed ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Teto do Período:</span> <strong>${eco?.tokensMaxPeriod ?? '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Custo Acumulado:</span> <strong>${eco?.totalCostUsd !== undefined ? '$' + Number(eco.totalCostUsd).toFixed(4) : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Teto em USD:</span> <strong>${eco?.costMaxPeriodUsd !== undefined ? '$' + Number(eco.costMaxPeriodUsd).toFixed(2) : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>ROI de Evolução:</span> <strong>${eco?.roiMetric ? eco.roiMetric + ' proj/$' : '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Provedor VPS:</span> <strong>${eco?.costByProvider?.['api-platform-vps']?.status || '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Antigravity Bridge:</span> <strong>${eco?.costByProvider?.['antigravity']?.status || '—'}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Codex CLI:</span> <strong>${eco?.costByProvider?.['codex']?.status || '—'}</strong></div>
            </div>
          </article>

        </div>

        <!-- Section: Human Approvals & Pending Critical Tasks -->
        ${Array.isArray(q?.items) && q.items.some(t => t.status === 'AWAITING_APPROVAL') ? `
          <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:14px 18px;">
            <div style="font-size:13px; font-weight:800; color:#F59E0B; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
              <span>⚠️</span> TAREFAS AGUARDANDO APROVAÇÃO DO OPERADOR (HUMAN APPROVAL GATE)
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${q.items.filter(t => t.status === 'AWAITING_APPROVAL').map(t => `
                <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(245,158,11,0.2); border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#F8FAFC;">${t.title}</div>
                    <div style="font-size:10px; color:#94A3B8; margin-top:2px;">ID: ${t.taskId} · Risco: <strong>${t.risk}</strong> · Projeto: <strong>${t.projectId}</strong></div>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button type="button" onclick="window.FenixAutonomousOperations.approveTask('${t.taskId}')" style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); color:#10B981; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">
                      ✓ Aprovar
                    </button>
                    <button type="button" onclick="window.FenixAutonomousOperations.rejectTask('${t.taskId}')" style="background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#EF4444; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">
                      ✕ Rejeitar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // Inicialização e binding ao ecossistema Fênix
  window.FenixAutonomousOperations = {
    loadData,
    triggerCycle,
    approveTask,
    rejectTask,
    render
  };

  // Carrega ao iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    setTimeout(loadData, 500);
  }
})();

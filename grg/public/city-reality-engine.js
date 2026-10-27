/**
 * FÊNIX OS — CITY REALITY ENGINE (SPATIAL AGENT OS RUNTIME)
 *
 * Orquestra as 3 Camadas Canônicas:
 * Layer 1: Cidade = Corpo (Mundo 2.5D Isométrico, 14 Distritos, Prédios, Cutaways)
 * Layer 2: Rede Cognitiva = Cérebro & Sistema Nervoso (Grafo Interativo Vis.js)
 * Layer 3: Operação = Mãos (IDE, Terminal, Missões Reais)
 *
 * Suporte de Primeira Classe para Empresas: Depósito Mais, iDrinks, AI ENGINE, etc.
 * Contextual Command Center & Modular Bottom Dock.
 */
(function() {
  'use strict';

  function getAuthToken() {
    return localStorage.getItem('fenix_token') ||
           localStorage.getItem('grg_token') ||
           sessionStorage.getItem('fenix_token') ||
           sessionStorage.getItem('grg_token') ||
           '';
  }

  async function fetchSystemEventHistory() {
    const token = getAuthToken();
    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const fetchFn = window.fenixAuthedFetch || fetch;
    const response = await fetchFn('/api/v2/events/history?limit=100', {
      credentials: 'same-origin',
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.events)) throw new Error('A API não retornou uma lista de eventos.');
    const ignoredTypes = new Set(['snapshot', 'runtime.snapshot', 'status', 'ping', 'heartbeat', 'connected']);
    data.events = data.events.filter((event) => {
      const type = String(event?.type || event?.event || event?.eventType || '').toLowerCase();
      return type && !ignoredTypes.has(type);
    }).sort((left, right) => {
      const leftAt = Date.parse(left?.occurredAt || left?.timestamp || left?.createdAt || '') || 0;
      const rightAt = Date.parse(right?.occurredAt || right?.timestamp || right?.createdAt || '') || 0;
      return rightAt - leftAt;
    });
    return data;
  }

  class CityRealityEngine {
    constructor() {
      this.companies = [];
      this.activeCompanyId = null;
      this.activeCompany = null;
      this.networkData = null;
      this.networkInstance = null;
      this.activeDockTab = 'grid4';
      this.isNetworkMode = false;
      this.pollTimer = null;
      this.events = null;
      this.latestEvent = null;

      this.init();
    }

    async init() {
      console.log('[CityRealityEngine] Initializing Spatial Agent OS...');
      this.bindEvents();
      await this.loadCompanies();
      await this.refreshContextualPanel();
      await this.refreshBottomDock();

      // Inicia polling leve a cada 15 segundos
      this.pollTimer = setInterval(() => {
        if (document.hidden || !document.getElementById('view-city')?.classList.contains('active') || this._polling) return;
        this._polling = true;
        Promise.allSettled([
          this.refreshContextualPanel(true),
          this.refreshBottomDock(true),
        ]).finally(() => { this._polling = false; });
      }, 15000);
    }

    bindEvents() {
      // Monitora clique nos botões de modo da cidade
      const modeTabs = document.getElementById('fenixCityModeTabs');
      if (modeTabs) {
        modeTabs.addEventListener('click', (e) => {
          const btn = e.target.closest('.fenix-pill-tab');
          if (!btn) return;
          const id = btn.id;
          if (id === 'btnCityModeNetwork') {
            this.setMode('network');
          } else if (id === 'btnCityModeWorld') {
            this.setMode('world');
          }
        });
      }

      document.addEventListener('fenix-live', (event) => {
        const detail = event.detail || {};
        const type = String(detail.type || '').toLowerCase();
        if (!['runtime-event', 'event-stream'].includes(String(detail.source || ''))) return;
        if (!type || ['snapshot', 'runtime.snapshot', 'status', 'ping', 'pong', 'heartbeat', 'connected'].includes(type)) return;
        this.latestEvent = detail;
        this.renderLatestEventTicker(detail);
      });
    }

    renderLatestEventTicker(event) {
      const type = String(event?.type || event?.event || 'Evento do sistema');
      const payload = event?.data || event?.payload || {};
      const description = event?.message || event?.summary || payload.message || payload.title || '';
      const label = [type, description].filter(Boolean).join(' · ').slice(0, 120);
      for (const id of ['tickerKernelStatus', 'tickerKernelStatus2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = label;
      }
    }

    setMode(mode) {
      const netContainer = document.getElementById('fenixCognitiveNetworkContainer');
      const worldArea = document.getElementById('cityCanvas');
      const netBtn = document.getElementById('btnCityModeNetwork');
      const worldBtn = document.getElementById('btnCityModeWorld');

      if (mode === 'network') {
        this.isNetworkMode = true;
        if (netContainer) netContainer.classList.add('active');
        if (netBtn) netBtn.classList.add('active');
        if (worldBtn) worldBtn.classList.remove('active');
        this.renderCognitiveNetwork();
      } else {
        this.isNetworkMode = false;
        if (netContainer) netContainer.classList.remove('active');
        if (netBtn) netBtn.classList.remove('active');
        if (worldBtn && !document.querySelector('.fenix-pill-tab.active')) {
          worldBtn.classList.add('active');
        }
      }
    }

    async loadCompanies() {
      try {
        const token = getAuthToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v2/company/list', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.companies) && data.companies.length > 0) {
            this.companies = data.companies;
          }
          this.renderCompanyStrip();
        }
      } catch (err) {
        console.warn('[CityRealityEngine] Falha ao carregar empresas:', err);
      }
    }

    renderCompanyStrip() {
      const pill = document.getElementById('fenixActiveCompanyPill');
      const comp = this.activeCompany || (this.activeCompanyId ? this.companies.find(c => c.companyId === this.activeCompanyId) : null);
      if (pill) {
        if (comp) {
          const agentsCount = comp.telemetry?.agentsCount != null ? comp.telemetry.agentsCount : '—';
          pill.innerHTML = `<i class="ph-bold ${comp.icon || 'ph-cpu'}"></i> <span>${comp.name}</span> <span class="chip-badge">${agentsCount}</span>`;
        } else {
          pill.innerHTML = `<i class="ph-bold ph-globe"></i> <span>Visão Geral</span>`;
        }
      }
    }

    async selectCompany(companyId) {
      if (!companyId) return;
      const targetId = String(companyId).trim().toLowerCase();
      this.activeCompanyId = companyId;

      if (companyId === 'ALL') {
        window.fenixPanToDistrict?.('ALL');
        this.renderCompanyStrip();
        return;
      }

      let comp = this.companies.find(c =>
        c.companyId.toLowerCase() === targetId ||
        (c.projectId && c.projectId.toLowerCase() === targetId) ||
        (c.name && c.name.toLowerCase() === targetId)
      );

      if (comp) {
        this.activeCompany = comp;
        this.activeCompanyId = comp.companyId;
        if (window.GlobalSelectionStore) {
          window.GlobalSelectionStore.select('company', comp.companyId, comp);
        }
        this.renderCompanyStrip();
        this.renderContextualPanel();

        // Foca a câmera do 2.5D no distrito/prédio da empresa
        if (comp.district && typeof window.fenixPanToDistrict === 'function') {
          window.fenixPanToDistrict(comp.district);
        } else if (comp.headquartersBuildingId && window.fenixCity?.focusBuilding) {
          window.fenixCity.focusBuilding(comp.headquartersBuildingId);
        }

        // Sincroniza estado com Fenix City e dispara evento global
        if (window.fenixCity) {
          window.fenixCity.state.selectedCompanyId = comp.companyId;
          window.fenixCity.updateBreadcrumbs?.();
        }
        window.dispatchEvent(new CustomEvent('fenix:company-selected', { detail: { companyId: comp.companyId, company: comp } }));

        // Abre na Right Sidebar Unificada
        window.fenixOpenSystemInspector?.(comp.companyId);
        await this.refreshContextualPanel();
      }
    }

    async refreshContextualPanel(silent = false) {
      if (!this.activeCompanyId || this.activeCompanyId === 'ALL') return;

      try {
        const token = getAuthToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/v2/company/info/${encodeURIComponent(this.activeCompanyId)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          this.activeCompany = data.company || this.activeCompany;
          this.renderContextualPanel();
        }
      } catch (err) {
        if (!silent) console.warn('[CityRealityEngine] Falha ao atualizar painel contextual:', err);
      }
    }

    renderContextualPanel() {
      const comp = this.activeCompany;
      if (!comp) return;

      const titleEl = document.getElementById('cmdPanelTitle');
      const segmentEl = document.getElementById('cmdPanelSegment');
      const metaEl = document.getElementById('cmdPanelMeta');
      const heroNameEl = document.getElementById('cmdHeroName');
      const heroBadgeEl = document.getElementById('cmdHeroBadge');
      const heroIconEl = document.getElementById('cmdHeroIcon');

      if (titleEl) titleEl.textContent = comp.name;
      if (segmentEl) segmentEl.textContent = comp.segment || 'Empresa Operacional';
      if (metaEl) metaEl.textContent = comp.location || 'Fênix Metropolis';
      if (heroNameEl) heroNameEl.textContent = comp.name;
      if (heroBadgeEl) heroBadgeEl.textContent = comp.district ? `DISTRITO ${comp.district.toUpperCase()}` : 'OPERACIONAL';
      if (heroIconEl) heroIconEl.className = `cmd-hero-banner-icon ph-fill ${comp.icon || 'ph-warehouse'}`;

      // 6 KPI Cards
      const kpiAgents = document.getElementById('cmdKpiAgents');
      const kpiPerf = document.getElementById('cmdKpiPerf');
      const kpiOps = document.getElementById('cmdKpiOps');
      const kpiProjects = document.getElementById('cmdKpiProjects');
      const kpiMissions = document.getElementById('cmdKpiMissions');
      const kpiRevenue = document.getElementById('cmdKpiRevenue');

      const telem = comp.telemetry || {};
      if (kpiAgents) kpiAgents.textContent = telem.agentsCount ? `${telem.agentsCount} ativos` : '—';
      if (kpiPerf) kpiPerf.textContent = telem.performance ? `${telem.performance}%` : '—';
      if (kpiOps) kpiOps.textContent = telem.operationsCount ? `${telem.operationsCount}` : '—';
      if (kpiProjects) kpiProjects.textContent = telem.projectsCount !== undefined ? `${telem.projectsCount}` : '—';
      if (kpiMissions) kpiMissions.textContent = telem.missionsCount !== undefined ? `${telem.missionsCount}` : '—';
      if (kpiRevenue) kpiRevenue.textContent = telem.revenueMonthly || '—';

      // Análise Fênix
      const fenixText = document.getElementById('cmdFenixText');
      if (fenixText) {
        if (comp.recommendations && comp.recommendations.length > 0) {
          fenixText.innerHTML = `<strong>Diagnóstico Fênix:</strong> ${comp.recommendations[0]}<br><span style="color:#00D9FF; font-size:10.5px;">Sugestão autônoma pronta para despacho.</span>`;
        } else {
          fenixText.innerHTML = `<strong>Diagnóstico Fênix:</strong> Sem diagnóstico registrado para esta empresa.`;
        }
      }
    }

    refreshBottomDock(silent = false) {
      if (this._bottomDockRefresh) return this._bottomDockRefresh;
      this._bottomDockRefresh = this._refreshBottomDock(silent).finally(() => {
        this._bottomDockRefresh = null;
      });
      return this._bottomDockRefresh;
    }

    async _refreshBottomDock(silent = false) {
      try {
        const token = getAuthToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        let stateData = null;
        const fetchFn = window.fenixAuthedFetch || fetch;
        const requestOptions = { credentials: 'same-origin', headers, signal: AbortSignal.timeout(12000) };

        const [healthRes, telemetryRes] = await Promise.allSettled([
          fetchFn('/api/v2/system/health', requestOptions),
          fetchFn('/api/v2/telemetry/live', requestOptions)
        ]);

        let healthData = {};
        if (healthRes.status === 'fulfilled' && healthRes.value?.ok) {
          healthData = await healthRes.value.json();
        }

        let telemetryData = null;
        if (telemetryRes.status === 'fulfilled' && telemetryRes.value?.ok) {
          const responseData = await telemetryRes.value.json();
          if (responseData?.ok) telemetryData = responseData;
        }

        // Hydrate hardware gauges and ticker immediately (~150ms) before slow city state finishes
        if (telemetryData || healthData.status) {
          const initialStateData = window.FENIX?.cityWorld?.snapshot || this.lastStateData || null;
          this.updateTopbarAndFooter(initialStateData, healthData, this.events, {
            health: healthRes.status === 'fulfilled' && Boolean(healthRes.value?.ok),
            state: Boolean(initialStateData),
            events: this.events !== null,
            telemetry: telemetryData !== null,
          }, telemetryData || {});
        }

        const [eventsRes] = await Promise.allSettled([fetchSystemEventHistory()]);
        stateData = window.FENIX?.cityWorld?.snapshot || this.lastStateData || null;
        if (stateData) this.lastStateData = stateData;

        let events = null;
        if (eventsRes.status === 'fulfilled') events = eventsRes.value.events;
        this.events = events;
        window.__fenixSystemEvents = events;
        window.__fenixSystemEventsError = events === null ? eventsRes.reason?.message || 'API indisponível' : null;
        window.fenixRenderAlerts?.();

        this.renderBottomDockContent(stateData, healthData);
        this.updateTopbarAndFooter(stateData, healthData, events, {
          health: healthRes.status === 'fulfilled' && Boolean(healthRes.value?.ok),
          state: Boolean(window.FENIX?.cityWorld?.snapshot),
          events: events !== null,
          telemetry: telemetryData !== null,
        }, telemetryData || {});
      } catch (err) {
        if (!silent) console.warn('[CityRealityEngine] Falha ao atualizar Bottom Dock:', err);
      }
    }

    renderBottomDockContent(data, healthData = {}) {
      const hasAgentSnapshot = Array.isArray(data?.agents);
      const hasJobSnapshot = Array.isArray(data?.recentJobs);
      const agents = hasAgentSnapshot ? data.agents : [];
      const jobs = hasJobSnapshot ? data.recentJobs : [];
      const badgeAgents = document.getElementById('dockBadgeAgents');
      const badgeMissions = document.getElementById('dockBadgeMissions');

      if (badgeAgents) badgeAgents.textContent = hasAgentSnapshot ? agents.length : '—';
      if (badgeMissions) badgeMissions.textContent = hasJobSnapshot ? jobs.length : '—';
      const agentStatusDot = document.getElementById('dockAgentsStatusDot');
      if (agentStatusDot) {
        const hasOnlineAgent = hasAgentSnapshot && agents.some((agent) => /ONLINE|AVAILABLE|IDLE|WORKING|BUSY|RUNNING/.test(String(agent.status || agent.state || '').toUpperCase()));
        agentStatusDot.classList.toggle('online', hasOnlineAgent);
        agentStatusDot.dataset.state = !hasAgentSnapshot ? 'unavailable' : hasOnlineAgent ? 'online' : 'idle';
      }

      const grid4 = document.getElementById('dock4GridContainer');
      const carousel = document.getElementById('dockCarouselContainer');

      if (this.activeDockTab === 'grid4') {
        if (grid4) grid4.style.display = 'grid';
        if (carousel) carousel.style.display = 'none';

        // Window 1: Mapa Global
        const tag = document.getElementById('dockActiveDistrictTag');
        if (tag) {
          tag.textContent = this.activeCompany ? (this.activeCompany.name.toUpperCase()) : 'DISTRITOS';
        }
        // Window 2: Agentes Conectados
        const agentsCount = document.getElementById('dockCardAgentsCount');
        if (agentsCount) agentsCount.textContent = hasAgentSnapshot ? agents.length : '—';
        const agentsList = document.getElementById('dockCardAgentsList');
        if (agentsList) {
          if (!hasAgentSnapshot) {
            agentsList.innerHTML = '<div style="color:#64748B; font-size:10px; padding:4px;">Agentes indisponíveis nesta leitura.</div>';
          } else if (agents.length === 0) {
            agentsList.innerHTML = '<div style="color:#64748B; font-size:10px; padding:4px;">Nenhum agente publicado pela API.</div>';
          } else {
            let html = '';
            for (const ag of agents.slice(0, 15)) {
              const isWorking = ag.status === 'WORKING';
              const taskDialogue = ag.currentTask || ag.assignedTask || ag.status || 'Sem atividade publicada pela API';
              html += `
                <div class="dock-mini-agent-row" onclick="window.fenixCity?.focusAgent?.('${ag.id}')" title="Focar agente ${ag.name}">
                  <div class="dock-mini-agent-left">
                    <span style="font-size:13px;">${ag.avatar || '🤖'}</span>
                    <span class="dock-mini-agent-name">${ag.name}</span>
                  </div>
                  <div class="dock-mini-agent-task" title="${taskDialogue}">
                    <span style="color:${isWorking ? '#10B981' : '#94A3B8'};">●</span> "${taskDialogue}"
                  </div>
                </div>
              `;
            }
            agentsList.innerHTML = html;
          }
        }

        // Window 3: Edifício Cutaway
        const cutawayTitle = document.getElementById('dockCutawayTitle');
        if (cutawayTitle) cutawayTitle.textContent = this.activeCompany ? this.activeCompany.name : '—';
        const cutawayContent = document.getElementById('dockCutawayContent');
        if (cutawayContent) {
          if (this.activeCompany) {
            cutawayContent.innerHTML = `
              <div class="dock-cutaway-preview-box">
                <div class="dock-cutaway-room-layer">
                  <div class="dock-room-badge"><i class="ph-bold ${this.activeCompany.icon || 'ph-buildings'}" style="color:${this.activeCompany.color || '#00D9FF'};"></i> ${this.activeCompany.name}</div>
                  <div class="dock-room-details">${this.activeCompany.segment || '—'} · ${this.activeCompany.location || '—'}</div>
                </div>
              </div>
            `;
          } else {
            cutawayContent.innerHTML = `
              <div class="dock-cutaway-preview-box">
                <div style="padding:12px; font-size:12px; color:var(--text-muted, #94a3b8); text-align:center;">Nenhuma empresa selecionada.</div>
              </div>
            `;
          }
        }

        // Window 4: Missões
        const missionsCount = document.getElementById('dockCardMissionsCount');
        if (missionsCount) missionsCount.textContent = hasJobSnapshot ? jobs.length : '—';
        const missionsList = document.getElementById('dockCardMissionsList');
        if (missionsList) {
          if (!hasJobSnapshot) {
            missionsList.innerHTML = '<div style="color:#64748B; font-size:10px; padding:4px;">Jobs indisponíveis nesta leitura.</div>';
          } else if (jobs.length === 0) {
            missionsList.innerHTML = '<div style="color:#64748B; font-size:10px; padding:4px;">Nenhum job publicado pela API.</div>';
          } else {
            let html = '';
            for (const job of jobs.slice(0, 10)) {
              const isRunning = job.status === 'RUNNING';
              const progress = Number.isFinite(job.progress) ? Math.max(0, Math.min(100, job.progress)) : null;
              html += `
                <div class="dock-mini-mission-row" onclick="window.fenixSelectJob?.('${job.id}')" title="Job: ${job.title || job.id}">
                  <div class="dock-mission-top-row">
                    <span class="dock-mission-name">${job.title || job.id}</span>
                    <span class="dock-mission-status-pill" style="color:${isRunning ? '#00D9FF' : '#94A3B8'};">${job.status || '—'}</span>
                  </div>
                  <div class="dock-mission-bar">
                    <div class="dock-mission-fill" style="width:${progress ?? 0}%;"></div>
                  </div>
                </div>
              `;
            }
            missionsList.innerHTML = html;
          }
        }
      } else {
        // Focused single-tab mode
        if (grid4) grid4.style.display = 'none';
        if (carousel) carousel.style.display = 'flex';

        if (this.activeDockTab === 'agents') {
          let html = '';
          for (const ag of agents) {
            const isWorking = ag.status === 'WORKING';
            html += `
              <div class="dock-agent-chip" onclick="window.fenixCity?.focusAgent?.('${ag.id}')">
                <span style="font-size:16px;">${ag.avatar || '🤖'}</span>
                <div style="display:flex; flex-direction:column; gap:1px;">
                  <div style="font-size:11px; font-weight:700; color:#F8FAFC;">${ag.name}</div>
                  <div style="font-size:9.5px; color:${isWorking ? '#10B981' : '#94A3B8'};">
                    ${ag.status || ag.state || 'Estado não informado'} · ${ag.role || 'Agente'}
                  </div>
                </div>
              </div>
            `;
          }
          carousel.innerHTML = !hasAgentSnapshot
            ? '<div style="color:#64748B; font-size:11px;">Agentes indisponíveis nesta leitura.</div>'
            : html || '<div style="color:#64748B; font-size:11px;">Nenhum agente publicado pela API.</div>';
        } else if (this.activeDockTab === 'missions') {
          let html = '';
          for (const job of jobs.slice(0, 10)) {
            const isRunning = job.status === 'RUNNING';
            html += `
              <div class="dock-mission-chip" onclick="window.fenixSelectJob?.('${job.id}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:10.5px; font-weight:700; color:#F8FAFC; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${job.title || job.id}
                  </span>
                  <span style="font-size:8.5px; color:${isRunning ? '#22D3EE' : /COMPLETED|SUCCEEDED|DONE/.test(String(job.status || '').toUpperCase()) ? '#34D399' : /FAIL|ERROR/.test(String(job.status || '').toUpperCase()) ? '#FB7185' : '#94A3B8'}; font-weight:700;">
                    ${job.status}
                  </span>
                </div>
                <div style="font-size:9px; color:#94A3B8;">Agente: ${job.agentId || '—'}</div>
                  <div style="height:3px; background:rgba(255,255,255,0.08); border-radius:2px; margin-top:2px;">
                    <div style="height:100%; width:${Number.isFinite(job.progress) ? Math.max(0, Math.min(100, job.progress)) : 0}%; opacity:${Number.isFinite(job.progress) ? 1 : 0}; background:${isRunning ? '#00D9FF' : '#10B981'}; border-radius:2px;"></div>
                </div>
              </div>
            `;
          }
          carousel.innerHTML = !hasJobSnapshot
            ? '<div style="color:#64748B; font-size:11px;">Jobs indisponíveis nesta leitura.</div>'
            : html || '<div style="color:#64748B; font-size:11px;">Nenhum job publicado pela API.</div>';
        } else if (this.activeDockTab === 'cutaway') {
          carousel.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; padding:4px 8px;">
              <i class="ph-bold ph-door-open" style="font-size:24px; color:#00D9FF;"></i>
              <div>
                <div style="font-weight:700; font-size:11.5px; color:#F8FAFC;">Edifício Cutaway: Andar 2 (Living Office)</div>
                <div style="font-size:10px; color:#94A3B8;">Estações com dual-screen, code runners e agentes em desenvolvimento ativo.</div>
              </div>
              <button class="cmd-action-btn primary" style="padding:4px 12px; font-size:10px;" onclick="window.fenixCity?.navigateToLevel?.('building', 'dev-loft')">
                Entrar no Andar
              </button>
            </div>
          `;
        } else if (this.activeDockTab === 'map') {
          carousel.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; overflow-x:auto;">
              <button class="cmd-action-btn secondary" style="font-size:10px; padding:4px 8px;" onclick="window.fenixPanToDistrict?.('command-center')">Central</button>
              <button class="cmd-action-btn secondary" style="font-size:10px; padding:4px 8px;" onclick="window.fenixPanToDistrict?.('industrial')">Industrial</button>
              <button class="cmd-action-btn secondary" style="font-size:10px; padding:4px 8px;" onclick="window.fenixPanToDistrict?.('dev-district')">Dev</button>
              <button class="cmd-action-btn secondary" style="font-size:10px; padding:4px 8px;" onclick="window.fenixPanToDistrict?.('ai-district')">IA Core</button>
              <button class="cmd-action-btn secondary" style="font-size:10px; padding:4px 8px;" onclick="window.fenixPanToDistrict?.('ALL')">Ver Todos</button>
            </div>
          `;
        }
      }
    }

    updateTopbarAndFooter(data, healthData = {}, events = null, availability = {}, telemetryData = {}) {
      data = data || window.FENIX?.cityWorld?.snapshot || this.lastStateData || null;
      const agents = Array.isArray(data?.agents) ? data.agents : null;
      const jobs = Array.isArray(data?.recentJobs) ? data.recentJobs : null;

      // Topbar pills
      const topbarAgents = document.getElementById('topbarAgentsPill');
      if (topbarAgents) topbarAgents.textContent = `${agents ? agents.length : '—'} Agentes`;

      const topbarMissions = document.getElementById('topbarMissionsPill');
      const activeJobStatuses = new Set(['ACTIVE', 'RUNNING', 'DISPATCHED', 'EXECUTING', 'IN_PROGRESS']);
      const measuredJobs = Number.isFinite(healthData.activeJobs)
        ? healthData.activeJobs
        : jobs?.filter((job) => activeJobStatuses.has(String(job?.status || job?.state || '').toUpperCase())).length;
      if (topbarMissions) topbarMissions.textContent = `${measuredJobs ?? '—'} Jobs na fila`;

      const topbarMeetings = document.getElementById('topbarMeetingsPill');
      if (topbarMeetings) topbarMeetings.textContent = `— Reuniões`;

      const topbarHealth = document.getElementById('topbarSystemHealthPill');
      if (topbarHealth) topbarHealth.textContent = healthData.status ? `${healthData.status} Sistema` : 'Indisponível';

      const topbarWeather = document.getElementById('topbarWeatherPill');
      if (topbarWeather) {
        topbarWeather.textContent = 'Clima —';
        const icon = document.getElementById('topbarWeatherIcon');
        if (icon) icon.className = 'ph-bold ph-cloud';
      }

      // Footer hardware gauges
      const alertBtn = document.getElementById('footerAlertCount');
      if (alertBtn) alertBtn.textContent = `Eventos (${Array.isArray(events) ? events.length : '—'})`;

      const cpuFill = document.getElementById('gaugeCpuFill');
      const cpuVal = document.getElementById('gaugeCpuVal');
      const memFill = document.getElementById('gaugeMemFill');
      const memVal = document.getElementById('gaugeMemVal');
      const diskFill = document.getElementById('gaugeDiskFill');
      const diskVal = document.getElementById('gaugeDiskVal');
      const netFill = document.getElementById('gaugeNetFill');
      const netVal = document.getElementById('gaugeNetVal');

      const cpuPercent = telemetryData.cpu?.percent ?? healthData.hostTelemetry?.cpu?.percent ?? healthData.system?.cpu ?? healthData.cpuPercent ?? null;
      const usedRamMb = telemetryData.memory?.usedMb ?? healthData.system?.ram ?? healthData.memory?.usedMb ?? healthData.hostTelemetry?.memory?.usedMb;
      const totalRamMb = telemetryData.memory?.totalMb ?? healthData.system?.totalRamMb ?? healthData.memory?.totalMb ?? healthData.hostTelemetry?.memory?.totalMb;
      const memPercent = telemetryData.memory?.usedPercent ?? healthData.hostTelemetry?.memory?.usedPercent ?? healthData.memPercent
        ?? (Number.isFinite(usedRamMb) && Number.isFinite(totalRamMb) && totalRamMb > 0 ? Math.round(usedRamMb / totalRamMb * 100) : null);
      const diskPercent = telemetryData.disk?.usedPercent ?? healthData.hostTelemetry?.disk?.usedPercent ?? healthData.diskPercent ?? null;
      const networkBitsPerSecond = telemetryData.network?.throughputBps ?? healthData.hostTelemetry?.network?.throughput ?? healthData.netSpeed ?? null;
      const netIfaces = telemetryData.network?.interfaceCount ?? healthData.hostTelemetry?.network?.interfaceCount ?? null;
      const netSpeed = Number.isFinite(networkBitsPerSecond)
        ? networkBitsPerSecond >= 1_000_000 ? `${(networkBitsPerSecond / 1_000_000).toFixed(1)} Mbps` : `${(networkBitsPerSecond / 1_000).toFixed(1)} Kbps`
        : (Number.isFinite(netIfaces) ? `${netIfaces} IF` : null);

      const setGauge = (fill, value, percent, label) => {
        if (fill) fill.style.width = Number.isFinite(percent) ? `${Math.max(0, Math.min(100, percent))}%` : '0%';
        if (value) value.textContent = label == null ? '—' : String(label);
      };

      setGauge(cpuFill, cpuVal, cpuPercent, Number.isFinite(cpuPercent) ? `${cpuPercent}%` : null);

      setGauge(memFill, memVal, memPercent, Number.isFinite(memPercent) ? `${memPercent}%` : null);

      setGauge(diskFill, diskVal, diskPercent, Number.isFinite(diskPercent) ? `${diskPercent}%` : null);

      setGauge(netFill, netVal, Number.isFinite(netIfaces) ? Math.min(100, netIfaces * 25) : null, netSpeed);

      const host = healthData.vps?.host || healthData.host || telemetryData.system?.platform || null;
      for (const id of ['tickerHost', 'tickerHost2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = host || 'Indisponível';
      }
      for (const id of ['tickerCpu', 'tickerCpu2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = Number.isFinite(cpuPercent) ? `${cpuPercent}%` : '—';
      }
      for (const id of ['tickerRam', 'tickerRam2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = Number.isFinite(memPercent) ? `${memPercent}%` : (Number.isFinite(usedRamMb) ? `${usedRamMb}MB` : '—');
      }
      const resolvedProjects = data?.metrics?.projectsCount ?? (Array.isArray(data?.projects) ? data.projects.length : null);
      for (const id of ['tickerProjects', 'tickerProjects2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = resolvedProjects !== null && resolvedProjects !== undefined ? String(resolvedProjects) : '—';
      }
      const resolvedAgents = data?.metrics?.registeredAgents ?? (Array.isArray(agents) ? agents.length : null);
      for (const id of ['tickerAgents', 'tickerAgents2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = resolvedAgents !== null && resolvedAgents !== undefined ? String(resolvedAgents) : '—';
      }
      const resolvedJobs = measuredJobs !== undefined && measuredJobs !== null
        ? measuredJobs
        : (availability.telemetry || availability.health ? 0 : null);
      for (const id of ['tickerJobs', 'tickerJobs2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = resolvedJobs !== null ? String(resolvedJobs) : '—';
      }
      const resolvedMachines = Array.isArray(data?.machines) ? data.machines.length : null;
      for (const id of ['tickerMachines', 'tickerMachines2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = resolvedMachines !== null ? String(resolvedMachines) : '—';
      }
      const uptimeFormatted = telemetryData.system?.uptimeFormatted
        || (telemetryData.system?.uptimeHours ? `${telemetryData.system.uptimeHours}h` : null)
        || healthData.uptimeFormatted
        || (Number.isFinite(healthData.uptimeSeconds) ? `${Math.floor(healthData.uptimeSeconds / 3600)}h` : null);
      for (const id of ['tickerUptime', 'tickerUptime2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = uptimeFormatted || '—';
      }

      const tickerState = document.getElementById('fenixTickerStatus');
      const tickerStateText = document.getElementById('fenixTickerState');
      const isHealthAvailable = availability.health || Boolean(healthData.status);
      const isApiAvailable = isHealthAvailable || availability.events || availability.state || availability.telemetry;
      const stateText = isHealthAvailable ? String(healthData.status || 'ONLINE').toUpperCase() : isApiAvailable ? 'ONLINE' : 'INDISPONÍVEL';
      if (tickerState) {
        tickerState.dataset.state = isHealthAvailable ? (String(healthData.status).toLowerCase() === 'online' || String(healthData.status).toLowerCase() === 'healthy' ? 'online' : 'degraded') : isApiAvailable ? 'online' : 'unavailable';
        tickerState.title = isHealthAvailable ? 'Status recebido de /api/v2/system/health' : isApiAvailable ? 'Runtime conectado' : 'Sem resposta da API do Fênix';
      }
      if (tickerStateText) tickerStateText.textContent = stateText;

      for (const id of ['tickerFastLane', 'tickerFastLane2']) {
        const element = document.getElementById(id);
        if (element) element.textContent = healthData.fastLane?.status || telemetryData.fastLane?.status || (isApiAvailable ? 'ONLINE' : 'INDISPONÍVEL');
      }

      if (Array.isArray(events) && events.length) {
        this.latestEvent = this.latestEvent || events[0];
        this.renderLatestEventTicker(this.latestEvent);
      } else if (!this.latestEvent) {
        const emptyState = Array.isArray(events) ? 'SEM EVENTOS REGISTRADOS' : 'EVENTOS INDISPONÍVEIS';
        for (const id of ['tickerKernelStatus', 'tickerKernelStatus2']) {
          const element = document.getElementById(id);
          if (element) element.textContent = emptyState;
        }
      }
    }

    setDockTab(tab) {
      this.activeDockTab = tab;
      const tabs = document.querySelectorAll('.dock-nav-tab');
      tabs.forEach(t => {
        if (t.getAttribute('data-dock') === tab) t.classList.add('active');
        else t.classList.remove('active');
      });
      this.refreshBottomDock();
    }

    // ─── LAYER 2: COGNITIVE NETWORK GRAPH (CANVAS FORCE-DIRECTED ENGINE) ───
    async renderCognitiveNetwork() {
      const container = document.getElementById('networkCanvasArea');
      if (!container) return;

      try {
        const token = getAuthToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v2/living-city/network-graph', { headers });
        if (!res.ok) return;

        const data = await res.json();
        this.networkData = data;

        this.initCanvasGraph(container, data);
      } catch (err) {
        console.warn('[CityRealityEngine] Falha ao carregar grafo cognitivo:', err);
      }
    }

    initCanvasGraph(container, data) {
      container.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.id = 'cognitiveNetworkCanvas';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.cursor = 'grab';
      container.appendChild(canvas);

      const width = container.clientWidth > 0 ? container.clientWidth : Math.max(300, window.innerWidth - 450);
      const height = container.clientHeight > 0 ? container.clientHeight : Math.max(300, window.innerHeight - 150);
      canvas.width = width * (window.devicePixelRatio ? window.devicePixelRatio : 1);
      canvas.height = height * (window.devicePixelRatio ? window.devicePixelRatio : 1);

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio ? window.devicePixelRatio : 1;
      ctx.scale(dpr, dpr);

      // Node spatial layout initialization
      const nodes = data.nodes.map((n, i) => {
        let angle = (i / data.nodes.length) * Math.PI * 2;
        let radius = 180 + (i % 4) * 45;
        if (n.category === 'agents') radius = 110 + (i % 3) * 35;
        else if (n.category === 'memory') radius = 220;
        else if (n.category === 'skills') radius = 280;

        return {
          ...n,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: n.type === 'AGENT' ? 14 : (n.type === 'MEMORY' ? 12 : 10)
        };
      });

      const nodeMap = new Map();
      nodes.forEach(n => nodeMap.set(n.id, n));

      const edges = data.edges.map(e => ({
        source: nodeMap.get(e.from),
        target: nodeMap.get(e.to),
        relation: e.relation,
        color: e.color || 'rgba(0, 217, 255, 0.25)',
        pulseOffset: Math.random()
      })).filter(e => e.source && e.target);

      this.activeGraph = { canvas, ctx, nodes, edges, width, height, activeCategory: 'all' };

      let isDragging = false;
      let draggedNode = null;
      let hoveredNode = null;

      const getPos = (evt) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
      };

      canvas.addEventListener('mousedown', (e) => {
        const p = getPos(e);
        draggedNode = nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < n.radius + 6);
        if (draggedNode) {
          isDragging = true;
          canvas.style.cursor = 'grabbing';
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        const p = getPos(e);
        if (isDragging && draggedNode) {
          draggedNode.x = p.x;
          draggedNode.y = p.y;
        } else {
          hoveredNode = nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < n.radius + 6);
          canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
        }
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
        draggedNode = null;
        if (canvas) canvas.style.cursor = 'grab';
      });

      canvas.addEventListener('click', (e) => {
        const p = getPos(e);
        const clicked = nodes.find(n => Math.hypot(n.x - p.x, n.y - p.y) < n.radius + 6);
        if (clicked) {
          this.onNodeClick(clicked);
        }
      });

      // Simulation loop
      let animId;
      const simulate = () => {
        if (!document.getElementById('fenixCognitiveNetworkContainer')?.classList.contains('active')) {
          cancelAnimationFrame(animId);
          return;
        }

        // Physics: Repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < 180) {
              const f = (180 - dist) * 0.008;
              nodes[i].vx -= (dx / dist) * f;
              nodes[i].vy -= (dy / dist) * f;
              nodes[j].vx += (dx / dist) * f;
              nodes[j].vy += (dy / dist) * f;
            }
          }
        }

        // Physics: Edge attraction
        for (const edge of edges) {
          const dx = edge.target.x - edge.source.x;
          const dy = edge.target.y - edge.source.y;
          const dist = Math.hypot(dx, dy) || 1;
          const targetDist = 90;
          const f = (dist - targetDist) * 0.004;
          edge.source.vx += (dx / dist) * f;
          edge.source.vy += (dy / dist) * f;
          edge.target.vx -= (dx / dist) * f;
          edge.target.vy -= (dy / dist) * f;
        }

        // Center gravity & damping
        const cx = width / 2;
        const cy = height / 2;
        for (const node of nodes) {
          if (node === draggedNode) continue;
          node.vx += (cx - node.x) * 0.0015;
          node.vy += (cy - node.y) * 0.0015;
          node.vx *= 0.88;
          node.vy *= 0.88;
          node.x += node.vx;
          node.y += node.vy;
        }

        // Render
        ctx.clearRect(0, 0, width, height);

        // Draw edges
        const now = Date.now() * 0.001;
        for (const edge of edges) {
          const isFilterMatch = this.activeGraph.activeCategory === 'all' ||
            edge.source.category === this.activeGraph.activeCategory ||
            edge.target.category === this.activeGraph.activeCategory;
          if (!isFilterMatch) continue;

          ctx.beginPath();
          ctx.moveTo(edge.source.x, edge.source.y);
          ctx.lineTo(edge.target.x, edge.target.y);
          ctx.strokeStyle = edge.color;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Flow particle
          const t = (now + edge.pulseOffset * 3) % 2 / 2;
          const px = edge.source.x + (edge.target.x - edge.source.x) * t;
          const py = edge.source.y + (edge.target.y - edge.source.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#00D9FF';
          ctx.shadowColor = '#00D9FF';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Draw nodes
        for (const node of nodes) {
          const isFilterMatch = this.activeGraph.activeCategory === 'all' || node.category === this.activeGraph.activeCategory;
          const isHovered = node === hoveredNode;

          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * (isHovered ? 1.3 : 1), 0, Math.PI * 2);

          const col = node.color || '#00D9FF';
          ctx.fillStyle = isFilterMatch ? col : 'rgba(100, 116, 139, 0.3)';
          ctx.shadowColor = isFilterMatch ? col : 'transparent';
          ctx.shadowBlur = isHovered ? 20 : (isFilterMatch ? 10 : 0);
          ctx.fill();

          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
          ctx.restore();

          // Label
          if (isFilterMatch || isHovered) {
            ctx.fillStyle = isHovered ? '#00D9FF' : '#E2E8F0';
            ctx.font = `${isHovered ? 'bold ' : ''}11px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(node.label, node.x, node.y + node.radius + 14);
          }
        }

        animId = requestAnimationFrame(simulate);
      };

      simulate();
    }

    onNodeClick(node) {
      console.log('[CityRealityEngine] Selected node:', node);
      if (node.type === 'AGENT') {
        const rawId = node.id.replace('agent:', '');
        this.setMode('world');
        window.fenixCity?.focusAgent?.(rawId);
      } else if (node.type === 'MISSION') {
        const rawId = node.id.replace('mission:', '');
        window.fenixSelectJob?.(rawId);
      }
    }

    filterNetwork(category) {
      if (!this.activeGraph) return;
      this.activeGraph.activeCategory = category;

      const btns = document.querySelectorAll('.network-filter-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-cat') === category) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    // ─── QUICK ACTIONS & CONTEXTUAL CHAT ──────────────────────────────────
    async executeQuickAction(actionType) {
      const comp = this.activeCompany || {};
      const token = getAuthToken();
      const headers = { 'content-type': 'application/json' };
      if (token) headers['authorization'] = `Bearer ${token}`;

      if (actionType === 'optimize_dispatch') {
        alert(`⚡ Otimização de Despacho disparada para ${comp.name || 'a empresa'}.\nAgente de Logística rebalanceando docas.`);
        await fetch('/api/missions', {
          method: 'POST',
          headers,
          body: JSON.stringify({ goal: `Otimizar despacho e docas de carregamento da empresa ${comp.name}` })
        });
        this.refreshBottomDock();
      } else if (actionType === 'sales_report') {
        alert(`📊 Gerando Relatório Comercial & Faturamento para ${comp.name || 'a empresa'}...`);
        await fetch('/api/missions', {
          method: 'POST',
          headers,
          body: JSON.stringify({ goal: `Gerar relatório comercial e consolidar vendas de ${comp.name}` })
        });
        this.refreshBottomDock();
      } else if (actionType === 'inspect_dock') {
        this.setMode('world');
        const bldId = comp?.headquartersBuildingId || comp?.buildingId;
        if (bldId) {
          window.fenixCity?.navigateToLevel?.('building', bldId);
        }
      }
    }

    async sendContextualCommand() {
      const input = document.getElementById('cmdChatInput');
      if (!input || !input.value.trim()) return;

      const prompt = input.value.trim();
      input.value = '';

      const fenixText = document.getElementById('cmdFenixText');
      if (fenixText) {
        fenixText.innerHTML = `<em>Fênix processando: "${prompt}"...</em>`;
      }

      try {
        const token = getAuthToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v2/company/ceo/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ prompt, companyId: this.activeCompanyId })
        });

        if (res.ok) {
          const data = await res.json();
          if (fenixText) {
            const reply = typeof data.reply === 'string' ? data.reply : typeof data.response === 'string' ? data.response : '';
            fenixText.textContent = reply ? `Resposta Fênix: ${reply}` : 'A API respondeu sem conteúdo. O comando pode não ter sido executado.';
          }
        } else {
          if (fenixText) {
            fenixText.textContent = `Falha ao enviar o comando à API (HTTP ${res.status}).`;
          }
        }
      } catch (err) {
        if (fenixText) {
          fenixText.textContent = `Falha de comunicação com a API: ${err.message || 'serviço indisponível'}.`;
        }
      }
    }
  }

  window.fenixCityReality = new CityRealityEngine();
  window.fenixSelectCompany = (id) => window.fenixCityReality?.selectCompany(id);
  window.fenixFilterNetwork = (cat) => window.fenixCityReality?.filterNetwork(cat);
  window.fenixDockTab = (tab) => window.fenixCityReality?.setDockTab(tab);
  window.fenixQuickAction = (act) => window.fenixCityReality?.executeQuickAction(act);
  window.fenixSendCmd = () => window.fenixCityReality?.sendContextualCommand();
  window.fenixSetPromptChip = (text) => {
    const input = document.getElementById('cmdChatInput');
    if (input) {
      input.value = text;
      input.focus();
    }
  };
  window.fenixShowAlertsModal = async () => {
    const modal = document.getElementById('fenixAlertsModal');
    if (modal) {
      modal.style.display = 'flex';
      const list = document.getElementById('fenixAlertsModalList');
      if (list) list.textContent = 'Consultando eventos reais da API…';
      try {
        const result = await fetchSystemEventHistory();
        window.__fenixSystemEvents = result.events;
        window.__fenixSystemEventsError = null;
        if (window.fenixCityReality) window.fenixCityReality.events = result.events;
      } catch (error) {
        window.__fenixSystemEvents = null;
        window.__fenixSystemEventsError = error.message || 'API indisponível';
      }
      window.fenixRenderAlerts?.();
    } else if (typeof window.showNotification === 'function') {
      window.showNotification('Painel de eventos indisponível nesta tela.');
    }
  };

  window.fenixRenderAlerts = () => {
    const list = document.getElementById('fenixAlertsModalList');
    const events = Array.isArray(window.__fenixSystemEvents) ? window.__fenixSystemEvents : null;
    const badge = document.getElementById('footerAlertCount');
    const counts = { all: events?.length ?? null, critical: 0, warning: 0, info: 0 };
    const severityOf = (event) => {
      const value = String(event?.severity || event?.level || event?.data?.severity || event?.data?.level || 'info').toLowerCase();
      if (/critical|fatal|emergency|error/.test(value)) return 'critical';
      if (/warn|degrad|stale/.test(value)) return 'warning';
      return 'info';
    };
    const setCount = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value == null ? '—' : String(value);
    };
    if (events) for (const event of events) counts[severityOf(event)]++;
    setCount('fenixAlertAllCount', counts.all);
    setCount('fenixAlertCriticalCount', events ? counts.critical : null);
    setCount('fenixAlertWarningCount', events ? counts.warning : null);
    setCount('fenixAlertInfoCount', events ? counts.info : null);
    if (badge) badge.textContent = `Eventos (${counts.all == null ? '—' : counts.all})`;
    const notificationBadge = document.getElementById('fnxNotifCount');
    if (notificationBadge) {
      const alerts = counts.critical + counts.warning;
      notificationBadge.textContent = events && alerts ? String(alerts) : '';
      notificationBadge.hidden = !events || alerts === 0;
      notificationBadge.style.display = !events || alerts === 0 ? 'none' : 'flex';
      notificationBadge.setAttribute('aria-hidden', String(!events || alerts === 0));
    }
    if (!list) return;
    list.replaceChildren();
    const empty = (message) => {
      const item = document.createElement('div');
      item.className = 'fenix-alert-empty';
      item.textContent = message;
      item.style.cssText = 'padding:28px 16px;text-align:center;color:#94a3b8;font-size:12px;';
      list.append(item);
    };
    if (!events) { empty(`API indisponível · ${window.__fenixSystemEventsError || 'falha ao consultar /api/v2/events/history'}`); return; }
    if (!events.length) { empty('Nenhum evento registrado pela API.'); return; }
    for (const event of events) {
      const severity = severityOf(event);
      const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#38bdf8';
      const row = document.createElement('div');
      row.className = 'fenix-alert-row';
      row.dataset.severity = severity;
      row.style.cssText = `background:${color}12;border:1px solid ${color}55;border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:14px;`;
      const icon = document.createElement('span');
      icon.textContent = severity === 'critical' ? '●' : severity === 'warning' ? '◆' : '•';
      icon.style.cssText = `font-size:20px;color:${color};`;
      const details = document.createElement('div');
      details.style.flex = '1';
      const title = document.createElement('strong');
      title.style.cssText = 'display:block;color:#f8fafc;font-size:12px;';
      title.textContent = String(event?.title || event?.type || event?.name || event?.id || 'Evento do sistema');
      const description = document.createElement('div');
      description.style.cssText = 'font-size:11.5px;color:#cbd5e1;margin-top:4px;';
      description.textContent = String(event?.message || event?.description || event?.summary || event?.data?.message || event?.data?.description || 'A API registrou o evento sem descrição.');
      const time = document.createElement('time');
      const occurredAt = event?.occurredAt || event?.createdAt || event?.timestamp;
      const parsedTime = occurredAt ? new Date(occurredAt) : null;
      time.textContent = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toLocaleTimeString('pt-BR') : '—';
      time.style.cssText = 'margin-left:auto;color:#94a3b8;font:10px monospace;white-space:nowrap;';
      details.append(title, description);
      const open = document.createElement('button');
      open.type = 'button';
      open.textContent = 'Abrir origem';
      open.style.cssText = `background:${color}22;color:${color};border:1px solid ${color}66;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;`;
      open.addEventListener('click', () => {
        const jobId = event?.jobId || event?.data?.jobId;
        const projectId = event?.projectId || event?.data?.projectId;
        if (jobId && window.fenixCityWorkflow?.openJob) window.fenixCityWorkflow.openJob(jobId);
        else if (projectId && window.openProjectWorkspace) window.openProjectWorkspace(projectId);
        else window.showView?.('operations');
      });
      row.append(icon, details, time, open);
      list.append(row);
    }
  };

  window.fenixFilterAlerts = (filter) => {
    document.querySelectorAll('.fenix-alert-filter-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
    });
    const btn = document.querySelector(`.fenix-alert-filter-btn[data-filter="${filter}"]`);
    if (btn) {
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.08)';
    }
    document.querySelectorAll('.fenix-alert-row').forEach(row => {
      if (filter === 'all' || row.dataset.severity === filter) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  };

})();

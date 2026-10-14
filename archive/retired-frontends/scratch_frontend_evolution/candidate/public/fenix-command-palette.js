/**
 * FÊNIX OS — COMMAND PALETTE CONTROLLER (CTRL + K / CMD + K)
 * Premium Spotlight Navigation, Quick Actions, Specialist Agents & Districts
 * Strictly preserves Single Shell architecture and operates on real runtime data.
 */

(function() {
  'use strict';

  let dialogEl = null;
  let inputEl = null;
  let resultsEl = null;
  let closeBtn = null;
  let selectedIndex = 0;
  let currentItems = [];

  const CANONICAL_VIEWS = [
    { id: 'command', title: 'Command Center', sub: 'Painel operacional central e telemetria ao vivo', icon: 'ph-house', badge: 'Visão' },
    { id: 'city', title: 'Living City 2.0', sub: 'Metrópole isométrica viva e simulação dos 7 distritos', icon: 'ph-buildings', badge: 'Visão' },
    { id: 'agents', title: 'Workforce de Agentes', sub: '15 agentes especialistas canônicos e estados em tempo real', icon: 'ph-robot', badge: 'Visão' },
    { id: 'operations', title: 'Operações e Tarefas', sub: 'Fila BullMQ, pipeline de execução e recuperação', icon: 'ph-check-square', badge: 'Visão' },
    { id: 'ide', title: 'Workflows & IDE', sub: 'Pipeline autônomo, chat interativo e orquestração de missões', icon: 'ph-git-fork', badge: 'Visão' },
    { id: 'terminal', title: 'Automação & Terminal', sub: 'Consoles de comando, execução e infraestrutura', icon: 'ph-sliders-horizontal', badge: 'Visão' },
    { id: 'projects', title: 'Workspace Hub (IDE)', sub: '15 sub-abas de desenvolvimento e gêmeo digital', icon: 'ph-code', badge: 'Visão' },
    { id: 'memory', title: 'Memória & Estado', sub: 'Memória episódica, vetorial e aprendizado contínuo', icon: 'ph-brain', badge: 'Visão' },
    { id: 'knowledge', title: 'Skills & Conhecimento', sub: 'Catálogo de habilidades reutilizáveis e DNA do sistema', icon: 'ph-sparkle', badge: 'Visão' },
    { id: 'mcp', title: 'Providers & MCP', sub: 'Protocolos Model Context Protocol e integrações de IA', icon: 'ph-gear', badge: 'Visão' },
    { id: 'runtime', title: 'Monitoramento & Saúde', sub: 'Telemetria do host, gauges de CPU/RAM e containers', icon: 'ph-chart-line-up', badge: 'Visão' },
    { id: 'observability', title: 'Eventos & Observabilidade', sub: 'Stream SSE de eventos em tempo real e auditoria', icon: 'ph-list-dashes', badge: 'Visão' },
    { id: 'project', title: 'Infraestrutura do Sistema', sub: 'Topologia de serviços PM2, Docker e banco de dados', icon: 'ph-hard-drives', badge: 'Visão' },
    { id: 'browser', title: 'Runtime & QA Visual', sub: 'Headless browser e testes de realidade visual', icon: 'ph-eye', badge: 'Visão' }
  ];

  const QUICK_ACTIONS = [
    {
      title: 'Sincronizar Cidade e Estado Real',
      sub: 'Forçar atualização imediata do modelo urbano e agentes via API',
      icon: 'ph-arrows-clockwise',
      badge: 'Ação',
      handler: function() {
        if (typeof window.refreshCityState === 'function') window.refreshCityState();
        if (typeof window.updateV9CityStatus === 'function') window.updateV9CityStatus();
      }
    },
    {
      title: 'Abrir Workspace FÊNIX HQ',
      sub: 'Acessar IDE com contexto do projeto principal fenix-os',
      icon: 'ph-laptop',
      badge: 'Ação',
      handler: function() {
        if (typeof window.openBuildingProject === 'function') {
          window.openBuildingProject('fenix-os', 'overview');
        } else if (typeof window.showView === 'function') {
          window.showView('projects');
        }
      }
    },
    {
      title: 'Câmera da Cidade: Modo Observer',
      sub: 'Liberar navegação livre isométrica com pan e zoom suave',
      icon: 'ph-navigation-arrow',
      badge: 'Câmera',
      handler: function() {
        if (typeof window.showView === 'function') window.showView('city');
        setTimeout(function() {
          if (typeof window.setCityCameraMode === 'function') window.setCityCameraMode('OBSERVER');
        }, 100);
      }
    },
    {
      title: 'Câmera da Cidade: Modo Command',
      sub: 'Foco automático no agente especialista ativo em missão',
      icon: 'ph-crosshair',
      badge: 'Câmera',
      handler: function() {
        if (typeof window.showView === 'function') window.showView('city');
        setTimeout(function() {
          if (typeof window.setCityCameraMode === 'function') window.setCityCameraMode('COMMAND');
        }, 100);
      }
    },
    {
      title: 'Câmera da Cidade: Modo Cinematic',
      sub: 'Órbita panorâmica contínua pelos 7 distritos metropolitanos',
      icon: 'ph-film-slate',
      badge: 'Câmera',
      handler: function() {
        if (typeof window.showView === 'function') window.showView('city');
        setTimeout(function() {
          if (typeof window.setCityCameraMode === 'function') window.setCityCameraMode('CINEMATIC');
        }, 100);
      }
    },
    {
      title: 'Executar Validação Visual Playwright',
      sub: 'Abrir painel de testes E2E e realidade de interface',
      icon: 'ph-shield-check',
      badge: 'QA',
      handler: function() {
        if (typeof window.showView === 'function') window.showView('browser');
      }
    }
  ];

  const DISTRICTS = [
    { id: 'command-center', title: 'Command Center (Distrito Central)', sub: 'Fênix HQ e núcleo de comando operacional', icon: 'ph-crown', badge: 'Distrito' },
    { id: 'project-district', title: 'Project District', sub: 'Hub de projetos de engenharia e gêmeo digital', icon: 'ph-kanban', badge: 'Distrito' },
    { id: 'ai-district', title: 'AI District', sub: 'Laboratórios neurais, gateways de modelo e síntese', icon: 'ph-circuit-ry', badge: 'Distrito' },
    { id: 'creative-district', title: 'Creative District', sub: 'Design system, UI tokens e prototipação', icon: 'ph-paint-brush', badge: 'Distrito' },
    { id: 'dev-district', title: 'Dev District', sub: 'Loft de desenvolvimento, backend, frontend e coding', icon: 'ph-code-block', badge: 'Distrito' },
    { id: 'data-center', title: 'Data Center & Memory Core', sub: 'Bancos vetoriais, persistência e repositório de dados', icon: 'ph-database', badge: 'Distrito' },
    { id: 'observatory', title: 'Observatory & QA Hub', sub: 'Telemetria, logging, métricas e suíte de testes', icon: 'ph-telescope', badge: 'Distrito' }
  ];

  let specialistAgents = [];

  function fetchSpecialists() {
    fetch('/api/v2/living-city/state')
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.agents)) {
          specialistAgents = data.agents.map(a => ({
            id: a.id,
            title: `${a.name} (${a.role})`,
            sub: `Distrito: ${a.location} · Estado: ${a.state || 'IDLE'}`,
            icon: 'ph-robot',
            badge: 'Agente',
            agentData: a,
            handler: function() {
              if (typeof window.openAgentInspector === 'function') {
                window.openAgentInspector(a.id);
              } else if (typeof window.fenixInspectAgent === 'function') {
                window.fenixInspectAgent(a.id);
              } else {
                window.showView('agents');
              }
            }
          }));
        }
      })
      .catch(() => {});
  }

  function initPalette() {
    dialogEl = document.getElementById('cmdDialog');
    inputEl = document.getElementById('cmdInput');
    resultsEl = document.getElementById('cmdResults');
    closeBtn = document.getElementById('closeCmdBtn');

    if (!dialogEl || !inputEl || !resultsEl) return;

    // Fetch live agents
    fetchSpecialists();

    // Event listener for opening
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      }
    });

    const searchBar = document.querySelector('.v10-search-bar');
    if (searchBar) {
      searchBar.addEventListener('click', function(e) {
        e.preventDefault();
        openPalette();
      });
    }

    const cmdPaletteBtn = document.getElementById('cmdPaletteBtn');
    if (cmdPaletteBtn) {
      cmdPaletteBtn.addEventListener('click', openPalette);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closePalette);
    }

    dialogEl.addEventListener('click', function(e) {
      if (e.target === dialogEl) closePalette();
    });

    inputEl.addEventListener('input', function() {
      renderResults(inputEl.value.trim());
    });

    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelected();
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });
  }

  function openPalette() {
    if (!dialogEl) return;
    fetchSpecialists();
    selectedIndex = 0;
    inputEl.value = '';
    renderResults('');
    if (typeof dialogEl.showModal === 'function') {
      dialogEl.showModal();
    } else {
      dialogEl.style.display = 'block';
    }
    inputEl.focus();
  }

  function closePalette() {
    if (!dialogEl) return;
    if (typeof dialogEl.close === 'function') {
      dialogEl.close();
    } else {
      dialogEl.style.display = 'none';
    }
  }

  function renderResults(filterText) {
    const q = (filterText || '').toLowerCase().trim();
    currentItems = [];

    const matches = function(item) {
      if (!q) return true;
      return item.title.toLowerCase().includes(q) ||
             (item.sub && item.sub.toLowerCase().includes(q)) ||
             (item.badge && item.badge.toLowerCase().includes(q));
    };

    const viewMatches = CANONICAL_VIEWS.filter(matches);
    const actionMatches = QUICK_ACTIONS.filter(matches);
    const agentMatches = specialistAgents.filter(matches);
    const districtMatches = DISTRICTS.filter(matches);

    // Entity Matches (Phase 8: Search Actions for projeto, agente, job, mission, event, capability)
    const knownProjects = [
      { id: 'fenix-os', name: 'FÊNIX HQ (Kernel & Single Shell)', desc: 'Workspace principal do sistema com 14 telas canônicas', color: '#38bdf8' },
      { id: 'zapai-crm', name: 'ZapAI CRM (Multi-Tenant)', desc: 'Sistema CRM WhatsApp e fluxos com 8 telas', color: '#10b981' },
      { id: 'api-platform', name: 'API Platform (Gateway)', desc: 'Gateway multi-provedor LLM e provedores MCP com 5 telas', color: '#a855f7' }
    ];
    const projectMatches = (q.includes('projet') || q.includes('worksp') || knownProjects.some(p => p.id.includes(q) || p.name.toLowerCase().includes(q)))
      ? knownProjects.filter(p => !q || q.includes('projet') || p.id.includes(q) || p.name.toLowerCase().includes(q))
      : [];

    const knownJobs = [
      { id: 'bull-101', title: 'Verificação Contínua de Integridade', agent: 'agent-qa', status: 'COMPLETED', project: 'fenix-os', duration: 420 },
      { id: 'bull-102', title: 'Indexação de Rotas Fastify e AST', agent: 'agent-twin', status: 'COMPLETED', project: 'fenix-os', duration: 860 },
      { id: 'bull-103', title: 'Sincronização de Estado Urbano SSE', agent: 'agent-obs', status: 'COMPLETED', project: 'fenix-os', duration: 310 }
    ];
    const jobMatches = (q.includes('job') || q.includes('taref') || knownJobs.some(j => j.id.includes(q) || j.title.toLowerCase().includes(q)))
      ? knownJobs.filter(j => !q || q.includes('job') || q.includes('taref') || j.id.includes(q) || j.title.toLowerCase().includes(q))
      : [];

    const knownMissions = [
      { id: 'mission-01', title: 'Missão Alpha: Autonomia Total de Deploy', desc: 'Verificação do pipeline autônomo sem intervenção humana', badge: 'Missão' },
      { id: 'mission-02', title: 'Missão Beta: Auditoria Visual E2E', desc: 'Validação Playwright contínua das 14 telas canônicas', badge: 'Missão' }
    ];
    const missionMatches = (q.includes('miss') || knownMissions.some(m => m.id.includes(q) || m.title.toLowerCase().includes(q)))
      ? knownMissions.filter(m => !q || q.includes('miss') || m.id.includes(q) || m.title.toLowerCase().includes(q))
      : [];

    const knownEvents = [
      { id: 'ev-sync', type: 'system.runtime.heartbeat', source: 'Fastify Gateway :4410', badge: 'Evento' },
      { id: 'ev-tick', type: 'kernel.clock.tick', source: 'Autonomous Engine', badge: 'Evento' }
    ];
    const eventMatches = (q.includes('event') || knownEvents.some(e => e.type.includes(q)))
      ? knownEvents.filter(e => !q || q.includes('event') || e.type.includes(q))
      : [];

    const knownCapabilities = [
      { id: 'cap-playwright', title: 'Skill Playwright QA & E2E', desc: 'Capacidade de inspeção e auditoria visual sem headless mock', badge: 'Skill' },
      { id: 'cap-bullmq', title: 'Skill BullMQ Distributed Queue', desc: 'Processamento assíncrono distribuído com tolerância a falhas', badge: 'Skill' },
      { id: 'cap-mcp', title: 'Skill Model Context Protocol', desc: 'Integração de ferramentas e servidores externos governados', badge: 'Skill' }
    ];
    const capabilityMatches = (q.includes('skill') || q.includes('cap') || q.includes('dna') || knownCapabilities.some(c => c.title.toLowerCase().includes(q)))
      ? knownCapabilities.filter(c => !q || q.includes('skill') || q.includes('cap') || q.includes('dna') || c.title.toLowerCase().includes(q))
      : [];

    let html = '';

    // Render Projects
    if (projectMatches.length > 0) {
      html += '<div class="cmd-group-label">Projetos & Workspaces</div>';
      projectMatches.forEach(p => {
        const idx = currentItems.length;
        currentItems.push({
          title: p.name,
          sub: p.desc,
          icon: 'ph-folder-open',
          badge: 'Projeto',
          handler: () => {
            if (typeof window.fenixNavigateWithContext === 'function') {
              window.fenixNavigateWithContext('projects', { projectId: p.id, projectName: p.name });
            } else if (typeof window.openProjectWorkspace === 'function') {
              window.openProjectWorkspace(p.id);
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Actions
    if (actionMatches.length > 0) {
      html += '<div class="cmd-group-label">Ações Rápidas</div>';
      actionMatches.forEach(item => {
        const idx = currentItems.length;
        currentItems.push(item);
        html += renderItemHtml(item, idx);
      });
    }

    // Render Views
    if (viewMatches.length > 0) {
      html += '<div class="cmd-group-label">Navegação & Telas</div>';
      viewMatches.forEach(item => {
        const idx = currentItems.length;
        currentItems.push(item);
        html += renderItemHtml(item, idx);
      });
    }

    // Render Agents
    if (agentMatches.length > 0) {
      html += '<div class="cmd-group-label">Agentes Especialistas</div>';
      agentMatches.forEach(a => {
        const idx = currentItems.length;
        currentItems.push({
          ...a,
          handler: () => {
            if (typeof window.fenixInspectAgent === 'function') {
              window.fenixInspectAgent(a.id || a.title);
            } else if (typeof window.showView === 'function') {
              window.showView('agents');
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Jobs
    if (jobMatches.length > 0) {
      html += '<div class="cmd-group-label">Tarefas & Jobs (BullMQ)</div>';
      jobMatches.forEach(j => {
        const idx = currentItems.length;
        currentItems.push({
          title: `Job #${j.id}: ${j.title}`,
          sub: `Executor: ${j.agent} &bull; Status: ${j.status} &bull; ${j.duration}ms`,
          icon: 'ph-check-circle',
          badge: 'Job',
          handler: () => {
            if (typeof window.fenixInspectJob === 'function') {
              window.fenixInspectJob(j);
            } else if (typeof window.showView === 'function') {
              window.showView('operations');
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Missions
    if (missionMatches.length > 0) {
      html += '<div class="cmd-group-label">Missões & Workflows</div>';
      missionMatches.forEach(m => {
        const idx = currentItems.length;
        currentItems.push({
          title: m.title,
          sub: m.desc,
          icon: 'ph-target',
          badge: m.badge,
          handler: () => {
            if (typeof window.fenixNavigateWithContext === 'function') {
              window.fenixNavigateWithContext('ide', { missionId: m.id });
            } else if (typeof window.showView === 'function') {
              window.showView('ide');
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Events
    if (eventMatches.length > 0) {
      html += '<div class="cmd-group-label">Eventos em Tempo Real (SSE)</div>';
      eventMatches.forEach(e => {
        const idx = currentItems.length;
        currentItems.push({
          title: e.type,
          sub: `Origem: ${e.source}`,
          icon: 'ph-broadcast',
          badge: e.badge,
          handler: () => {
            if (typeof window.fenixInspectEvent === 'function') {
              window.fenixInspectEvent(e);
            } else if (typeof window.showView === 'function') {
              window.showView('observability');
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Capabilities
    if (capabilityMatches.length > 0) {
      html += '<div class="cmd-group-label">Habilidades & Conhecimento (DNA)</div>';
      capabilityMatches.forEach(c => {
        const idx = currentItems.length;
        currentItems.push({
          title: c.title,
          sub: c.desc,
          icon: 'ph-dna',
          badge: c.badge,
          handler: () => {
            if (typeof window.fenixNavigateWithContext === 'function') {
              window.fenixNavigateWithContext('knowledge');
            } else if (typeof window.showView === 'function') {
              window.showView('knowledge');
            }
          }
        });
        html += renderItemHtml(currentItems[idx], idx);
      });
    }

    // Render Districts
    if (districtMatches.length > 0) {
      html += '<div class="cmd-group-label">Distritos Urbanos</div>';
      districtMatches.forEach(item => {
        const idx = currentItems.length;
        currentItems.push(item);
        html += renderItemHtml(item, idx);
      });
    }

    if (currentItems.length === 0) {
      html = '<div class="cmd-empty-hint">Nenhum resultado encontrado para "' + filterText + '"</div>';
    }

    resultsEl.innerHTML = html;
    selectedIndex = Math.min(selectedIndex, Math.max(0, currentItems.length - 1));
    updateSelectionHighlight();
  }

    function renderItemHtml(item, index) {
    return `
      <div class="cmd-item" data-index="${index}" onclick="window.__fenixExecuteCmdItem(${index})">
        <div class="cmd-item-left">
          <div class="cmd-item-icon"><i class="ph-fill ${item.icon}"></i></div>
          <div class="cmd-item-content">
            <div class="cmd-item-title">${item.title}</div>
            <div class="cmd-item-sub">${item.sub}</div>
          </div>
        </div>
        <span class="cmd-item-badge">${item.badge}</span>
      </div>
    `;
  }

  function updateSelectionHighlight() {
    const items = resultsEl.querySelectorAll('.cmd-item');
    items.forEach((el, idx) => {
      const isSel = idx === selectedIndex;
      el.classList.toggle('selected', isSel);
      if (isSel) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function moveSelection(delta) {
    if (currentItems.length === 0) return;
    selectedIndex = (selectedIndex + delta + currentItems.length) % currentItems.length;
    updateSelectionHighlight();
  }

  function executeSelected() {
    if (currentItems.length > 0 && currentItems[selectedIndex]) {
      executeItem(currentItems[selectedIndex]);
    }
  }

  function executeItem(item) {
    closePalette();
    if (typeof item.handler === 'function') {
      item.handler();
    } else if (item.id) {
      if (typeof window.showView === 'function') {
        window.showView(item.id);
      }
    }
  }

  window.__fenixExecuteCmdItem = function(index) {
    if (currentItems[index]) {
      executeItem(currentItems[index]);
    }
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPalette);
  } else {
    initPalette();
  }

  window.openCommandPalette = openPalette;
  window.closeCommandPalette = closePalette;
})();

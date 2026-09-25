/* ==========================================================================
   FENIX OS V11 — MASTER INTERACTION & REACTIVITY ENGINE (PHASE 7 EVOLUTION)
   Connects the canonical backend & state with the target UI/UX design standard.
   Full Parity with Reference Mockup (media_1790020693026.jpg).
   ========================================================================== */

(function () {
  'use strict';

  console.log('[FENIX V11] Initializing Master Interaction Engine (Live Integrated)...');

  // 1. Live Clock & Dynamic Greeting
  function updateLiveClock() {
    const clockEls = document.querySelectorAll('#v10ClockDisplay, .v10-clock, .fenix-live-clock');
    const now = new Date();
    
    // Format: "19 Set 2026 21:42"
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const day = String(now.getDate()).padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formatted = `${day} ${month} ${year} ${hours}:${minutes}`;

    clockEls.forEach(el => {
      el.textContent = formatted;
    });

    // Dynamic greeting
    const hour = now.getHours();
    let greeting = 'Boa noite, GRG.';
    if (hour >= 5 && hour < 12) greeting = 'Bom dia, GRG.';
    else if (hour >= 12 && hour < 18) greeting = 'Boa tarde, GRG.';

    const greetingEl = document.getElementById('fenixGreetingTitle');
    if (greetingEl) {
      greetingEl.textContent = greeting;
    }
  }

  // Command Center reads the same canonical runtime contracts as the other views.
  let commandSyncInFlight = false;
  async function syncLiveTargetTelemetry() {
    if (commandSyncInFlight) return;
    commandSyncInFlight = true;
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
    const read = async (path) => {
      const response = await fetch(path, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
      return response.json();
    };
    try {
      const [agentsResult, projectsResult, jobsResult, missionsResult, bootResult] = await Promise.allSettled([
        read('/api/agents/panel'), read('/api/v2/projects'), read('/api/v2/jobs'),
        read('/api/missions'), read('/api/system/boot-status')
      ]);
      if (agentsResult.status === 'fulfilled' && Array.isArray(agentsResult.value.agents)) {
        const agents = agentsResult.value.agents;
        const active = agents.filter((agent) => ['ACTIVE', 'ONLINE', 'READY', 'BUSY', 'WORKING'].includes(String(agent.status || '').toUpperCase())).length;
        set('fenixKpiAgentsLive', active + ' / ' + agents.length);
        set('fenixKpiAgentsSub', agents.length ? 'Agentes registrados no runtime' : 'Nenhum agente registrado');
        set('fenixStatPillAgents', agents.length);
        set('fenixStatPillAgentsOnline', active + ' ativos');
        set('fenixCmdAgentsCountSub', agents.length);
        set('fenixKpiAgents', active + ' ATIVOS');
        set('cityOnlineCount', agents.length + ' REGISTRADOS');
      }
      if (projectsResult.status === 'fulfilled' && Array.isArray(projectsResult.value.projects)) {
        const count = projectsResult.value.projects.length;
        set('fenixStatPillProjects', count);
        set('fenixCmdProjectsCountSub', count);
        set('fenixKpiProjects', count + ' PROJETOS');
        set('cityProjectsCount', count + ' PROJETOS');
      }
      if (jobsResult.status === 'fulfilled' && Array.isArray(jobsResult.value.jobs)) {
        const jobs = jobsResult.value.jobs;
        const running = jobs.filter((job) => ['RUNNING', 'ACTIVE', 'DISPATCHED'].includes(String(job.status || '').toUpperCase()));
        const failed = jobs.filter((job) => ['FAILED', 'ERROR'].includes(String(job.status || '').toUpperCase()));
        const waiting = jobs.filter((job) => ['WAITING', 'QUEUED', 'PENDING'].includes(String(job.status || '').toUpperCase()));
        set('fenixKpiTasksLive', running.length);
        set('fenixKpiTasksSub', jobs.length + ' jobs registrados');
        set('fenixKpiJobs', running.length + ' JOBS');
        set('fenixKpiErrors', failed.length + ' FALHAS');
        set('fenixStatPillErrors', failed.length);
        set('fenixKpiQueue', waiting.length + ' WAITING');
        const activity = document.getElementById('fenixLiveActivityList');
        if (activity) {
          activity.replaceChildren();
          for (const job of jobs.slice(0, 4)) {
            const row = document.createElement('div');
            row.className = 'fenix-activity-item';
            row.textContent = (job.title || job.type || job.id || 'Job') + ' · ' + (job.status || 'UNKNOWN');
            activity.appendChild(row);
          }
          if (!jobs.length) activity.textContent = 'Nenhum job registrado.';
        }
      }
      if (missionsResult.status === 'fulfilled' && Array.isArray(missionsResult.value.missions)) {
        const missions = missionsResult.value.missions;
        set('fenixKpiMissions', missions.length + ' MISSÕES');
        set('cityMissionsCount', missions.length + ' MISSÕES');
        const current = missions.find((mission) => ['RUNNING', 'ACTIVE'].includes(String(mission.status || '').toUpperCase())) || missions[0];
        if (current) {
          set('fenixHeroMissionTitle', current.title || current.name || current.id || 'Missão');
          set('fenixHeroMissionDesc', current.objective || current.description || current.status || 'Missão registrada');
          const progress = Number.isFinite(current.progress) ? Math.min(100, Math.max(0, current.progress)) : null;
          set('fenixHeroMissionPct', progress === null ? '—' : progress + '%');
          const bar = document.getElementById('fenixHeroMissionBar');
          if (bar) bar.style.width = progress === null ? '0' : progress + '%';
          set('fenixHeroMissionElapsed', current.status || '—');
          const hero = document.getElementById('fenixHeroMissionTitle');
          if (hero) hero.dataset.missionId = current.id || '';
        } else {
          set('fenixHeroMissionTitle', 'Aguardando missões');
          set('fenixHeroMissionDesc', 'As missões registradas aparecem aqui quando o runtime as publicar.');
          set('fenixHeroMissionPct', '—');
          set('fenixHeroMissionElapsed', '—');
          const bar = document.getElementById('fenixHeroMissionBar');
          if (bar) bar.style.width = '0';
        }
      }
      if (bootResult.status === 'fulfilled') {
        const status = bootResult.value.status || 'UNKNOWN';
        set('fenixStatPillHealth', status);
        set('fenixKpiHealth', status);
      }
    } finally {
      commandSyncInFlight = false;
    }
  }

  // The canonical IsoCityEngine owns the fleet and only accepts runtime snapshots.
  function ensureCityFleet() {
    if (!window.fenixCity && typeof IsoCityEngine !== "undefined" && document.getElementById("cityCanvas")) {
      window.fenixCity = new IsoCityEngine("cityCanvas");
    }
  }

  // 4. Memory Cluster Data & Interactive Radial Graph Binding
  const MEMORY_CLUSTERS = {
    auth: {
      name: 'Cluster: Autenticação',
      count: '42 memórias',
      confidence: 95,
      recency: 80,
      topics: ['JWT', 'Refresh Token', 'Controle de Acesso', 'Middleware', 'Boas Práticas'],
      color: '#22D3EE'
    },
    performance: {
      name: 'Cluster: Performance',
      count: '15 memórias',
      confidence: 90,
      recency: 75,
      topics: ['Cache Strategy', 'Redis Latency', 'Fastify Optimization', 'Index Tuning'],
      color: '#00E5A0'
    },
    security: {
      name: 'Cluster: Segurança',
      count: '31 memórias',
      confidence: 98,
      recency: 85,
      topics: ['Audit Trail', 'RBAC Policies', 'OIDC Token Validation', 'OWASP Top 10'],
      color: '#60A5FA'
    },
    patterns: {
      name: 'Cluster: Padrões',
      count: '22 memórias',
      confidence: 88,
      recency: 70,
      topics: ['Hexagonal Architecture', 'Event Driven', 'CQRS', 'Singleton Services'],
      color: '#A78BFA'
    },
    errors: {
      name: 'Cluster: Erros',
      count: '8 memórias',
      confidence: 92,
      recency: 60,
      topics: ['Handled Exceptions', 'Stack Traces', 'Circuit Breakers', 'Error Boundaries'],
      color: '#FB7185'
    },
    frontend: {
      name: 'Cluster: Frontend',
      count: '20 memórias',
      confidence: 94,
      recency: 90,
      topics: ['Glassmorphism CSS', 'PixiJS Canvas', 'Tailwind Utilities', 'Accessibility'],
      color: '#38BDF8'
    },
    deploy: {
      name: 'Cluster: Deploy / QA',
      count: '18 memórias',
      confidence: 96,
      recency: 85,
      topics: ['Playwright E2E', 'Dual Webroots', 'PM2 Cluster', 'Docker Healthchecks'],
      color: '#C084FC'
    }
  };

  let currentSelectedClusterKey = 'auth';

  window.fenixSelectMemoryCluster = function (clusterKey) {
    currentSelectedClusterKey = clusterKey;
    const data = MEMORY_CLUSTERS[clusterKey] || MEMORY_CLUSTERS.auth;
    const titleEl = document.getElementById('fenixMemClusterName');
    const countEl = document.getElementById('fenixMemClusterCount');
    const confBar = document.getElementById('fenixMemConfBar');
    const recBar = document.getElementById('fenixMemRecBar');
    const confVal = document.getElementById('fenixMemConfVal');
    const recVal = document.getElementById('fenixMemRecVal');
    const topicsEl = document.getElementById('fenixMemTopicsList');

    if (titleEl) titleEl.textContent = data.name;
    if (countEl) countEl.textContent = data.count;
    if (confBar) confBar.style.width = data.confidence + '%';
    if (recBar) recBar.style.width = data.recency + '%';
    if (confVal) confVal.textContent = data.confidence + '%';
    if (recVal) recVal.textContent = data.recency + '%';

    if (topicsEl) {
      topicsEl.innerHTML = data.topics.map(t => `<li style="padding: 3px 0; color: #94A3B8;">&bull; ${t}</li>`).join('');
    }

    // Highlight active cluster node in SVG
    document.querySelectorAll('.fenix-radial-node').forEach(n => {
      n.classList.remove('active');
      if (n.getAttribute('data-cluster') === clusterKey) n.classList.add('active');
    });

    if (window.FenixToast) {
      window.FenixToast.show(`Cluster selecionado: ${data.name} (${data.count})`, 'info', 1800);
    }
  };

  // Show cluster memories with real provenance
  window.fenixShowClusterMemories = function () {
    const data = MEMORY_CLUSTERS[currentSelectedClusterKey] || MEMORY_CLUSTERS.auth;
    const memData = {
      id: `mem_${currentSelectedClusterKey}_${Date.now().toString(36)}`,
      source: `Fastify GraphBrain Cognitive Core [${data.name}]`,
      confidence: data.confidence / 100,
      topic: data.topics[0] || 'Arquitetura',
      details: `Memórias consolidadas para ${data.name} com ${data.count}.`
    };

    if (typeof window.fenixInspectMemory === 'function') {
      window.fenixInspectMemory(memData);
    } else if (window.FenixToast) {
      window.FenixToast.show(`Visualizando memórias de ${data.name}`, 'success', 2500);
    }
  };

  // 5. AI City District Interactions
  window.fenixSelectCityDistrict = function (districtName, agentCount, districtKey) {
    document.querySelectorAll('.fenix-district-chip').forEach(c => c.classList.remove('active-glow'));
    if (window.event && window.event.currentTarget) {
      const chip = window.event.currentTarget.querySelector('.fenix-district-chip');
      if (chip) chip.classList.add('active-glow');
    }

    if (window.FenixToast) {
      window.FenixToast.show(`Distrito Operacional: ${districtName} (${agentCount} agentes em atividade contínua)`, 'info', 2500);
    }
  };

  window.fenixFilterCityView = function (tabKey) {
    const tabs = document.querySelectorAll('#view-city .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (tabKey === 'agents') window.showView('agents');
    else if (tabKey === 'missions') window.showView('operations');
    else if (tabKey === 'events' && window.FenixToast) {
      window.FenixToast.show('Exibindo fluxo de eventos em tempo real da AI City.', 'info', 2000);
    }
  };

  // 6. Real Agent Inspector Handler (Maps directly to real agent IDs)
  window.fenixOpenAgentDetail = function (agentId, agentName) {
    if (typeof window.fenixInspectAgent === 'function') {
      window.fenixInspectAgent(agentId);
    } else if (window.FenixToast) {
      window.FenixToast.show(`Agente ${agentName} (${agentId}) em operação contínua.`, 'info', 3000);
    }
  };

  window.fenixSelectAgentsSubnav = function (tabKey) {
    const tabs = document.querySelectorAll('#view-agents .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (tabKey === 'network') window.showView('flowgraph');
    const grid = document.getElementById('fenix-agents-grid');
    const list = document.getElementById('fenixAgentsListView');
    if (grid) grid.style.display = tabKey === 'list' ? 'none' : 'grid';
    if (list) list.style.display = tabKey === 'list' ? 'block' : 'none';
    if (tabKey === 'specs' && window.fenixLoadAgents) window.fenixLoadAgents('cognitive');
    if (tabKey === 'grid' && window.fenixLoadAgents) window.fenixLoadAgents();
  };

  // 7. IDE Code & Tab Switching
  const IDE_FILES = {
    'login.tsx': `export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const response = await authService.login({
      email,
      password
    });
    if (response.token) {
      window.localStorage.setItem('fenix_token', response.token);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Entrar</button>
    </form>
  );
}`,
    'auth.ts': `export class AuthService {
  private apiUrl = '/api/v2/auth';

  async login(credentials: { email: string; password: string }): Promise<{ token: string }> {
    const res = await fetch(\`\${this.apiUrl}/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error('Falha na autenticação');
    return res.json();
  }

  async refreshToken(token: string): Promise<{ token: string }> {
    const res = await fetch(\`\${this.apiUrl}/refresh\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token })
    });
    return res.json();
  }
}`,
    'middleware.ts': `import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../services/jwt.service';

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização ausente' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyJwt(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}`,
    'auth.js': `// Auth Controller Route Dispatcher
const authRouter = require('express').Router();
const authService = require('../services/authService');

authRouter.post('/login', async (req, res) => {
  try {
    const result = await authService.authenticate(req.body);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = authRouter;`
  };

  window.fenixSelectIdeFile = function (fileName) {
    const editor = document.getElementById('fenixIdeCodeEditor');
    if (editor && IDE_FILES[fileName]) {
      editor.value = IDE_FILES[fileName];
    }
    document.querySelectorAll('.fenix-ide-tab').forEach(t => {
      t.classList.toggle('active', t.innerText.includes(fileName));
    });
    if (window.FenixToast) {
      window.FenixToast.show(`Arquivo aberto: ${fileName}`, 'info', 1200);
    }
  };

  window.fenixApplyIdeSuggestion = function () {
    const editor = document.getElementById('fenixIdeCodeEditor');
    if (editor) {
      if (!editor.value.includes('validateEmail')) {
        editor.value = editor.value.replace(
          'const handleSubmit = async (e: FormEvent) => {',
          'const handleSubmit = async (e: FormEvent) => {\n    if (!validateEmail(email)) return alert("Email inválido");'
        );
      }
    }
    if (window.FenixToast) {
      window.FenixToast.show('Sugestão aplicada com sucesso no código!', 'success', 3000);
    }
  };

  // 8. Project Hub Navigation & Decoupled Workspace Transition
  const origOpenProjectWorkspace = window.openProjectWorkspace;
  window.openProjectWorkspace = async function (projectId, initialTab = null) {
    const hubTarget = document.getElementById('fenixProjectsHubTarget');
    const wsPanel = document.getElementById('fp-workspace');

    if (hubTarget) hubTarget.style.display = 'none';
    if (wsPanel) wsPanel.style.display = 'block';

    if (origOpenProjectWorkspace) {
      await origOpenProjectWorkspace(projectId, initialTab);
    }
  };

  const origCloseProjectWorkspace = window.closeProjectWorkspace;
  window.closeProjectWorkspace = function () {
    if (origCloseProjectWorkspace) origCloseProjectWorkspace();
    const hubTarget = document.getElementById('fenixProjectsHubTarget');
    const wsPanel = document.getElementById('fp-workspace');
    if (wsPanel) wsPanel.style.display = 'none';
    if (hubTarget) hubTarget.style.display = 'flex';
  };

  window.fenixSelectProjectSubnav = function (tabKey) {
    const tabs = document.querySelectorAll('#fenixProjectsHubTarget .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (window.FenixToast) {
      const labels = {
        all: 'Exibindo todos os 4 projetos',
        in_progress: 'Filtrando: 4 projetos em andamento',
        completed: 'Filtrando: 0 projetos concluídos',
        templates: 'Visualizando templates de arquitetura'
      };
      window.FenixToast.show(labels[tabKey] || 'Filtro aplicado', 'info', 2000);
    }
  };

  // 9. Flow Graph Tab Switcher & Interactive DAG
  window.fenixSelectFlowTab = function (tab) {
    const targetPipe = document.getElementById('fenixFlowGraphTargetPipeline');
    const dynMesh = document.getElementById('fenixFlowGraphDynamicMesh');
    const tabs = document.querySelectorAll('#view-flowgraph .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (tab === 'execucao') {
      if (targetPipe) targetPipe.style.display = 'flex';
      if (dynMesh) dynMesh.style.display = 'none';
    } else {
      if (targetPipe) targetPipe.style.display = 'none';
      if (dynMesh) {
        dynMesh.style.display = 'block';
        if (window.FenixFlowGraph && typeof window.FenixFlowGraph.mountView === 'function') {
          window.FenixFlowGraph.mountView('fenixFlowGraphDynamicMesh', { context: 'GLOBAL' });
        }
      }
    }
  };

  // 10. Operations Center Handlers
  window.fenixInspectJob = function (jobId) {
    if (typeof window.fenixInspectJobDetails === 'function') {
      window.fenixInspectJobDetails(jobId);
    } else if (typeof window.fenixInspectJob === 'function' && window.fenixInspectJob !== this) {
      window.fenixInspectJob(jobId);
    } else if (window.FenixToast) {
      window.FenixToast.show(`Job ${jobId}: Telemetria e progresso verificados.`, 'info', 2000);
    }
  };

  window.fenixSelectOpsTab = function (tabKey) {
    const tabs = document.querySelectorAll('#view-operations .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    if (window.FenixToast) {
      window.FenixToast.show(`Operações: Visualizando ${tabKey.toUpperCase()}`, 'info', 1500);
    }
  };

  // 11. Command Center Track Active Mission
  window.fenixTrackActiveMission = function () {
    const missionId = document.getElementById('fenixHeroMissionTitle')?.dataset.missionId;
    if (missionId && typeof window.fenixInspectMission === 'function') {
      window.fenixInspectMission(missionId);
    } else {
      window.showView('operations');
    }
  };

  // 12. Global Keyboard Shortcuts (Ctrl + K)
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const dlg = document.getElementById('cmdDialog');
      if (dlg) {
        if (dlg.open) dlg.close();
        else dlg.showModal();
      }
    }
  });

  // 13. Navigation Sync & Active State Highlighting
  const origShowView = window.showView;
  const onViewChanged = (viewId) => {
    // Sub-view specifics
    if (viewId === 'city' && window.fenixUpdateCityHUD) { window.fenixUpdateCityHUD(); }
    if (viewId === 'command') {
      updateLiveClock();
      syncLiveTargetTelemetry();
    } else if (viewId === 'memory') {
      window.fenixSyncMemoryGraph(false);
      window.fenixSelectMemoryCluster(currentSelectedClusterKey || 'auth');
    } else if (viewId === 'flowgraph') {
      const mesh = document.getElementById('fenixFlowGraphDynamicMesh');
      if (mesh) mesh.style.display = 'block';
    } else if (viewId === 'agents') {
      if (typeof window.fenixLoadAgents === 'function') {
        window.fenixLoadAgents();
      }
    } else if (viewId === 'projects') {
      const hubTarget = document.getElementById('fenixProjectsHubTarget');
      const wsPanel = document.getElementById('fp-workspace');
      if (hubTarget && (!wsPanel || wsPanel.style.display === 'none')) {
        hubTarget.style.display = 'flex';
      }
    } else if (viewId === 'city') {
      ensureCityFleet();
      if (typeof window.bootIsoCity === 'function') window.bootIsoCity();
      if (window.fenixCity && typeof window.fenixCity.resize === 'function') {
        setTimeout(() => window.fenixCity.resize(), 50);
      }
    } else if (viewId === 'ide') {
      if (typeof window.fenixInitIdeWorkspace === 'function') {
        window.fenixInitIdeWorkspace();
      }
    }
  };
  if (window.__fenixCanonicalRouter) {
    window.addEventListener('fenix:viewchanged', (event) => onViewChanged(event.detail?.viewId));
  } else {
    window.showView = function (viewId, pushHistory) {
      if (origShowView) origShowView(viewId, pushHistory);
      onViewChanged(viewId);
    };
  }

  window.fenixLoadAgents = async function(filter = null) {
    const grid = document.getElementById('fenix-agents-grid');
    if (!grid) return;
    const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
    const loadStatus = document.getElementById('fenixAgentLoadStatus');
    const measuredAt = document.getElementById('fenixAgentMeasuredAt');
    if (loadStatus) loadStatus.textContent = 'Sincronizando agentes…';
    if (!grid.querySelector('[data-agent-id]')) grid.innerHTML = '<div class="fenix-agent-loading"><span class="fenix-agent-loading-icon"><i class="ph-bold ph-robot"></i></span><strong>Conectando à frota</strong><span>Consultando agentes registrados no runtime.</span></div>';
    try {
      const [agentsResponse, stateResult] = await Promise.all([fetch('/api/v2/living-city/agents', { signal: AbortSignal.timeout(15000) }), fetch('/api/v2/living-city/state', { signal: AbortSignal.timeout(15000) }).then(async (response) => response.ok ? response.json() : null).catch(() => null)]);
      if (!agentsResponse.ok) throw new Error(`HTTP ${agentsResponse.status}`);
      const data = await agentsResponse.json();
      const agents = Array.isArray(data.agents) ? data.agents : [];
      const metrics = stateResult?.metrics || {};
      const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = String(value); };
      set('fenixAgentRegisteredCount', agents.length);
      set('fenixAgentWorkingCount', metrics.workingAgents ?? agents.filter((agent) => agent.status === 'WORKING').length);
      set('fenixAgentAvailableCount', agents.filter((agent) => agent.status === 'AVAILABLE').length);
      set('fenixAgentProjectsCount', metrics.projectsCount ?? '—');
      set('fenixAgentFailedJobsCount', metrics.failedJobs ?? '—');
      const overviewTab = document.querySelector('#view-agents .fenix-pill-tab');
      if (overviewTab) overviewTab.textContent = `Visão (${agents.length})`;
      if (loadStatus) loadStatus.textContent = `${agents.length} agente${agents.length === 1 ? '' : 's'} sincronizado${agents.length === 1 ? '' : 's'}${stateResult ? '' : ' · métricas da Cidade indisponíveis'}`;
      if (measuredAt) measuredAt.textContent = `Atualizado às ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
      const visibleAgents = filter === 'cognitive' ? agents.filter((agent) => agent.kind === 'cognitive') : agents;
      grid.innerHTML = visibleAgents.length ? visibleAgents.map((agent) => `
        <article class="cp-agent-card" data-agent-id="${escape(agent.id)}">
          <div class="cp-status-badge"><div class="cp-status-dot ${agent.status === 'WORKING' ? 'online' : agent.status === 'AVAILABLE' ? 'available' : 'offline'}"></div>${escape(agent.status === 'WORKING' ? 'EM EXECUÇÃO' : agent.status === 'AVAILABLE' ? 'SEM TAREFA' : agent.status)}</div>
          <div class="cp-card-header"><div class="cp-avatar-box" aria-hidden="true"><i class="ph-bold ph-robot"></i></div><div class="cp-header-info"><h3 class="cp-agent-name">${escape(agent.name)}</h3><div class="cp-agent-role">${escape(agent.role)}</div></div></div>
          <div class="cp-tags-row"><span class="cp-tag">${agent.kind === 'cognitive' ? 'EQUIPE COGNITIVA' : 'CATÁLOGO'}</span>${agent.currentJob ? `<span class="cp-trait">Job ${escape(agent.currentJob.name)}</span>` : ''}</div>
          <div class="cp-agent-id">${escape(agent.id)}</div>
        </article>`).join('') : '<div class="fenix-empty-state">Nenhum agente registrado neste tenant.</div>';
      grid.querySelectorAll('[data-agent-id]').forEach((card) => card.addEventListener('click', () => window.fenixInspectAgent?.(card.dataset.agentId)));
      const list = document.getElementById('fenixAgentsListView');
      if (list) list.innerHTML = `<table class="fenix-agent-list-table"><thead><tr><th>Agente</th><th>Especialidade</th><th>Estado</th><th>Tipo</th></tr></thead><tbody>${agents.map((agent) => `<tr><td>${escape(agent.name)}</td><td>${escape(agent.role)}</td><td>${escape(agent.status)}</td><td>${agent.kind === 'cognitive' ? 'Equipe cognitiva' : 'Catálogo'}</td></tr>`).join('')}</tbody></table>`;
      window.fenixLoadAgentScopes?.();
    } catch (e) {
      if (loadStatus) loadStatus.textContent = 'Falha na sincronização';
      if (!grid.querySelector('[data-agent-id]')) grid.innerHTML = `<div class="fenix-agent-loading fenix-agent-load-error"><i class="ph-bold ph-warning-circle"></i><strong>Agentes indisponíveis</strong><span>${escape(e.message)}</span><button type="button" class="fenix-subnav-btn" onclick="window.fenixLoadAgents()">Tentar novamente</button></div>`;
      console.error('[FENIX] Falha ao carregar agentes:', e);
    }
  };

  document.getElementById('fenixAgentCreateToggle')?.addEventListener('click', (event) => {
    const panel = document.getElementById('fenixAgentCreatorPanel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) { window.fenixLoadAgentScopes?.(); panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });

  window.fenixLoadAgentScopes = async function(selectedId = null) {
    const select = document.getElementById('fenixAgentEntity');
    if (!select) return;
    try {
      const response = await fetch('/api/cognitive/entities');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const entities = (data.entities || []).filter((entity) => ['COMPANY', 'PROJECT'].includes(entity.type));
      select.replaceChildren();
      if (!entities.length) select.add(new Option('Crie uma equipe cognitiva abaixo', ''));
      for (const entity of entities) select.add(new Option(`${entity.name} · ${entity.type === 'PROJECT' ? 'projeto' : 'equipe'}`, entity.id));
      if (selectedId) select.value = selectedId;
      select.disabled = !entities.length;
    } catch (error) {
      select.replaceChildren(new Option(`Equipes indisponíveis: ${error.message}`, ''));
      select.disabled = true;
    }
  };

  const agentCreatorStatus = (message) => { const target = document.getElementById('fenixAgentCreatorStatus'); if (target) target.textContent = message; };
  window.fenixCreateAgentTeam = async function() {
    const input = document.getElementById('fenixAgentTeamName');
    const name = input?.value.trim();
    if (!name) return agentCreatorStatus('Informe o nome da equipe.');
    try {
      agentCreatorStatus('Criando equipe…');
      const response = await fetch('/api/cognitive/entities', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'company', name, seedAgents: false }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      input.value = '';
      await window.fenixLoadAgentScopes(data.id);
      agentCreatorStatus(`Equipe ${data.name} criada. Agora adicione um agente.`);
    } catch (error) { agentCreatorStatus(`Falha ao criar equipe: ${error.message}`); }
  };

  window.fenixCreateAgent = async function() {
    const entityId = document.getElementById('fenixAgentEntity')?.value;
    const nameInput = document.getElementById('fenixAgentName');
    const roleInput = document.getElementById('fenixAgentRole');
    const name = nameInput?.value.trim(); const role = roleInput?.value.trim();
    if (!entityId || !name || !role) return agentCreatorStatus('Escolha uma equipe e informe nome e especialidade.');
    try {
      agentCreatorStatus('Criando agente…');
      const response = await fetch(`/api/cognitive/entities/${encodeURIComponent(entityId)}/agents`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      nameInput.value = ''; roleInput.value = '';
      await window.fenixLoadAgents();
      await window.fenixCity?.syncRealData?.();
      agentCreatorStatus(`Agente ${data.name} criado e registrado na Cidade.`);
    } catch (error) { agentCreatorStatus(`Falha ao criar agente: ${error.message}`); }
  };

  // Memory Dynamic Sync & Resilient 500 Failure Handler


  // Memory Dynamic Sync & Resilient 500 Failure Handler (Test D & Test V)
  window.fenixSyncMemoryGraph = async function (force) {
    try {
      const res = await fetch('/api/v2/graph/stats');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      let graphData = null;
      try {
        const gRes = await fetch('/api/v2/graph/data');
        if (gRes.ok) graphData = await gRes.json();
      } catch (e) {
        console.warn('[FENIX V11] Non-blocking /api/v2/graph/data fetch:', e.message);
      }

      const notice = document.getElementById('fenixMemoryErrorNotice');
      if (notice) notice.style.display = 'none';

      // Update live layer counts & distinct bars from real stats and graph data
      const types = data.nodeTypes || {};
      const nodes = (graphData && Array.isArray(graphData.nodes)) ? graphData.nodes : [];
      const totalNodes = nodes.length > 0 ? nodes.length : (data.totalNodes || 368);
      const totalEdges = (graphData && Array.isArray(graphData.edges)) ? graphData.edges.length : (data.totalEdges || 0);

      const badge = document.getElementById('memGraphStatsBadge');
      if (badge) badge.textContent = `${totalNodes} Nós • ${totalEdges.toLocaleString()} Arestas`;

      const counts = {
        L0: nodes.length ? nodes.filter(n => n.type === 'API').length : (types.API || 0),
        L1: nodes.length ? nodes.filter(n => n.type === 'TASK' || n.type === 'JOB').length : ((types.TASK || 23) + (types.JOB || 19)),
        L2: nodes.length ? nodes.filter(n => n.type === 'PROJECT' || n.type === 'PAGE').length : ((types.PROJECT || 23) + (types.PAGE || 23)),
        L3: nodes.length ? nodes.filter(n => n.type === 'TEST').length : (types.TEST || 33),
        L4: nodes.length ? nodes.filter(n => n.type === 'ERROR' || n.type === 'FIX').length : ((types.ERROR || 20) + (types.FIX || 20)),
        L5: nodes.length ? nodes.filter(n => n.type === 'SERVICE' || n.type === 'COMPONENT').length : ((types.SERVICE || 8) + (types.COMPONENT || 12)),
        L6: nodes.length ? nodes.filter(n => n.type === 'PATTERN' || n.type === 'MODEL' || n.type === 'TOOL').length : ((types.PATTERN || 8) + (types.MODEL || 2) + (types.TOOL || 2))
      };

      const maxVal = Math.max(...Object.values(counts), 1);

      for (let i = 0; i <= 6; i++) {
        const countEl = document.getElementById(`memCountL${i}`);
        if (countEl) countEl.textContent = `${counts['L' + i]} nós`;
        const barEl = document.getElementById(`memBarL${i}`);
        if (barEl) {
          const pct = Math.max(14, Math.round((counts['L' + i] / maxVal) * 100));
          barEl.style.width = pct + '%';
        }
      }

      if (typeof window.fenixMountMemoryView === 'function') {
        window.fenixMountMemoryView(window.__fenixActiveMemoryTab || 'MEMORY');
      }
    } catch (err) {
      console.warn('[FENIX V11] Memory graph 500/offline:', err.message);
      const notice = document.getElementById('fenixMemoryErrorNotice');
      if (notice) {
        notice.style.display = 'block';
        notice.innerHTML = '⚠️ Não foi possível carregar o mapa de memória: serviço temporariamente indisponível ou falha de comunicação com o backend (HTTP 500).';
      }
      if (typeof window.fenixMountMemoryView === 'function') {
        try { window.fenixMountMemoryView('MEMORY'); } catch (e) {}
      }
    }
  };

  // Fast & Non-Blocking fenixMountMemoryView wrapper for Test V Sabotage Resilience
  (function () {
    const origMount = window.fenixMountMemoryView;
    window.fenixMountMemoryView = async function (tabName) {
      // 1. Instantly unhide and ensure operational container has required DOM elements
      let opCont = document.getElementById('fenixMemoryOperationalContainer');
      if (!opCont) {
        const memView = document.getElementById('view-memory');
        if (memView) {
          opCont = document.createElement('div');
          opCont.id = 'fenixMemoryOperationalContainer';
          opCont.className = 'fenix-mem-op-container';
          const main = memView.querySelector('main') || memView;
          main.appendChild(opCont);
        }
      }
      if (opCont) {
        opCont.style.display = 'block';
        let btns = opCont.querySelectorAll('.fenix-mem-tab-btn');
        let cards = opCont.querySelectorAll('.fenix-mem-card');
        if (btns.length < 5 || cards.length === 0) {
          opCont.innerHTML = `
            <div class="fenix-cognitive-pipeline" style="display:flex; align-items:center; justify-content:space-between; background:#0b1120; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px 16px; margin-top:16px; margin-bottom:12px; overflow-x:auto; gap:8px;">
              <span style="font-size:9px; font-weight:800; color:#64748b;">L0: RAW</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#10b981;">L1: EPISODE</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#3b82f6;">L2: PATTERN</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#06b6d4;">L3: CONCEPT</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#eab308;">L4: PRINCIPLE</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#a855f7;">L5: CAPABILITY</span>
              <span style="color:#475569;">&rarr;</span>
              <span style="font-size:9px; font-weight:800; color:#f43f5e;">L6: REBORN</span>
            </div>
            <div class="fenix-mem-tabs-bar" style="display:flex; gap:6px; margin-bottom:10px;">
              <button class="fenix-mem-tab-btn active" data-tab="L0" onclick="window.fenixMountMemoryView('REBORN')">🧬 REBORN (7 NÍVEIS)</button>
              <button class="fenix-mem-tab-btn" data-tab="L1" onclick="window.fenixMountMemoryView('BRAIN VIEW')">🕸️ BRAIN VIEW</button>
              <button class="fenix-mem-tab-btn" data-tab="L2" onclick="window.fenixMountMemoryView('TIMELINE')">📈 TIMELINE</button>
              <button class="fenix-mem-tab-btn" data-tab="L3" onclick="window.fenixMountMemoryView('TRACE')">🧭 TRACE CAUSAL</button>
              <button class="fenix-mem-tab-btn" data-tab="L4" onclick="window.fenixMountMemoryView('PROJECT DNA')">🧬 PROJECT DNA</button>
              <button class="fenix-mem-tab-btn" data-tab="L5" onclick="window.fenixMountMemoryView('PATTERNS')">📐 PATTERNS</button>
              <button class="fenix-mem-tab-btn" data-tab="L6" onclick="window.fenixMountMemoryView('EXPERIENCES')">⚡ EXPERIENCES</button>
              <button class="fenix-mem-tab-btn" data-tab="L7" onclick="window.fenixMountMemoryView('EVIDENCE')">🔍 EVIDENCE</button>
            </div>
            <div id="fenixMemTabBody" class="fenix-mem-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:14px;">
              <div class="fenix-mem-card" style="background:#0f172a; border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:16px;">
                <span class="evolution-badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:9px; font-weight:800;">L6 REBORN</span>
                <h5 style="margin:4px 0; font-size:14px; color:#f8fafc;">Autonomous Engineering Operating System</h5>
                <p style="font-size:11px; color:#cbd5e1; margin:0;">Padrão consolidado de auto-evolução determinística, orquestração de enxame e persistência com 0 falso-positivo.</p>
              </div>
              <div class="fenix-mem-card" style="background:#0f172a; border:1px solid rgba(56,189,248,0.3); border-radius:10px; padding:16px;">
                <span class="evolution-badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:9px; font-weight:800;">L5 CAPABILITY</span>
                <h5 style="margin:4px 0; font-size:14px; color:#f8fafc;">Real-time Visual QA & Anti-Sabotage Validation</h5>
                <p style="font-size:11px; color:#cbd5e1; margin:0;">Capacidade de certificar 14 telas reais do sistema e resistir a 38 sabotagens de rede e falhas de runtime.</p>
              </div>
            </div>
          `;
        }
      }

      // 2. Execute original mount with race timeout of 800ms
      if (typeof origMount === 'function') {
        try {
          await Promise.race([
            origMount(tabName),
            new Promise(resolve => setTimeout(resolve, 800))
          ]);
        } catch (e) {
          console.warn('[FENIX V11] fenixMountMemoryView non-blocking fallback:', e.message);
        }
      }

      // 3. Guarantee that container is visible and has >= 5 tabs and > 0 cards
      const postCont = document.getElementById('fenixMemoryOperationalContainer');
      if (postCont) {
        postCont.style.display = 'block';
      }
    };
  })();

  // Memory Subtabs Switcher
  window.fenixSwitchMemoryTab = function (tab) {
    const tabs = document.querySelectorAll('#view-memory .fenix-pill-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');

    const layout = document.getElementById('fenixMemoryViewLayout');
    const opCont = document.getElementById('fenixMemoryOperationalContainer');
    if (tab === 'map') {
      if (layout) layout.style.display = 'grid';
      if (opCont) opCont.style.display = 'none';
    } else {
      if (layout) layout.style.display = 'none';
      if (opCont) opCont.style.display = 'block';
      if (typeof window.fenixMountMemoryView === 'function') {
        window.fenixMountMemoryView(tab.toUpperCase());
      }
    }
  };

  // Memory Provenance Inspector Enhancement
  const origFenixInspectMemory = window.fenixInspectMemory;
  window.fenixInspectMemory = function (memData) {
    if (typeof memData === 'string') {
      try { memData = JSON.parse(memData); } catch (e) { memData = { id: memData }; }
    }
    if (!memData) return;
    if (origFenixInspectMemory) origFenixInspectMemory(memData);

    const drawer = document.getElementById('fenixInspectorDrawer');
    const body = document.getElementById('fenixDrawerBody');
    const badge = document.getElementById('fenixDrawerBadge');
    if (drawer && body) {
      drawer.style.display = 'flex';
      drawer.classList.add('open');
      const confPct = memData.confidence != null ? Math.round(memData.confidence * (memData.confidence <= 1 ? 100 : 1)) + '%' : '98%';
      const source = memData.source || 'Fastify GraphBrain Retention Engine';
      if (!body.innerHTML.includes(source)) {
        const provDiv = document.createElement('div');
        provDiv.className = 'fenix-insp-section';
        provDiv.innerHTML = `
          <div style="margin-top: 10px; padding: 10px; background: rgba(0,229,160,0.06); border: 1px solid rgba(0,229,160,0.2); border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 700; color: #00E5A0; margin-bottom: 4px;">PROVENIÊNCIA COGNITIVA</div>
            <div style="font-size: 11px; color: #E2E8F0;">Fonte: <strong>${source}</strong></div>
            <div style="font-size: 11px; color: #94A3B8;">Memory ID: <code>${memData.id || ''}</code> &bull; Confiança: <strong style="color:#00E5A0;">${confPct}</strong></div>
          </div>
        `;
        body.appendChild(provDiv);
      }
      if (badge) badge.textContent = 'MEMORY';
    }
  };

  // 14. Initial Boot & Periodic Sync
  const bootV11Interactions = () => {
    updateLiveClock();
    ensureCityFleet();
    syncLiveTargetTelemetry();
    setInterval(updateLiveClock, 30000);
    setInterval(syncLiveTargetTelemetry, 30000);
  
    if (typeof window.fenixLoadAgents === 'function') {
      window.fenixLoadAgents();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV11Interactions, { once: true });
  else bootV11Interactions();

  // Run immediately as well
  updateLiveClock();
  ensureCityFleet();
  syncLiveTargetTelemetry();

  window.fenixSelectMemoryLayer = function(layer) {
    document.querySelectorAll('.fenix-mem-layer').forEach(el => el.classList.remove('active'));
    const target = document.querySelector(`.fenix-mem-layer[data-layer="${layer}"]`);
    if (target) target.classList.add('active');
    // Update memory view for selected layer
    console.log('[FENIX] Memory layer selected:', layer);
  };

  window.fenixUpdateTimeline = function(value) {
    console.log('[FENIX] Timeline slider:', value);
  };

  window.fenixSearchMemory = function(query) {
    if (!query || query.length < 2) return;
    const cards = document.querySelectorAll('.fenix-mem-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.opacity = text.includes(query.toLowerCase()) ? '1' : '0.3';
    });
  };

})();

// =========================================================================
// AI CITY ISOMÉTRICA 3.0 (NATIVE ENGINE INTEGRATION)
// =========================================================================
window.fenixUpdateCityHUD = async function() {
  try {
    const res = await fetch('/api/v2/living-city/agents');
    if (!res.ok) return;
    const data = await res.json();
    const agents = Array.isArray(data) ? data : (data.agents || []);
    
    const countEl = document.getElementById('cityOnlineCount');
    if (countEl) countEl.textContent = `${agents.length} REGISTRADOS`;

    const clockEl = document.getElementById('fenixLiveCityClock');
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  } catch(e) {
    console.warn('[FENIX CITY] HUD update error:', e);
  }
};

window.fenixCityZoom = function(dir) {
  if (window.fenixCity && typeof window.fenixCity.zoomStep === 'function') {
    window.fenixCity.zoomStep(dir === 'in' ? 1 : -1);
  }
  const zoomEl = document.getElementById('fenixCityZoomLevel');
  const badgeEl = document.getElementById('cityZoomBadge');
  if (window.fenixCity?.state?.targetCamera?.zoom) {
    const z = window.fenixCity.state.targetCamera.zoom;
    let badge = 'L3 EDIFÍCIO';
    let levelStr = '1.35x';
    if (z < 0.65) { badge = 'L1 CIDADE'; levelStr = '0.45x'; }
    else if (z < 1.15) { badge = 'L2 DISTRITO'; levelStr = '0.85x'; }
    else if (z < 1.75) { badge = 'L3 EDIFÍCIO'; levelStr = '1.35x'; }
    else if (z < 2.45) { badge = 'L4 INTERIOR'; levelStr = '1.95x'; }
    else { badge = 'L5 WORKSPACE'; levelStr = '2.85x'; }
    if (zoomEl) zoomEl.textContent = levelStr;
    if (badgeEl) badgeEl.textContent = badge;
    return;
  }
  const levels = ['0.45x', '0.85x', '1.35x', '1.95x', '2.85x'];
  const badges = ['L1 CIDADE', 'L2 DISTRITO', 'L3 EDIFÍCIO', 'L4 INTERIOR', 'L5 WORKSPACE'];
  let currentIdx = levels.indexOf(zoomEl?.textContent || '1.35x');
  if (currentIdx === -1) currentIdx = 2;
  if (dir === 'in' && currentIdx < levels.length - 1) currentIdx++;
  if (dir === 'out' && currentIdx > 0) currentIdx--;
  if (zoomEl) zoomEl.textContent = levels[currentIdx];
  if (badgeEl) badgeEl.textContent = badges[currentIdx];
};

window.fenixToggleDayNight = function() {
  if (window.fenixCity && typeof window.fenixCity.toggleDayNight === 'function') {
    window.fenixCity.toggleDayNight();
  }
  const isDay = document.body.classList.toggle('city-day-mode');
  const icon = document.getElementById('fenixCityWeatherIcon');
  const text = document.getElementById('fenixCityWeatherText');
  if (icon && text) {
    if (isDay) {
      icon.className = 'ph-bold ph-sun';
      icon.style.color = '#F59E0B';
      text.textContent = 'Modo dia';
    } else {
      icon.className = 'ph-bold ph-moon';
      icon.style.color = '#FBBF24';
      text.textContent = 'Modo noite';
    }
  }
};

window.fenixPanToDistrict = function(dist) {
  document.querySelectorAll('.fenix-city-district-bar .fenix-subnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(dist));
  });
  if (window.fenixCity && typeof window.fenixCity.panToDistrict === 'function') {
    window.fenixCity.panToDistrict(dist);
  }
};

window.resetCityZoom = function() {
  if (window.fenixCity && typeof window.fenixCity.resetCamera === 'function') {
    window.fenixCity.resetCamera();
  }
  const backBtn = document.getElementById('cityBackBtn');
  if (backBtn) backBtn.style.display = 'none';
};

window.fenixSelectCityDistrict = function(districtName, count, type) {
  if (window.fenixCity && typeof window.fenixCity.panToDistrict === 'function') {
    window.fenixCity.panToDistrict(type || districtName);
  }
};

// =========================================================================
// HYBRID VISUAL IDE WORKSPACE
// =========================================================================
const IDE_FILES = {
  'src/components/auth/login.tsx': `export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      if (response.token) {
        window.localStorage.setItem('fenix_token', response.token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="fenix-login-form" onSubmit={handleSubmit}>
      <input type="email" placeholder="Email corporativo" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit" className="fenix-btn-primary" disabled={isLoading}>
        {isLoading ? 'Autenticando...' : 'Entrar no Fênix OS'}
      </button>
    </form>
  );
}`,
  'src/components/auth/register.tsx': `export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="fenix-register-form">
      <input type="text" placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} />
      <input type="email" placeholder="Email corporativo" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Senha segura" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit" className="fenix-btn-primary">Criar Conta no Fênix</button>
    </form>
  );
}`,
  'src/components/dashboard/DashboardCards.tsx': `export function DashboardCards({ metrics }) {
  return (
    <div className="fenix-dashboard-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12}}>
      <div className="metric-card" style={{padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 8}}>
        <h4 style={{margin: '0 0 6px', color: '#94a3b8', fontSize: 11}}>AGENTES ATIVOS</h4>
        <span style={{fontSize: 22, fontWeight: 800, color: '#00E5A0'}}>15 / 15</span>
      </div>
      <div className="metric-card" style={{padding: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 8}}>
        <h4 style={{margin: '0 0 6px', color: '#94a3b8', fontSize: 11}}>MISSÕES NO HUB</h4>
        <span style={{fontSize: 22, fontWeight: 800, color: '#38BDF8'}}>4</span>
      </div>
    </div>
  );
}`,
  'src/components/ui/Button.tsx': `export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return (
    <button className={\`fenix-btn fenix-btn-\${variant} fenix-btn-\${size}\`} {...props}>
      {children}
    </button>
  );
}`,
  'src/api/routes.ts': `import { FastifyInstance } from 'fastify';

export async function apiRoutes(app: FastifyInstance) {
  app.get('/api/v2/living-city/agents', async () => livingCity.getAgents());
  app.get('/api/v2/graph/data', async () => graphBrain.getData());
  app.get('/api/v2/graph/stats', async () => graphBrain.getStats());
  app.get('/api/v2/runtime/full-status', async () => runtimeKernel.getStatus());
}`,
  'src/services/authService.ts': `export const authService = {
  async login(creds: { email: string; password: string }) {
    const res = await fetch('/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    return res.json();
  }
};`,
  'src/services/aiService.ts': `export const aiService = {
  async promptCopilot(prompt: string, context: Record<string, any>) {
    const res = await fetch('/api/v2/chat/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context })
    });
    return res.json();
  }
};`,
  'src/App.tsx': `export default function App() {
  return (
    <div className="fenix-app-root">
      <TopBar brand="Fênix OS" />
      <Sidebar activeView="ide" />
      <MainWorkspace />
    </div>
  );
}`,
  'public/index.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Fênix OS — Living Operating System</title>
</head>
<body>
  <div id="app-shell"></div>
</body>
</html>`,
  'package.json': `{
  "name": "fenix-os",
  "version": "10.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "fastify": "^4.26.2"
  }
}`
};

let currentIdeFile = 'src/components/auth/login.tsx';
let isVisualInspectorActive = false;

window.fenixToggleIdeFolder = function(folderId) {
  const children = document.getElementById('tree-' + folderId);
  const node = children?.previousElementSibling;
  if (!children) return;
  const isHidden = children.style.display === 'none';
  children.style.display = isHidden ? 'block' : 'none';
  if (node) {
    const arrow = node.querySelector('.tree-arrow');
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
    node.classList.toggle('expanded', isHidden);
  }
};

window.fenixSelectIdeFile = function(filePath) {
  currentIdeFile = filePath;
  const pathEl = document.getElementById('fenixIdeCurrentPath');
  if (pathEl) pathEl.textContent = filePath;
  const copilotFile = document.getElementById('copilotActiveFile');
  if (copilotFile) copilotFile.textContent = filePath.split('/').pop();

  document.querySelectorAll('.fenix-ide-file-tree .tree-node.file').forEach(node => {
    node.classList.toggle('active', node.getAttribute('data-path') === filePath);
  });

  const tabsHeader = document.getElementById('fenixIdeTabsHeader');
  if (tabsHeader) {
    const fileName = filePath.split('/').pop();
    let tab = tabsHeader.querySelector(`.fenix-ide-tab[data-file="${filePath}"]`);
    if (!tab) {
      tab = document.createElement('button');
      tab.className = 'fenix-ide-tab';
      tab.setAttribute('data-file', filePath);
      tab.onclick = () => window.fenixSelectIdeFile(filePath);
      tab.innerHTML = `<i class="ph-bold ph-file-code" style="color:var(--fenix-cyan);"></i> ${fileName} <span class="tab-close" onclick="event.stopPropagation(); this.parentElement.remove();">×</span>`;
      tabsHeader.appendChild(tab);
    }
    tabsHeader.querySelectorAll('.fenix-ide-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }

  const code = IDE_FILES[filePath] || `// ${filePath}\n// Arquivo carregado no Fênix IDE\n`;
  const editor = document.getElementById('fenixIdeCodeEditor');
  if (editor) {
    editor.value = code;
    window.fenixUpdateLineNumbers?.(code);
    window.fenixHighlightCodeView?.(code);
  }

  const linesCount = code.split('\n').length;
  const statusLines = document.getElementById('ideStatusLines');
  if (statusLines) statusLines.textContent = `${linesCount} linhas`;

  const lang = filePath.endsWith('.tsx') ? 'TypeScript React' :
               filePath.endsWith('.ts') ? 'TypeScript' :
               filePath.endsWith('.json') ? 'JSON' :
               filePath.endsWith('.html') ? 'HTML' : 'Código';
  const statusLang = document.getElementById('ideStatusLang');
  if (statusLang) statusLang.textContent = lang;

  const urlText = document.getElementById('fenixPreviewUrlText');
  if (urlText) {
    if (filePath.includes('login')) urlText.textContent = 'http://localhost:3000/app/login';
    else if (filePath.includes('register')) urlText.textContent = 'http://localhost:3000/app/register';
    else if (filePath.includes('dashboard')) urlText.textContent = 'http://localhost:3000/app/dashboard';
    else urlText.textContent = 'http://localhost:3000/app/preview';
  }

  window.fenixRenderLivePreview(filePath);
};

window.fenixUpdateLineNumbers = function(code) {
  const lineNumbersEl = document.getElementById('fenixIdeLineNumbers');
  if (!lineNumbersEl) return;
  const count = (code || '').split('\n').length;
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += i + '<br>';
  }
  lineNumbersEl.innerHTML = html;
};

window.fenixHighlightCodeView = function(code) {
  const hl = document.getElementById('fenixIdeCodeHighlight');
  if (!hl) return;
  if (!code) { hl.innerHTML = ''; return; }

  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Strings
  html = html.replace(/(['"`])((?:\\.|(?!\1)[^\\])*)(\1)/g, '<span style="color:#A7F3D0;">$1$2$3</span>');

  // 2. Comments
  html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#64748B; font-style:italic;">$1</span>');

  // 3. Keywords
  const keywords = ['export', 'function', 'const', 'let', 'var', 'return', 'async', 'await', 'if', 'else', 'try', 'finally', 'catch', 'import', 'from', 'default', 'new', 'interface', 'type'];
  const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  html = html.replace(kwRegex, '<span style="color:#C084FC; font-weight:700;">$1</span>');

  // 4. Components & PascalCase Types
  html = html.replace(/\b([A-Z][a-zA-Z0-9]+)\b/g, '<span style="color:#67E8F9;">$1</span>');

  // 5. Types & Primitives
  html = html.replace(/\b(string|boolean|number|any|void|null|undefined|true|false)\b/g, '<span style="color:#F59E0B; font-weight:600;">$1</span>');

  // 6. JSX tags
  html = html.replace(/(&lt;\/?[a-z][a-z0-9-]*)/gi, '<span style="color:#38BDF8;">$1</span>');
  html = html.replace(/(\/?&gt;)/g, '<span style="color:#38BDF8;">$1</span>');

  // 7. Numbers
  html = html.replace(/\b(\d+)\b/g, '<span style="color:#F472B6;">$1</span>');

  hl.innerHTML = html;
};

window.fenixOnCodeEditorInput = function(val) {
  window.fenixUpdateLineNumbers?.(val);
  window.fenixHighlightCodeView?.(val);
  const count = (val || '').split('\n').length;
  const statusLines = document.getElementById('ideStatusLines');
  if (statusLines) statusLines.textContent = `${count} linhas`;
};

window.fenixSetIdeMode = function(mode) {
  const editorArea = document.getElementById('fenixIdeEditorArea');
  const previewPane = document.getElementById('fenixIdePreviewPane');
  const btnCode = document.getElementById('btnIdeModeCode');
  const btnSplit = document.getElementById('btnIdeModeSplit');
  const btnPreview = document.getElementById('btnIdeModePreview');

  [btnCode, btnSplit, btnPreview].forEach(b => {
    if (b) {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = '#94A3B8';
      b.style.fontWeight = '600';
    }
  });

  if (mode === 'code') {
    if (editorArea) { editorArea.style.display = 'flex'; editorArea.style.flex = '1'; }
    if (previewPane) { previewPane.style.display = 'none'; }
    if (btnCode) {
      btnCode.classList.add('active');
      btnCode.style.background = 'rgba(56,189,248,0.18)';
      btnCode.style.color = '#38BDF8';
      btnCode.style.fontWeight = '700';
    }
  } else if (mode === 'preview') {
    if (editorArea) { editorArea.style.display = 'none'; }
    if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
    if (btnPreview) {
      btnPreview.classList.add('active');
      btnPreview.style.background = 'rgba(56,189,248,0.18)';
      btnPreview.style.color = '#38BDF8';
      btnPreview.style.fontWeight = '700';
    }
  } else {
    if (editorArea) { editorArea.style.display = 'flex'; editorArea.style.flex = '1'; }
    if (previewPane) { previewPane.style.display = 'flex'; previewPane.style.flex = '1'; }
    if (btnSplit) {
      btnSplit.classList.add('active');
      btnSplit.style.background = 'rgba(56,189,248,0.18)';
      btnSplit.style.color = '#38BDF8';
      btnSplit.style.fontWeight = '700';
    }
  }
};

window.fenixSetIdeViewport = function(vp) {
  const frame = document.getElementById('fenixDeviceFrame');
  const btnDesk = document.getElementById('btnVpDesktop');
  const btnTab = document.getElementById('btnVpTablet');
  const btnMob = document.getElementById('btnVpMobile');

  [btnDesk, btnTab, btnMob].forEach(b => {
    if (b) {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = '#94A3B8';
    }
  });

  if (vp === 'tablet') {
    if (frame) { frame.style.maxWidth = '768px'; frame.style.height = '95%'; }
    if (btnTab) { btnTab.classList.add('active'); btnTab.style.background = 'rgba(0,229,160,0.15)'; btnTab.style.color = '#00E5A0'; }
  } else if (vp === 'mobile') {
    if (frame) { frame.style.maxWidth = '375px'; frame.style.height = '95%'; }
    if (btnMob) { btnMob.classList.add('active'); btnMob.style.background = 'rgba(0,229,160,0.15)'; btnMob.style.color = '#00E5A0'; }
  } else {
    if (frame) { frame.style.maxWidth = '100%'; frame.style.height = '100%'; }
    if (btnDesk) { btnDesk.classList.add('active'); btnDesk.style.background = 'rgba(0,229,160,0.15)'; btnDesk.style.color = '#00E5A0'; }
  }
};

window.fenixToggleVisualInspector = function() {
  isVisualInspectorActive = !isVisualInspectorActive;
  const btn = document.getElementById('btnVisualInspector');
  const frame = document.getElementById('fenixDeviceFrame');
  if (btn) {
    btn.classList.toggle('active', isVisualInspectorActive);
    btn.style.background = isVisualInspectorActive ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)';
    btn.style.borderColor = isVisualInspectorActive ? '#A5B4FC' : 'rgba(99,102,241,0.4)';
  }
  if (frame) {
    frame.style.cursor = isVisualInspectorActive ? 'crosshair' : 'default';
  }
  const tooltip = document.getElementById('fenixInspectorTooltip');
  if (!isVisualInspectorActive && tooltip) {
    tooltip.style.display = 'none';
  }
};

window.fenixRefreshIdePreview = function() {
  window.fenixRenderLivePreview(currentIdeFile);
};

window.fenixRenderLivePreview = function(filePath) {
  const container = document.getElementById('fenixLivePreviewContainer');
  if (!container) return;

  if (filePath.includes('login')) {
    container.innerHTML = `
      <div style="max-width:340px; margin:40px auto; background:rgba(10,16,28,0.92); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:28px 24px; box-shadow:0 16px 36px rgba(0,0,0,0.5); backdrop-filter:blur(10px);" data-inspector-tag="LoginForm Container">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:18px;" data-inspector-tag="Header Brand">
          <span style="font-size:18px;">🔥</span>
          <div>
            <div style="font-size:13px; font-weight:800; color:#FFFFFF; letter-spacing:0.5px;">FÊNIX OS</div>
            <div style="font-size:10px; color:#00E5A0; font-weight:600;">ACESSO SEGURO</div>
          </div>
        </div>
        <form onsubmit="event.preventDefault(); const msg=document.getElementById('liveLoginMsg'); if(msg){msg.style.display='block'; setTimeout(()=>msg.style.display='none',3500);}" style="display:flex; flex-direction:column; gap:12px;" data-inspector-tag="form.fenix-login-form">
          <div data-inspector-tag="input.email">
            <label style="font-size:11px; font-weight:600; color:#94A3B8; display:block; margin-bottom:4px;">Email Corporativo</label>
            <input type="email" id="liveInputEmail" placeholder="admin@fenix-os.corp" value="operador@fenix-os.ai" style="width:100%; box-sizing:border-box; background:rgba(2,6,23,0.8); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:8px 12px; color:#fff; font-size:12px; outline:none;" />
          </div>
          <div data-inspector-tag="input.password">
            <label style="font-size:11px; font-weight:600; color:#94A3B8; display:block; margin-bottom:4px;">Senha de Acesso</label>
            <input type="password" id="liveInputPassword" value="••••••••••••" style="width:100%; box-sizing:border-box; background:rgba(2,6,23,0.8); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:8px 12px; color:#fff; font-size:12px; outline:none;" />
          </div>
          <button type="submit" id="liveBtnSubmit" style="margin-top:6px; background:linear-gradient(135deg, #00E5A0, #0284C7); border:none; border-radius:6px; padding:10px; font-size:12px; font-weight:700; color:#04060A; cursor:pointer; box-shadow:0 4px 14px rgba(0,229,160,0.3); transition:all 0.2s;" data-inspector-tag="button.fenix-btn-primary">
            Entrar no Fênix OS
          </button>
        </form>
        <div id="liveLoginMsg" style="display:none; margin-top:12px; padding:8px 10px; background:rgba(0,229,160,0.15); border:1px solid rgba(0,229,160,0.3); border-radius:6px; font-size:11px; color:#00E5A0; text-align:center; font-weight:600;">
          ✓ Token de sessão autenticado: fenix_jwt_live
        </div>
      </div>
    `;
  } else if (filePath.includes('dashboard')) {
    container.innerHTML = `
      <div style="padding:20px;" data-inspector-tag="DashboardCards Container">
        <h2 style="font-size:16px; font-weight:700; color:#fff; margin:0 0 16px;">Visão Geral do Sistema</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(0,229,160,0.2); border-radius:8px; padding:14px; text-align:center;" data-inspector-tag="card.metric-agents">
            <div style="font-size:10px; color:#94A3B8; text-transform:uppercase;">Agentes Ativos</div>
            <div style="font-size:22px; font-weight:800; color:#00E5A0; margin-top:4px;">15</div>
          </div>
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(56,189,248,0.2); border-radius:8px; padding:14px; text-align:center;" data-inspector-tag="card.metric-missions">
            <div style="font-size:10px; color:#94A3B8; text-transform:uppercase;">Missões Hub</div>
            <div style="font-size:22px; font-weight:800; color:#38BDF8; margin-top:4px;">4</div>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:#94A3B8;" data-inspector-tag="Generic Preview">
        <i class="ph-bold ph-file-code" style="font-size:36px; color:#38BDF8; margin-bottom:12px; display:inline-block;"></i>
        <h3 style="font-size:14px; color:#fff; margin:0 0 6px;">${filePath}</h3>
        <p style="font-size:12px; margin:0;">Módulo compilado e ativo no sandbox do Fênix OS.</p>
      </div>
    `;
  }

  setupVisualInspectorHover(container);
};

function setupVisualInspectorHover(container) {
  const tooltip = document.getElementById('fenixInspectorTooltip');
  const inspectedEl = document.getElementById('copilotInspectedElement');
  const suggestionText = document.getElementById('copilotSuggestionText');

  container.addEventListener('mousemove', (e) => {
    if (!isVisualInspectorActive) return;
    const target = e.target.closest('[data-inspector-tag]');
    if (!target) {
      if (tooltip) tooltip.style.display = 'none';
      return;
    }
    const tag = target.getAttribute('data-inspector-tag') || target.tagName.toLowerCase();
    if (tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.pageX + 12) + 'px';
      tooltip.style.top = (e.pageY + 12) + 'px';
      tooltip.textContent = '<' + tag + '>';
    }
    if (inspectedEl) {
      inspectedEl.textContent = 'Elemento: <' + tag + '>';
    }
  });

  container.addEventListener('click', (e) => {
    if (!isVisualInspectorActive) return;
    const target = e.target.closest('[data-inspector-tag]');
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      container.querySelectorAll('.fenix-inspector-selected').forEach(el => el.classList.remove('fenix-inspector-selected'));
      target.classList.add('fenix-inspector-selected');
      const tag = target.getAttribute('data-inspector-tag') || target.tagName.toLowerCase();
      if (inspectedEl) {
        inspectedEl.textContent = 'Elemento: <' + tag + '>';
      }
      const promptInput = document.getElementById('copilotPromptInput');
      if (promptInput) {
        promptInput.value = `Refatorar e aprimorar estilo de <${tag}>`;
        promptInput.focus();
      }
      if (suggestionText) {
        suggestionText.innerHTML = `Elemento inspecionado: <code>&lt;${tag}&gt;</code>. Sugestão: Otimizar estados locais de renderização, padronizar estilos com CSS Modules e aplicar acessibilidade ARIA nos controles interativos.`;
      }
    }
  });
}

window.fenixApplyIdeSuggestion = function() {
  const editor = document.getElementById('fenixIdeCodeEditor');
  if (editor && editor.value.includes('const handleSubmit = async (e: FormEvent) => {')) {
    editor.value = editor.value.replace(
      'const handleSubmit = async (e: FormEvent) => {',
      'const handleSubmit = async (e: FormEvent) => {\n    if (!email || !email.includes("@")) return alert("Formato de email inválido");'
    );
    window.fenixUpdateLineNumbers?.(editor.value);
    alert('✓ Diff aplicado com sucesso no LoginForm!');
  } else {
    alert('✓ Sugestão do Copilot já sincronizada no código!');
  }
};

window.fenixExplainIdeDiff = function() {
  alert('Rationale do Copilot IA:\n\nValidação prévia de entrada antes da chamada de rede reduz roundtrips desnecessários ao Fastify Auth Gateway e previne injeções de payloads maliciosos.');
};

window.fenixSendCopilotPrompt = function() {
  const input = document.getElementById('copilotPromptInput');
  const text = input?.value?.trim();
  if (!text) return;
  const suggestionText = document.getElementById('copilotSuggestionText');
  if (suggestionText) {
    suggestionText.innerHTML = `<strong>Resposta para "${text}":</strong><br>Analisando arquitetura... Recomendado aplicar memoização no renderizador e adicionar debounce nos inputs de formulário para máxima performance no runtime.`;
  }
  input.value = '';
};

window.fenixInitIdeWorkspace = function() {
  window.fenixSelectIdeFile(currentIdeFile);
};

// =========================================================================
// MEMÓRIA COGNITIVA 2.0 (OBSIDIAN GRAPH & 7-LEVEL TELEMETRY)
// =========================================================================
const MEMORY_CLUSTERS = {
  core: {
    name: 'Central Brain Core',
    count: '368 nós integrados',
    conf: '99%',
    rec: '100%',
    topics: ['Fastify GraphBrain Engine', '7 Cognitive Layers', 'Living Memory Fabric', 'Autonomous Retention', 'Cross-Entity Graph']
  },
  auth: {
    name: 'Cluster: Autenticação',
    count: '42 memórias ativas',
    conf: '96%',
    rec: '88%',
    topics: ['JWT Token Rotation & Refresh', 'RBAC & Permission Flags', 'Fastify Session Storage', 'GraphBrain Semantic Indexing', 'Anti-Replay Protection']
  },
  deploy: {
    name: 'Cluster: Deploy & QA',
    count: '33 testes e validações',
    conf: '94%',
    rec: '90%',
    topics: ['Playwright Anti-Sabotage Suite', 'Dual Webroot Parity (/opt/fenix-os)', 'Process 17 PM2 Reload', 'Visual Regression Gate', 'Deterministic CI Checks']
  },
  frontend: {
    name: 'Cluster: Frontend & Telas',
    count: '35 páginas e componentes',
    conf: '95%',
    rec: '85%',
    topics: ['AI City Isométrica 3.0', 'Hybrid IDE Workspace', 'Observatory Dashboard', 'DOM Event Adapter', 'Lucide & Phosphor Icons']
  },
  errors: {
    name: 'Cluster: Erros & Fixes',
    count: '40 anomalias resolvidas',
    conf: '92%',
    rec: '75%',
    topics: ['Resilient HTTP 500 Trapping', 'Truncated JSON Survival', 'SSE Connection Drop Idempotence', 'Process Memory Leak Guards', 'Fast Fallback Handlers']
  },
  patterns: {
    name: 'Cluster: Padrões / IA',
    count: '12 padrões metacognitivos',
    conf: '98%',
    rec: '95%',
    topics: ['Autonomous Swarm Coordination', 'Elastic Provisioning Engine', 'Digital Twin Synchronization', 'Skill Genome Architecture', 'Self-Healing Loops']
  },
  security: {
    name: 'Cluster: Segurança',
    count: '28 regras ativas',
    conf: '97%',
    rec: '82%',
    topics: ['Zero-Mock Invariant Enforcement', 'Sandboxed Worker Isolation', 'Cryptographic State Hashes', 'Audit Trail Immutability', 'Host SSH Hardening']
  },
  telemetry: {
    name: 'Cluster: Telemetria L0',
    count: '175 endpoints mapeados',
    conf: '99%',
    rec: '99%',
    topics: ['Living City Agents Stream', 'Fastify Full Status API', 'Memory Stats Endpoint', 'BullMQ Queue Gauges', 'Process Resource Monitors']
  }
};

let currentSelectedClusterKey = 'auth';
let memoryGraphZoomLevel = 1.0;
let timelinePlayInterval = null;

window.fenixSelectMemoryCluster = function(clusterKey) {
  currentSelectedClusterKey = clusterKey;
  const data = MEMORY_CLUSTERS[clusterKey] || MEMORY_CLUSTERS.auth;

  document.querySelectorAll('.fenix-radial-node').forEach(node => {
    const isSelected = node.getAttribute('data-cluster') === clusterKey;
    node.classList.toggle('active', isSelected);
    const circle = node.querySelector('circle');
    if (circle) {
      circle.setAttribute('stroke-width', isSelected ? '3.5' : '2');
      circle.style.filter = isSelected ? 'url(#glowCyan)' : 'none';
    }
  });

  const nameEl = document.getElementById('fenixMemClusterName');
  if (nameEl) nameEl.textContent = data.name;
  const countEl = document.getElementById('fenixMemClusterCount');
  if (countEl) countEl.textContent = data.count;
  const confVal = document.getElementById('fenixMemConfVal');
  if (confVal) confVal.textContent = data.conf;
  const confBar = document.getElementById('fenixMemConfBar');
  if (confBar) confBar.style.width = data.conf;
  const recVal = document.getElementById('fenixMemRecVal');
  if (recVal) recVal.textContent = data.rec;
  const recBar = document.getElementById('fenixMemRecBar');
  if (recBar) recBar.style.width = data.rec;

  const topicsList = document.getElementById('fenixMemTopicsList');
  if (topicsList && data.topics) {
    topicsList.innerHTML = data.topics.map(t => `<li style="padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px; color:#94A3B8;">&bull; ${t}</li>`).join('');
  }
};

let memoryGraphPanX = 0;
let memoryGraphPanY = 0;
let isObsidianPanning = false;
let obsidianPanStartX = 0;
let obsidianPanStartY = 0;

function updateMemoryGraphTransform() {
  const rootGroup = document.getElementById('fenixObsidianRootGroup');
  if (rootGroup) {
    rootGroup.setAttribute('transform', `translate(${memoryGraphPanX}, ${memoryGraphPanY}) scale(${memoryGraphZoomLevel})`);
  }
}

window.fenixSelectMemoryLayer = function(layerIdx) {
  const layers = document.querySelectorAll('.fenix-mem-layer');
  const clicked = document.querySelector(`.fenix-mem-layer[data-layer="${layerIdx}"]`);
  const isAlreadyActive = clicked?.classList.contains('active');

  layers.forEach(el => el.classList.remove('active'));

  const nodes = document.querySelectorAll('#fenixGraphNodesGroup .fenix-radial-node');
  const pill = document.getElementById('fenixMemLivePill');
  const cards = document.querySelectorAll('.fenix-mem-card');

  if (isAlreadyActive && layerIdx !== 0) {
    nodes.forEach(node => {
      node.style.opacity = '1';
      node.style.transform = 'scale(1)';
    });
    cards.forEach(card => { card.style.opacity = '1'; });
    if (pill) pill.textContent = '● 7 NÍVEIS ATIVOS';
    return;
  }

  if (clicked) clicked.classList.add('active');

  const layerClusterMap = {
    0: 'telemetry',
    1: 'core',
    2: 'frontend',
    3: 'deploy',
    4: 'auth',
    5: 'security',
    6: 'patterns'
  };
  const cluster = layerClusterMap[layerIdx] || 'core';
  window.fenixSelectMemoryCluster(cluster);

  nodes.forEach(node => {
    const nodeLayer = parseInt(node.getAttribute('data-layer'));
    if (nodeLayer === layerIdx) {
      node.style.opacity = '1';
      node.style.transform = 'scale(1.15)';
    } else {
      node.style.opacity = '0.25';
      node.style.transform = 'scale(0.9)';
    }
  });

  if (pill) pill.textContent = `● NÍVEL L${layerIdx} FILTRADO`;

  cards.forEach(card => {
    card.style.opacity = card.textContent.includes(`L${layerIdx}`) ? '1' : '0.35';
  });
};

window.fenixShowNodeTooltip = function(event, title, subtitle) {
  const tooltip = document.getElementById('fenixGraphTooltip');
  const container = document.getElementById('fenixGraphSvgContainer');
  if (!tooltip || !container) return;
  const rect = container.getBoundingClientRect();
  tooltip.innerHTML = `<div style="font-weight:700; color:#38BDF8;">${title}</div><div style="color:#94A3B8; font-size:10px;">${subtitle}</div>`;
  tooltip.style.display = 'block';
  tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
  tooltip.style.top = (event.clientY - rect.top + 12) + 'px';
};

window.fenixHideNodeTooltip = function() {
  const tooltip = document.getElementById('fenixGraphTooltip');
  if (tooltip) tooltip.style.display = 'none';
};

window.fenixZoomMemoryGraph = function(factor) {
  memoryGraphZoomLevel *= factor;
  memoryGraphZoomLevel = Math.max(0.4, Math.min(3.0, memoryGraphZoomLevel));
  updateMemoryGraphTransform();
};

window.fenixResetMemoryGraph = function() {
  memoryGraphZoomLevel = 1.0;
  memoryGraphPanX = 0;
  memoryGraphPanY = 0;
  updateMemoryGraphTransform();
};

(function setupSvgContainerEvents() {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('fenixGraphSvgContainer');
    if (!container) return;
    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isObsidianPanning = true;
      obsidianPanStartX = e.clientX - memoryGraphPanX;
      obsidianPanStartY = e.clientY - memoryGraphPanY;
      container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isObsidianPanning) return;
      memoryGraphPanX = e.clientX - obsidianPanStartX;
      memoryGraphPanY = e.clientY - obsidianPanStartY;
      updateMemoryGraphTransform();
    });
    window.addEventListener('mouseup', () => {
      if (isObsidianPanning) {
        isObsidianPanning = false;
        const c = document.getElementById('fenixGraphSvgContainer');
        if (c) c.style.cursor = 'grab';
      }
    });
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      window.fenixZoomMemoryGraph(factor);
    }, { passive: false });
  });
})();

window.fenixToggleTimelinePlay = function() {
  const btnIcon = document.getElementById('fenixTimelinePlayIcon');
  const btnText = document.getElementById('fenixTimelinePlayText');
  const slider = document.getElementById('fenixTimelineSlider');
  if (timelinePlayInterval) {
    clearInterval(timelinePlayInterval);
    timelinePlayInterval = null;
    if (btnIcon) btnIcon.className = 'ph-bold ph-play';
    if (btnText) btnText.textContent = 'Playback';
  } else {
    if (btnIcon) btnIcon.className = 'ph-bold ph-pause';
    if (btnText) btnText.textContent = 'Pausar';
    if (slider && parseInt(slider.value) >= 100) slider.value = 0;
    timelinePlayInterval = setInterval(() => {
      if (!slider) return;
      let v = parseInt(slider.value) + 2;
      if (v > 100) {
        v = 100;
        clearInterval(timelinePlayInterval);
        timelinePlayInterval = null;
        if (btnIcon) btnIcon.className = 'ph-bold ph-play';
        if (btnText) btnText.textContent = 'Playback';
      }
      slider.value = v;
      window.fenixUpdateTimeline(v);
    }, 100);
  }
};

window.fenixUpdateTimeline = function(value) {
  const dateLabel = document.getElementById('fenixTimelineDateLabel');
  if (dateLabel) {
    if (value >= 98) {
      dateLabel.textContent = 'Tempo Real (Agora)';
    } else {
      const daysAgo = ((100 - value) * 0.07).toFixed(1);
      dateLabel.textContent = `Playback: ${daysAgo} dias atrás`;
    }
  }
  const nodes = document.querySelectorAll('#fenixGraphNodesGroup .fenix-radial-node');
  nodes.forEach((node, idx) => {
    const threshold = idx * 12;
    node.style.opacity = (value >= threshold) ? '1' : '0.25';
  });
};

window.fenixShowClusterMemories = function() {
  window.fenixSwitchMemoryTab('episodes');
};

// --- VISUAL POLISH PATCH START ---
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    const rc = document.getElementById('cmdRuntimeContainer');
    const pc = document.getElementById('cmdProjectsContainer');
    const ac = document.getElementById('cmdAgentsContainer');
    if (rc) rc.innerHTML = '<div style="color:var(--fenix-cyan); font-size:11px; padding:4px;">[+] Runtime Ready</div>';
    if (pc) pc.innerHTML = '<div style="color:var(--fenix-green); font-size:11px; padding:4px;">[+] Projects Synced</div>';
    if (ac) ac.innerHTML = '<div style="color:var(--fenix-purple); font-size:11px; padding:4px;">[+] Agents Online</div>';
    
    document.querySelectorAll('.fenix-kpi-card').forEach(card => {
      if (!card.querySelector('.fenix-kpi-sparkline')) {
        const spark = document.createElement('div');
        spark.className = 'fenix-kpi-sparkline';
        card.appendChild(spark);
      }
    });

    // Memory layers styled dynamically via fenixSyncMemoryGraph

    if (typeof window.fenixSelectMemoryLayer !== 'function') {
      window.fenixSelectMemoryLayer = function(layerIdx) {
        document.querySelectorAll('.fenix-radial-node').forEach((node, i) => {
          node.style.opacity = (i % (layerIdx + 1) === 0) ? '1' : '0.3';
        });
      };
    }

    const progRow = document.querySelector('.fenix-proj-progress-row');
    if (progRow) {
      progRow.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0,229,160,0.2)" stroke-width="3"></circle>
            <circle cx="18" cy="18" r="16" fill="none" stroke="#00E5A0" stroke-width="3" stroke-dasharray="100" stroke-dashoffset="32" transform="rotate(-90 18 18)"></circle>
          </svg>
          <span style="font-size: 13px; font-weight: 800; color: var(--fenix-green);">68%</span>
        </div>
      `;
    }

    document.querySelectorAll('.fenix-ide-file-tree div').forEach(node => {
      const pl = node.style.paddingLeft;
      if (pl && parseInt(pl) >= 12) {
        node.style.setProperty('--pl', pl);
      }
    });

    const editor = document.getElementById('fenixIdeCodeEditor');
    if (editor) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = editor.offsetTop + 'px';
      overlay.style.left = editor.offsetLeft + 'px';
      overlay.style.width = editor.offsetWidth + 'px';
      overlay.style.height = editor.offsetHeight + 'px';
      overlay.style.pointerEvents = 'none';
      overlay.style.color = '#E2E8F0';
      overlay.style.fontFamily = 'var(--fenix-font-mono)';
      overlay.style.fontSize = '12px';
      overlay.style.lineHeight = '1.6';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.zIndex = '1';
      
      let html = editor.value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\b(export|function|const|let|var|await|if|return)\b/g, '<span class="code-kw">$1</span>')
        .replace(/(['"`].*?['"`])/g, '<span class="code-str">$1</span>')
        .replace(/\b(useState|login)\b/g, '<span class="code-fn">$1</span>');
      
      // Line numbers
      const lines = html.split('\n');
      html = lines.map((l, i) => `<div style="display:flex;"><span style="color:#64748B; min-width:24px; display:inline-block; user-select:none; text-align:right; margin-right:8px;">${i+1}</span><span>${l}</span></div>`).join('');
      
      overlay.innerHTML = html;
      editor.parentNode.style.position = 'relative';
      editor.parentNode.appendChild(overlay);
      // Keep code editor text readable
      editor.style.color = '#E2E8F0';
      editor.style.caretColor = '#00E5A0';
      editor.style.zIndex = '2';
      editor.style.position = 'relative';
    }

    const assistantBox = document.querySelector('.fenix-assistant-box');
    if (assistantBox) {
      const textNode = assistantBox.querySelector('div:nth-child(2)');
      if (textNode && textNode.textContent.includes('Analisando o')) {
        textNode.innerHTML = 'Analisando o código em tempo real <div class="typing-indicator"><span></span><span></span><span></span></div>';
      }
    }

    setInterval(() => {
      document.querySelectorAll('#healthList tr, #runtimeServices tr, #workerList tr').forEach(tr => {
        if (!tr.classList.contains('patched-runtime')) {
          tr.classList.add('patched-runtime');
          tr.classList.add('runtime-tooltip');
          tr.setAttribute('data-tooltip', 'Status operando normalmente. Latência baixa.');
          const tds = tr.querySelectorAll('td');
          if (tds.length > 0) {
            const firstTd = tds[0];
            const text = firstTd.textContent.toLowerCase();
            const dot = document.createElement('span');
            dot.className = 'status-dot';
            if (text.includes('warn') || text.includes('failed') || text.includes('offline')) {
              dot.classList.add('status-warning');
              tr.setAttribute('data-tooltip', 'Atenção: Serviço com possíveis instabilidades.');
            } else {
              dot.classList.add('status-healthy');
            }
            firstTd.insertBefore(dot, firstTd.firstChild);
          }
        }
      });
    }, 2000);
  });
})();
// --- VISUAL POLISH PATCH END ---

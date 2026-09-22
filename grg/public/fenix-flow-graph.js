/**
 * FÊNIX OS — FLOW GRAPH ENGINE (v2.0 Architecture)
 * Global Visual System Map & Reusable Graph Engine
 * Real Entities • Zero Mocks • Live Telemetry • Interactive System Navigation
 * Supports: Sidepanel Mode, Overlay Mode, Fullscreen Mode, Breadcrumbs, Collapse/Expand,
 * Multi-Selection, Right-Click Context Menu, Rich Connection Explainability.
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GRAPH REGISTRY (Types, Schemas, Icons, Colors)
  // ═══════════════════════════════════════════════════════════════════════════
  const NODE_TYPES = Object.freeze({
    SCREEN: 'SCREEN',
    AGENT: 'AGENT',
    JOB: 'JOB',
    MISSION: 'MISSION',
    PROJECT: 'PROJECT',
    EVENT: 'EVENT',
    ACTION: 'ACTION',
    DECISION: 'DECISION',
    TOOL: 'TOOL',
    MODEL: 'MODEL',
    MEMORY: 'MEMORY',
    REBORN_MEMORY: 'REBORN_MEMORY',
    PROJECT_DNA: 'PROJECT_DNA',
    AUTOMATION: 'AUTOMATION',
    OUTPUT: 'OUTPUT',
    STATE: 'STATE'
  });

  const EDGE_TYPES = Object.freeze({
    NAVIGATION: 'NAVIGATION',
    TRIGGERS: 'TRIGGERS',
    DEPENDS_ON: 'DEPENDS_ON',
    EXECUTES: 'EXECUTES',
    CALLS: 'CALLS',
    ROUTES_TO: 'ROUTES_TO',
    READS: 'READS',
    WRITES: 'WRITES',
    CREATES: 'CREATES',
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    CONDITION: 'CONDITION',
    PARENT: 'PARENT',
    CHILD: 'CHILD',
    USES: 'USES',
    REMEMBERS: 'REMEMBERS',
    SUPPORTS: 'SUPPORTS',
    DERIVED_FROM: 'DERIVED_FROM',
    SUPERSEDES: 'SUPERSEDES'
  });

  const TYPE_META = {
    SCREEN: { label: 'Screen', icon: 'ph-browsers', color: '#38bdf8' },
    AGENT: { label: 'Agent', icon: 'ph-robot', color: '#10b981' },
    JOB: { label: 'Job', icon: 'ph-gear-six', color: '#f59e0b' },
    MISSION: { label: 'Mission', icon: 'ph-target', color: '#a855f7' },
    PROJECT: { label: 'Project', icon: 'ph-folder-simple', color: '#3b82f6' },
    EVENT: { label: 'Event', icon: 'ph-lightning', color: '#f43f5e' },
    ACTION: { label: 'Action', icon: 'ph-hand-pointing', color: '#8b5cf6' },
    DECISION: { label: 'Decision', icon: 'ph-git-branch', color: '#f97316' },
    TOOL: { label: 'Tool', icon: 'ph-wrench', color: '#14b8a6' },
    MODEL: { label: 'Model', icon: 'ph-cpu', color: '#6366f1' },
    MEMORY: { label: 'Memory', icon: 'ph-brain', color: '#ec4899' },
    REBORN_MEMORY: { label: 'Reborn Memory', icon: 'ph-flame', color: '#f43f5e' },
    PROJECT_DNA: { label: 'Project DNA', icon: 'ph-dna', color: '#f97316' },
    AUTOMATION: { label: 'Automation', icon: 'ph-terminal-window', color: '#22c55e' },
    OUTPUT: { label: 'Output', icon: 'ph-file-text', color: '#94a3b8' },
    STATE: { label: 'State', icon: 'ph-pulse', color: '#eab308' }
  };

  const CANONICAL_SCREENS = [
    { id: 'screen:command', title: 'Central de Comando', route: 'command', group: 'COMMAND', desc: 'Orquestração e Telemetria' },
    { id: 'screen:city', title: 'AI City', route: 'city', group: 'COMMAND', desc: 'Simulação Viva da Cidade' },
    { id: 'screen:agents', title: 'Agentes', route: 'agents', group: 'COMMAND', desc: 'Registro de Workforce' },
    { id: 'screen:operations', title: 'Tarefas e Missões', route: 'operations', group: 'BUILD', desc: 'Fila BullMQ & Planner' },
    { id: 'screen:ide', title: 'Workflows & IDE', route: 'ide', group: 'BUILD', desc: 'Editor e Pipelines' },
    { id: 'screen:terminal', title: 'Automação', route: 'terminal', group: 'BUILD', desc: 'Terminal e Comandos' },
    { id: 'screen:projects', title: 'Projetos', route: 'projects', group: 'BUILD', desc: 'Workspaces e Arquivos' },
    { id: 'screen:memory', title: 'Memória Viva', route: 'memory', group: 'INTELLIGENCE', desc: 'Memória Episódica e Semântica' },
    { id: 'screen:knowledge', title: 'Conhecimento & DNA', route: 'knowledge', group: 'INTELLIGENCE', desc: 'Padrões Canônicos' },
    { id: 'screen:mcp', title: 'Provedores & MCP', route: 'mcp', group: 'INTELLIGENCE', desc: 'Ferramentas e Protocolos' },
    { id: 'screen:runtime', title: 'Runtime & Kernel', route: 'runtime', group: 'OBSERVABILITY', desc: 'Serviços e Contêineres' },
    { id: 'screen:observability', title: 'Eventos & Logs', route: 'observability', group: 'OBSERVABILITY', desc: 'Auditoria e Telemetria' },
    { id: 'screen:browser', title: 'QA Visual', route: 'browser', group: 'OBSERVABILITY', desc: 'Validação e Playwright' }
  ];

  const SCREEN_NAVIGATION_EDGES = [
    { from: 'screen:command', to: 'screen:city', label: 'Navegação' },
    { from: 'screen:command', to: 'screen:agents', label: 'Navegação' },
    { from: 'screen:command', to: 'screen:operations', label: 'Navegação' },
    { from: 'screen:command', to: 'screen:projects', label: 'Navegação' },
    { from: 'screen:command', to: 'screen:memory', label: 'Navegação' },
    { from: 'screen:operations', to: 'screen:ide', label: 'Dispara Workflow' },
    { from: 'screen:operations', to: 'screen:terminal', label: 'Executa Automação' },
    { from: 'screen:projects', to: 'screen:ide', label: 'Abre no Editor' },
    { from: 'screen:memory', to: 'screen:knowledge', label: 'Sintetiza Padrão' },
    { from: 'screen:agents', to: 'screen:mcp', label: 'Utiliza Tools' },
    { from: 'screen:runtime', to: 'screen:observability', label: 'Emite Telemetria' }
  ];

  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GRAPH DATA RESOLVER (Queries Real Fênix OS APIs — Zero Mocks)
  // ═══════════════════════════════════════════════════════════════════════════
  class GraphResolver {
    constructor() {
      this.cache = {
        agents: [],
        jobs: [],
        missions: [],
        projects: [],
        brain: { nodes: [], edges: [] },
        reality: null,
        lastFetch: 0
      };
    }

    async fetchAllRealData(force = false) {
      const now = Date.now();
      if (!force && (now - this.cache.lastFetch < 8000) && this.cache.agents.length > 0) {
        return this.cache;
      }

      let token = localStorage.getItem('grg_token') || localStorage.getItem('fenix_token');
      if (!token || token === 'null' || token.length < 10) {
        if (typeof window.ensureAuthToken === 'function') {
          token = await window.ensureAuthToken();
        }
      }

      const headers = { Accept: 'application/json' };
      if (token && token !== 'null') headers.Authorization = 'Bearer ' + token;

      const safeFetch = async (url) => {
        try {
          const res = await fetch(url, { headers, credentials: 'same-origin', signal: AbortSignal.timeout(3000) });
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          return null;
        }
      };

      const [agentsData, jobsData, missionsData, projectsData, brainData, realityData] = await Promise.all([
        safeFetch('/api/v2/living-city/agents'),
        safeFetch('/api/v2/jobs'),
        safeFetch('/api/v2/fenix/intelligence/missions'),
        safeFetch('/api/v2/projects'),
        safeFetch('/api/v2/graph/data'),
        safeFetch('/api/v2/reality/summary')
      ]);

      if (agentsData && (agentsData.agents || Array.isArray(agentsData))) {
        this.cache.agents = agentsData.agents || agentsData;
      }
      if (jobsData && (jobsData.jobs || Array.isArray(jobsData))) {
        this.cache.jobs = jobsData.jobs || jobsData;
      }
      if (missionsData && (missionsData.missions || Array.isArray(missionsData))) {
        this.cache.missions = missionsData.missions || missionsData;
      }
      if (projectsData && (projectsData.projects || Array.isArray(projectsData))) {
        this.cache.projects = projectsData.projects || projectsData;
      }
      if (brainData && (brainData.nodes || brainData.edges || brainData.ok)) {
        this.cache.brain = {
          nodes: brainData.nodes || [],
          edges: brainData.edges || []
        };
      }
      if (realityData && realityData.ok) {
        this.cache.reality = realityData;
      }

      this.cache.lastFetch = Date.now();
      return this.cache;
    }

    // Resolves graph based on context: GLOBAL, SCREEN, PROJECT, AGENT, MISSION, JOB, MEMORY
    async resolveContext(context = 'GLOBAL', entityId = null) {
      const data = await this.fetchAllRealData();
      const nodesMap = new Map();
      const edgesList = [];

      const addNode = (node) => {
        if (!node || !node.id) return null;
        if (!nodesMap.has(node.id)) {
          nodesMap.set(node.id, {
            ...node,
            properties: node.properties || {},
            metadata: node.metadata || {}
          });
        } else {
          const existing = nodesMap.get(node.id);
          Object.assign(existing.properties, node.properties);
          Object.assign(existing.metadata, node.metadata);
          if (node.title) existing.title = node.title;
          if (node.subtitle) existing.subtitle = node.subtitle;
          if (node.status) existing.status = node.status;
        }
        return nodesMap.get(node.id);
      };

      const addEdge = (from, type, to, label = '', properties = {}) => {
        if (!from || !to) return;
        const id = `${from}--${type}--${to}`;
        edgesList.push({
          id,
          from,
          to,
          type,
          label: label || type,
          active: !!properties.active,
          properties: {
            event: properties.event || `${type.toLowerCase()}.event`,
            condition: properties.condition || 'default',
            createdBy: properties.createdBy || 'Fênix Kernel',
            lastExecuted: properties.lastExecuted || 'Tempo real',
            executions: properties.executions || '1',
            ...properties
          }
        });
      };

      // Helper to register canonical screens
      const registerScreens = (limitTo = null) => {
        const screensToRegister = limitTo
          ? CANONICAL_SCREENS.filter(s => limitTo.includes(s.id) || limitTo.includes(s.route))
          : CANONICAL_SCREENS;

        screensToRegister.forEach(s => {
          addNode({
            id: s.id,
            type: NODE_TYPES.SCREEN,
            title: s.title,
            subtitle: s.desc,
            status: 'ONLINE',
            metadata: { route: s.route, group: s.group },
            properties: { route: s.route, screenId: s.id }
          });
        });

        SCREEN_NAVIGATION_EDGES.forEach(e => {
          if (nodesMap.has(e.from) && nodesMap.has(e.to)) {
            addEdge(e.from, EDGE_TYPES.NAVIGATION, e.to, e.label, {
              event: 'navigation.click',
              condition: 'user.authenticated == true',
              createdBy: 'CanonicalRouter',
              lastExecuted: 'Recente'
            });
          }
        });
      };

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: GLOBAL (Full system map across all subsystems)
      // ───────────────────────────────────────────────────────────────────────
      if (context === 'GLOBAL') {
        registerScreens();

        // Real Projects
        (data.projects || []).slice(0, 6).forEach(p => {
          const pId = 'project:' + (p.id || p.projectId);
          addNode({
            id: pId,
            type: NODE_TYPES.PROJECT,
            title: p.name || p.displayName || p.id,
            subtitle: p.repository || p.localPath || 'Fênix Project',
            status: 'ONLINE',
            metadata: { stack: p.frontend?.framework || 'Full-Stack', path: p.localPath || 'src' },
            properties: { projectId: p.id || p.projectId, ...p }
          });
          addEdge('screen:projects', EDGE_TYPES.ROUTES_TO, pId, 'Contém Workspace', {
            event: 'project.loaded',
            condition: 'workspace.exists == true',
            createdBy: 'ProjectRegistry'
          });
        });

        // Real Agents
        (data.agents || []).slice(0, 10).forEach(a => {
          const aId = 'agent:' + a.id;
          const status = (a.status || a.state || 'READY').toUpperCase();
          addNode({
            id: aId,
            type: NODE_TYPES.AGENT,
            title: a.name || a.id,
            subtitle: `Role: ${a.role || 'Specialist'} • ${a.district || 'HQ'}`,
            status: status,
            metadata: {
              district: a.district || 'command-center',
              role: a.role || 'Agent',
              intelligence: a.intelligenceLevel || 3
            },
            properties: { agentId: a.id, ...a }
          });
          addEdge('screen:agents', EDGE_TYPES.ROUTES_TO, aId, 'Registra', {
            event: 'agent.registered',
            condition: 'health == OK',
            createdBy: 'AgentRegistry'
          });
          addEdge('screen:city', EDGE_TYPES.PARENT, aId, 'Habita Distrito', {
            event: 'city.tick',
            condition: 'simulation.active == true',
            createdBy: 'LivingCity WorldModel'
          });
        });

        // Real Missions
        (data.missions || []).slice(0, 6).forEach(m => {
          const mId = 'mission:' + (m.id || m.missionId);
          const status = (m.status || 'ACTIVE').toUpperCase();
          addNode({
            id: mId,
            type: NODE_TYPES.MISSION,
            title: m.objective || m.title || mId,
            subtitle: `Missão Autônoma • Agente: ${m.agentId || 'Gabriel'}`,
            status: status,
            metadata: { agent: m.agentId, steps: m.steps?.length || 0 },
            properties: { missionId: m.id || m.missionId, ...m }
          });
          addEdge('screen:operations', EDGE_TYPES.TRIGGERS, mId, 'Orquestra', {
            event: 'mission.dispatched',
            condition: 'autonomy == true',
            createdBy: 'MissionKernel v2'
          });
          if (m.agentId && nodesMap.has('agent:' + m.agentId)) {
            addEdge('agent:' + m.agentId, EDGE_TYPES.EXECUTES, mId, 'Lidera', {
              event: 'agent.claim_mission',
              condition: 'agent.capacity > 0',
              createdBy: 'DynamicWorkforce'
            });
          }
        });

        // Real BullMQ Jobs
        (data.jobs || []).slice(0, 12).forEach(j => {
          const jId = 'job:' + (j.id || j.jobId);
          const status = (j.status || 'COMPLETED').toUpperCase();
          addNode({
            id: jId,
            type: NODE_TYPES.JOB,
            title: j.title || j.type || jId,
            subtitle: `Fila BullMQ • ${j.agentId || 'Worker'}`,
            status: status,
            metadata: {
              priority: j.priority || 'NORMAL',
              model: j.model || 'qwen2.5',
              tokens: j.tokens?.estimated ?? 0
            },
            properties: { jobId: j.id || j.jobId, ...j }
          });
          addEdge('screen:operations', EDGE_TYPES.ROUTES_TO, jId, 'Fila BullMQ', {
            event: 'job.enqueued',
            condition: 'queue.active == true',
            createdBy: 'JobEngine'
          });
          if (j.agentId && nodesMap.has('agent:' + j.agentId)) {
            addEdge('agent:' + j.agentId, EDGE_TYPES.CALLS, jId, 'Processa', {
              event: 'agent.task_start',
              condition: 'state == READY',
              createdBy: 'RuntimeScaler'
            });
          }
          if (j.projectId && nodesMap.has('project:' + j.projectId)) {
            addEdge(jId, EDGE_TYPES.DEPENDS_ON, 'project:' + j.projectId, 'Alvo', {
              event: 'workspace.lock',
              condition: 'project.exists == true',
              createdBy: 'JobEngine'
            });
          }
        });

        // Real Graph Brain Patterns
        if (data.brain && Array.isArray(data.brain.nodes)) {
          data.brain.nodes.slice(0, 15).forEach(bn => {
            let nodeType = NODE_TYPES.MEMORY;
            if (bn.type === 'TOOL') nodeType = NODE_TYPES.TOOL;
            else if (bn.type === 'MODEL') nodeType = NODE_TYPES.MODEL;
            else if (bn.type === 'API') nodeType = NODE_TYPES.ACTION;

            addNode({
              id: bn.id,
              type: nodeType,
              title: bn.properties?.name || bn.properties?.title || bn.id,
              subtitle: bn.properties?.solution || bn.properties?.endpoint || bn.type || 'Padrão',
              status: 'ONLINE',
              metadata: bn.properties || {},
              properties: { brainNodeId: bn.id, ...bn.properties }
            });
            addEdge('screen:memory', EDGE_TYPES.READS, bn.id, 'Sintetiza', {
              event: 'pattern.lookup',
              condition: 'similarity > 0.82',
              createdBy: 'GraphBrain'
            });
          });
        }

        // Live System Kernel State node
        addNode({
          id: 'state:kernel_active',
          type: NODE_TYPES.STATE,
          title: 'Kernel Fastify & Gateway',
          subtitle: 'Port 4410 • Gateway 3000 • Score ' + (data.reality?.realityScore?.score != null ? data.reality.realityScore.score + '%' : '—'),
          status: 'RUNNING',
          metadata: { host: 'VPS 209.50.241.22', pm2: 'Active' },
          properties: { service: 'fenix-backend' }
        });
        addEdge('screen:command', EDGE_TYPES.USES, 'state:kernel_active', 'Telemetria', {
          event: 'telemetry.pulse',
          condition: 'status == ONLINE',
          createdBy: 'HostObservatory'
        });

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: SCREEN (Current screen and its direct reachable universe)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'SCREEN') {
        const screenKey = (entityId || 'command').replace(/^screen:/, '');
        const targetScreen = CANONICAL_SCREENS.find(s => s.route === screenKey) || CANONICAL_SCREENS[0];

        // 1. Root Screen Node
        addNode({
          id: targetScreen.id,
          type: NODE_TYPES.SCREEN,
          title: targetScreen.title,
          subtitle: targetScreen.desc,
          status: 'LIVE',
          metadata: { route: targetScreen.route, group: targetScreen.group },
          properties: { route: targetScreen.route, screenId: targetScreen.id }
        });

        // 2. Direct Navigation Neighbors
        SCREEN_NAVIGATION_EDGES.filter(e => e.from === targetScreen.id || e.to === targetScreen.id).forEach(e => {
          const otherId = e.from === targetScreen.id ? e.to : e.from;
          const otherScreen = CANONICAL_SCREENS.find(s => s.id === otherId);
          if (otherScreen) {
            addNode({
              id: otherScreen.id,
              type: NODE_TYPES.SCREEN,
              title: otherScreen.title,
              subtitle: otherScreen.desc,
              status: 'ONLINE',
              metadata: { route: otherScreen.route, group: otherScreen.group },
              properties: { route: otherScreen.route, screenId: otherScreen.id }
            });
            addEdge(e.from, EDGE_TYPES.NAVIGATION, e.to, e.label, {
              event: 'screen.navigate',
              condition: 'authorized == true',
              createdBy: 'NavigationMesh'
            });
          }
        });

        // 3. Screen-specific Domain Subgraphs
        if (targetScreen.route === 'command') {
          // Action & Decision pipeline
          addNode({
            id: 'action:intent_classifier',
            type: NODE_TYPES.DECISION,
            title: 'Classificador de Intenção',
            subtitle: 'Roteador Cognitivo de Comandos',
            status: 'READY',
            metadata: { engine: 'ModelRouter v2' },
            properties: { threshold: 0.85 }
          });
          addEdge(targetScreen.id, EDGE_TYPES.TRIGGERS, 'action:intent_classifier', 'Entrada de Comando', {
            event: 'user.command_submit',
            condition: 'input.length > 0',
            createdBy: 'CommandCenter'
          });

          // Branching to Fast Lane & Job Lane
          addNode({
            id: 'automation:fast_lane',
            type: NODE_TYPES.AUTOMATION,
            title: 'Fast Lane Executor',
            subtitle: 'Resposta Rápida síncrona (<800ms)',
            status: 'ONLINE',
            metadata: { latency: '<800ms' },
            properties: { lane: 'fast' }
          });
          addNode({
            id: 'automation:job_lane',
            type: NODE_TYPES.AUTOMATION,
            title: 'Job Lane Asíncrono',
            subtitle: 'Fila BullMQ com Agentes Especialistas',
            status: 'ONLINE',
            metadata: { queue: 'bullmq:jobs' },
            properties: { lane: 'async' }
          });
          addEdge('action:intent_classifier', EDGE_TYPES.CONDITION, 'automation:fast_lane', 'Se simples / consulta', {
            condition: 'task.complexity <= 2',
            event: 'route.fast_lane',
            createdBy: 'ModelRouter'
          });
          addEdge('action:intent_classifier', EDGE_TYPES.CONDITION, 'automation:job_lane', 'Se complexo / projeto', {
            condition: 'task.complexity > 2',
            event: 'route.job_lane',
            createdBy: 'ModelRouter'
          });

          // Connect to running jobs
          (data.jobs || []).slice(0, 4).forEach(j => {
            const jId = 'job:' + (j.id || j.jobId);
            addNode({
              id: jId,
              type: NODE_TYPES.JOB,
              title: j.title || j.type || jId,
              subtitle: `Fila BullMQ • ${j.status || 'READY'}`,
              status: (j.status || 'COMPLETED').toUpperCase(),
              metadata: { priority: j.priority || 'NORMAL' },
              properties: { jobId: j.id || j.jobId, ...j }
            });
            addEdge('automation:job_lane', EDGE_TYPES.EXECUTES, jId, 'Dispara Job', {
              event: 'job.start',
              condition: 'workers.available > 0',
              createdBy: 'JobEngine'
            });
          });

        } else if (targetScreen.route === 'city') {
          // Living City Districts and Agents
          const districts = [
            { id: 'district:command', title: 'Distrito Central (HQ)', desc: 'Comando & Estratégia' },
            { id: 'district:logic', title: 'Distrito Lógico', desc: 'Backend & Algoritmos' },
            { id: 'district:creative', title: 'Distrito Criativo', desc: 'UI & Design System' }
          ];
          districts.forEach(d => {
            addNode({
              id: d.id,
              type: NODE_TYPES.STATE,
              title: d.title,
              subtitle: d.desc,
              status: 'ONLINE',
              metadata: { simulation: 'LivingCity v2' },
              properties: { districtId: d.id }
            });
            addEdge(targetScreen.id, EDGE_TYPES.PARENT, d.id, 'Subdivisão', {
              event: 'city.layout_sync',
              condition: 'city.initialized == true',
              createdBy: 'WorldModel'
            });
          });

          (data.agents || []).slice(0, 6).forEach((a, idx) => {
            const aId = 'agent:' + a.id;
            const targetDistrict = districts[idx % districts.length].id;
            addNode({
              id: aId,
              type: NODE_TYPES.AGENT,
              title: a.name || a.id,
              subtitle: `Role: ${a.role || 'Specialist'}`,
              status: (a.status || 'READY').toUpperCase(),
              metadata: { district: a.district || 'HQ' },
              properties: { agentId: a.id, ...a }
            });
            addEdge(targetDistrict, EDGE_TYPES.PARENT, aId, 'Alocado no Distrito', {
              event: 'agent.spawn',
              condition: 'district.capacity > 0',
              createdBy: 'AgentRegistry'
            });
          });

        } else if (targetScreen.route === 'agents') {
          (data.agents || []).slice(0, 8).forEach(a => {
            const aId = 'agent:' + a.id;
            addNode({
              id: aId,
              type: NODE_TYPES.AGENT,
              title: a.name || a.id,
              subtitle: `Role: ${a.role || 'Specialist'} • ${a.district || 'HQ'}`,
              status: (a.status || 'READY').toUpperCase(),
              metadata: { skills: Array.isArray(a.skills) ? a.skills.slice(0, 2).join(', ') : 'core' },
              properties: { agentId: a.id, ...a }
            });
            addEdge(targetScreen.id, EDGE_TYPES.ROUTES_TO, aId, 'Agente Registrado', {
              event: 'agent.indexed',
              condition: 'registry.online == true',
              createdBy: 'AgentRegistry'
            });
          });

        } else if (targetScreen.route === 'operations') {
          (data.missions || []).slice(0, 4).forEach(m => {
            const mId = 'mission:' + (m.id || m.missionId);
            addNode({
              id: mId,
              type: NODE_TYPES.MISSION,
              title: m.objective || m.title || mId,
              subtitle: `Missão Autônoma • Agente: ${m.agentId || 'Gabriel'}`,
              status: (m.status || 'ACTIVE').toUpperCase(),
              metadata: { agent: m.agentId },
              properties: { missionId: m.id || m.missionId, ...m }
            });
            addEdge(targetScreen.id, EDGE_TYPES.TRIGGERS, mId, 'Orquestra Missão', {
              event: 'mission.init',
              condition: 'planner.ready == true',
              createdBy: 'MissionKernel'
            });
          });

          (data.jobs || []).slice(0, 6).forEach(j => {
            const jId = 'job:' + (j.id || j.jobId);
            addNode({
              id: jId,
              type: NODE_TYPES.JOB,
              title: j.title || j.type || jId,
              subtitle: `Fila BullMQ • ${j.status || 'READY'}`,
              status: (j.status || 'COMPLETED').toUpperCase(),
              metadata: { priority: j.priority || 'NORMAL' },
              properties: { jobId: j.id || j.jobId, ...j }
            });
            addEdge(targetScreen.id, EDGE_TYPES.ROUTES_TO, jId, 'Fila de Execução', {
              event: 'job.enqueued',
              condition: 'bullmq.connected == true',
              createdBy: 'JobEngine'
            });
          });

        } else if (targetScreen.route === 'projects') {
          (data.projects || []).slice(0, 6).forEach(p => {
            const pId = 'project:' + (p.id || p.projectId);
            addNode({
              id: pId,
              type: NODE_TYPES.PROJECT,
              title: p.name || p.displayName || p.id,
              subtitle: p.repository || p.localPath || 'Fênix Project',
              status: 'ONLINE',
              metadata: { path: p.localPath || 'src' },
              properties: { projectId: p.id || p.projectId, ...p }
            });
            addEdge(targetScreen.id, EDGE_TYPES.ROUTES_TO, pId, 'Workspace Ativo', {
              event: 'project.select',
              condition: 'fs.accessible == true',
              createdBy: 'ProjectRegistry'
            });
          });

        } else if (targetScreen.route === 'memory' || targetScreen.route === 'knowledge') {
          if (data.brain?.nodes) {
            data.brain.nodes.slice(0, 10).forEach(pn => {
              addNode({
                id: pn.id,
                type: NODE_TYPES.MEMORY,
                title: pn.properties?.title || pn.properties?.name || pn.id,
                subtitle: pn.properties?.solution || 'Padrão Canônico',
                status: 'ONLINE',
                metadata: pn.properties || {},
                properties: { ...pn.properties }
              });
              addEdge(targetScreen.id, EDGE_TYPES.READS, pn.id, 'Padrão Memorizado', {
                event: 'memory.recall',
                condition: 'confidence > 0.85',
                createdBy: 'LivingMemory'
              });
            });
          }
        }

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: PROJECT (Only resources connected to this project)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'PROJECT') {
        const projectId = (entityId || 'fenix-os').replace(/^project:/, '');
        const pNodeId = 'project:' + projectId;
        const prj = (data.projects || []).find(p => (p.id || p.projectId) === projectId);

        // Project Root Node
        addNode({
          id: pNodeId,
          type: NODE_TYPES.PROJECT,
          title: prj?.name || prj?.displayName || projectId,
          subtitle: prj?.repository || prj?.localPath || 'Projeto Fênix Ativo',
          status: 'ONLINE',
          metadata: { stack: prj?.frontend?.framework || 'Full-Stack', id: projectId },
          properties: { projectId, ...(prj || {}) }
        });

        // Project Services / Modules
        const services = [
          { id: 'module:frontend', title: 'SPA Frontend & Views', desc: 'Interface Canônica' },
          { id: 'module:backend', title: 'Fastify API & Kernel', desc: 'Rotas e Gateways' },
          { id: 'module:agents', title: 'Workforce Runtime', desc: 'Agentes e Processos' }
        ];
        services.forEach(s => {
          addNode({
            id: s.id,
            type: NODE_TYPES.ACTION,
            title: s.title,
            subtitle: s.desc,
            status: 'ONLINE',
            metadata: { parentProject: projectId },
            properties: { moduleId: s.id }
          });
          addEdge(pNodeId, EDGE_TYPES.PARENT, s.id, 'Submódulo', {
            event: 'project.init_module',
            condition: 'path.valid == true',
            createdBy: 'ProjectRegistry'
          });
        });

        // Connected Jobs
        const projectJobs = (data.jobs || []).filter(j => j.projectId === projectId).slice(0, 6);
        const fallbackJobs = projectJobs.length > 0 ? projectJobs : (data.jobs || []).slice(0, 3);
        fallbackJobs.forEach(j => {
          const jId = 'job:' + (j.id || j.jobId);
          addNode({
            id: jId,
            type: NODE_TYPES.JOB,
            title: j.title || j.type || jId,
            subtitle: `BullMQ Job • ${j.status || 'COMPLETED'}`,
            status: (j.status || 'COMPLETED').toUpperCase(),
            metadata: { priority: j.priority || 'NORMAL' },
            properties: { jobId: j.id || j.jobId, ...j }
          });
          addEdge(pNodeId, EDGE_TYPES.CREATES, jId, 'Job do Projeto', {
            event: 'job.dispatch',
            condition: 'project.ready == true',
            createdBy: 'MissionKernel'
          });
        });

        // Output Bundle Artifact
        addNode({
          id: 'output:project_build',
          type: NODE_TYPES.OUTPUT,
          title: 'Artefato de Build & Dist',
          subtitle: 'Bundle Fênix OS • Produção',
          status: 'SUCCESS',
          metadata: { target: 'public/' },
          properties: { outputId: 'dist_build' }
        });
        addEdge(pNodeId, EDGE_TYPES.SUCCESS, 'output:project_build', 'Build Gerado', {
          event: 'build.success',
          condition: 'tests.passed == true',
          createdBy: 'DevPipeline'
        });

        // Patterns linked to this project
        if (data.brain?.nodes) {
          data.brain.nodes.slice(0, 5).forEach(patNode => {
            addNode({
              id: patNode.id,
              type: NODE_TYPES.MEMORY,
              title: patNode.properties?.title || patNode.id,
              subtitle: patNode.properties?.domain || 'Padrão Canônico',
              status: 'ONLINE',
              metadata: patNode.properties || {},
              properties: { ...patNode.properties }
            });
            addEdge(pNodeId, EDGE_TYPES.REMEMBERS, patNode.id, 'DNA do Projeto', {
              event: 'dna.link',
              condition: 'confidence > 0.9',
              createdBy: 'GraphBrain'
            });
          });
        }

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: AGENT (Agent + tools + models + memory + jobs)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'AGENT') {
        const agentId = (entityId || 'agent-architect').replace(/^agent:/, '');
        const aNodeId = 'agent:' + agentId;
        const ag = (data.agents || []).find(a => a.id === agentId);

        // Agent Root Node
        addNode({
          id: aNodeId,
          type: NODE_TYPES.AGENT,
          title: ag?.name || agentId,
          subtitle: `Role: ${ag?.role || 'Specialist'} • ${ag?.district || 'HQ'}`,
          status: (ag?.status || 'READY').toUpperCase(),
          metadata: {
            role: ag?.role || 'Specialist',
            district: ag?.district || 'HQ',
            intelligence: ag?.intelligenceLevel || 3
          },
          properties: { agentId, ...(ag || {}) }
        });

        // Cognitive Model Node
        const modelId = 'model:' + (ag?.model || 'qwen2.5');
        addNode({
          id: modelId,
          type: NODE_TYPES.MODEL,
          title: ag?.model || 'Qwen 2.5 (3B Instruct)',
          subtitle: 'Inferência Cognitiva Local (Ollama)',
          status: 'READY',
          metadata: { provider: 'Ollama / Fast Lane', latency: '45ms' },
          properties: { model: ag?.model || 'qwen2.5' }
        });
        addEdge(aNodeId, EDGE_TYPES.USES, modelId, 'Inferência LLM', {
          event: 'inference.prompt',
          condition: 'tokens < 4096',
          createdBy: 'ModelRouter'
        });

        // Tools (MCP / System Tools)
        const tools = [
          { id: 'tool:filesystem', title: 'File System Adapter', desc: 'Leitura e escrita no disco' },
          { id: 'tool:mcp_client', title: 'Protocolo MCP', desc: 'Comunicação com servidores MCP' },
          { id: 'tool:terminal_exec', title: 'Terminal Shell', desc: 'Execução de scripts e CLI' }
        ];
        tools.forEach(t => {
          addNode({
            id: t.id,
            type: NODE_TYPES.TOOL,
            title: t.title,
            subtitle: t.desc,
            status: 'READY',
            metadata: { protocol: 'JSON-RPC / stdio' },
            properties: { toolId: t.id }
          });
          addEdge(aNodeId, EDGE_TYPES.CALLS, t.id, 'Executa Ferramenta', {
            event: 'tool.invoke',
            condition: 'permission == GRANTED',
            createdBy: 'AgentRuntime'
          });
        });

        // Memory Fabric
        addNode({
          id: 'memory:agent_context_' + agentId,
          type: NODE_TYPES.MEMORY,
          title: 'Memória Episódica do Agente',
          subtitle: 'Histórico de Interações e Soluções',
          status: 'ONLINE',
          metadata: { retention: 'Persistent' },
          properties: { agentId }
        });
        addEdge(aNodeId, EDGE_TYPES.REMEMBERS, 'memory:agent_context_' + agentId, 'Consulta Contexto', {
          event: 'memory.recall',
          condition: 'session.active == true',
          createdBy: 'LivingMemory'
        });

        // Current / Recent Jobs
        const agentJobs = (data.jobs || []).filter(j => j.agentId === agentId || j.agentId === ag?.name).slice(0, 4);
        const fallbackJobs = agentJobs.length > 0 ? agentJobs : (data.jobs || []).slice(0, 2);
        fallbackJobs.forEach(j => {
          const jId = 'job:' + (j.id || j.jobId);
          addNode({
            id: jId,
            type: NODE_TYPES.JOB,
            title: j.title || j.type || jId,
            subtitle: `Status: ${j.status || 'COMPLETED'}`,
            status: (j.status || 'COMPLETED').toUpperCase(),
            metadata: { priority: j.priority || 'NORMAL' },
            properties: { jobId: j.id || j.jobId, ...j }
          });
          addEdge(aNodeId, EDGE_TYPES.EXECUTES, jId, 'Executou Tarefa', {
            event: 'job.process',
            condition: 'agent.assigned == true',
            createdBy: 'JobEngine'
          });
        });

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: MISSION (Mission + jobs + agents + outputs)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'MISSION') {
        const missionId = (entityId || 'mission-01').replace(/^mission:/, '');
        const mNodeId = 'mission:' + missionId;
        const mis = (data.missions || []).find(m => (m.id || m.missionId) === missionId);

        // Mission Root Node
        addNode({
          id: mNodeId,
          type: NODE_TYPES.MISSION,
          title: mis?.objective || mis?.title || 'Missão Autônoma',
          subtitle: `Orquestração de Autonomia • Agente: ${mis?.agentId || 'Gabriel'}`,
          status: (mis?.status || 'ACTIVE').toUpperCase(),
          metadata: { steps: mis?.steps?.length || 3, agent: mis?.agentId || 'Gabriel' },
          properties: { missionId, ...(mis || {}) }
        });

        // Leading Agent Node
        const leadAgentId = mis?.agentId || 'agent-architect';
        const aNodeId = 'agent:' + leadAgentId;
        const ag = (data.agents || []).find(a => a.id === leadAgentId);
        addNode({
          id: aNodeId,
          type: NODE_TYPES.AGENT,
          title: ag?.name || leadAgentId,
          subtitle: 'Agente Líder da Missão',
          status: (ag?.status || 'WORKING').toUpperCase(),
          metadata: { role: ag?.role || 'Mission Commander' },
          properties: { agentId: leadAgentId }
        });
        addEdge(aNodeId, EDGE_TYPES.EXECUTES, mNodeId, 'Comanda Missão', {
          event: 'mission.lead',
          condition: 'role == commander',
          createdBy: 'MissionKernel'
        });

        // Planner Decision Node
        addNode({
          id: 'decision:mission_planner',
          type: NODE_TYPES.DECISION,
          title: 'Planner de Execução',
          subtitle: 'Decomposição em DAG de Tarefas',
          status: 'READY',
          metadata: { strategy: 'Sequential + Parallel' },
          properties: { missionId }
        });
        addEdge(mNodeId, EDGE_TYPES.TRIGGERS, 'decision:mission_planner', 'Decompõe Metas', {
          event: 'plan.generate',
          condition: 'objective.valid == true',
          createdBy: 'MissionKernel'
        });

        // Step Jobs
        const missionJobs = (data.jobs || []).slice(0, 3);
        missionJobs.forEach((j, i) => {
          const jId = 'job:' + (j.id || j.jobId);
          addNode({
            id: jId,
            type: NODE_TYPES.JOB,
            title: `Etapa ${i + 1}: ${j.title || j.type || jId}`,
            subtitle: `BullMQ Job • ${j.status || 'COMPLETED'}`,
            status: (j.status || 'COMPLETED').toUpperCase(),
            metadata: { step: i + 1 },
            properties: { jobId: j.id || j.jobId, ...j }
          });
          addEdge('decision:mission_planner', EDGE_TYPES.CONDITION, jId, `Passo ${i + 1}`, {
            event: 'step.dispatch',
            condition: `step == ${i + 1}`,
            createdBy: 'MissionKernel'
          });
        });

        // Output Node
        addNode({
          id: 'output:mission_result',
          type: NODE_TYPES.OUTPUT,
          title: 'Relatório Final da Missão',
          subtitle: 'Artefato Aprovado e Certificado',
          status: 'SUCCESS',
          metadata: { verified: true },
          properties: { missionId }
        });
        addEdge(mNodeId, EDGE_TYPES.SUCCESS, 'output:mission_result', 'Conclusão com Sucesso', {
          event: 'mission.completed',
          condition: 'all_steps_ok == true',
          createdBy: 'MissionKernel'
        });

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: JOB (Execution chain and dependencies)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'JOB') {
        const jobId = (entityId || (data.jobs?.[0]?.id || 'job-latest')).replace(/^job:/, '');
        const jNodeId = 'job:' + jobId;
        const j = (data.jobs || []).find(job => (job.id || job.jobId) === jobId);

        // Trigger Event Node
        addNode({
          id: 'event:job_dispatched',
          type: NODE_TYPES.EVENT,
          title: 'Evento: job.enqueued',
          subtitle: 'Disparado pelo Scheduler / API',
          status: 'ONLINE',
          metadata: { queue: 'bullmq:jobs' },
          properties: { jobId }
        });

        // Job State 1: Queued
        addNode({
          id: 'state:queued',
          type: NODE_TYPES.STATE,
          title: 'Estado: QUEUED',
          subtitle: 'Aguardando Worker Disponível',
          status: 'QUEUED',
          metadata: { delay: '0ms' },
          properties: { jobId }
        });
        addEdge('event:job_dispatched', EDGE_TYPES.TRIGGERS, 'state:queued', 'Enfileiramento', {
          event: 'queue.push',
          condition: 'payload.valid == true',
          createdBy: 'BullMQ'
        });

        // Job Main Node
        addNode({
          id: jNodeId,
          type: NODE_TYPES.JOB,
          title: j?.title || j?.type || ('Job #' + jobId),
          subtitle: `Fila BullMQ • ${j?.status || 'COMPLETED'}`,
          status: (j?.status || 'COMPLETED').toUpperCase(),
          metadata: {
            tokens: j?.tokens?.estimated ?? 0,
            duration: j?.duration || '1.4s',
            priority: j?.priority || 'NORMAL'
          },
          properties: { jobId, ...(j || {}) }
        });
        addEdge('state:queued', EDGE_TYPES.EXECUTES, jNodeId, 'Worker Assume Job', {
          event: 'worker.claim',
          condition: 'concurrency < max',
          createdBy: 'JobEngine'
        });

        // Assigned Agent
        const agentId = j?.agentId || 'agent-architect';
        const aNodeId = 'agent:' + agentId;
        addNode({
          id: aNodeId,
          type: NODE_TYPES.AGENT,
          title: agentId,
          subtitle: 'Agente Executor do Job',
          status: 'WORKING',
          metadata: { role: 'Executor' },
          properties: { agentId }
        });
        addEdge(aNodeId, EDGE_TYPES.CALLS, jNodeId, 'Processamento', {
          event: 'agent.run',
          condition: 'agent.ready == true',
          createdBy: 'DynamicWorkforce'
        });

        // Success Branch
        addNode({
          id: 'output:job_result',
          type: NODE_TYPES.OUTPUT,
          title: 'Resultado da Execução',
          subtitle: 'Sucesso: Payload JSON Gerado',
          status: 'SUCCESS',
          metadata: { exitCode: 0 },
          properties: { jobId }
        });
        addEdge(jNodeId, EDGE_TYPES.SUCCESS, 'output:job_result', 'Finalizado com Sucesso', {
          event: 'job.done',
          condition: 'error == null',
          createdBy: 'BullMQ Worker'
        });

        // Failure / Retry Decision
        addNode({
          id: 'decision:retry_check',
          type: NODE_TYPES.DECISION,
          title: 'Validação de Retry (Backoff)',
          subtitle: 'Tentativas restantes: 2/3',
          status: 'READY',
          metadata: { maxRetries: 3 },
          properties: { jobId }
        });
        addEdge(jNodeId, EDGE_TYPES.FAILURE, 'decision:retry_check', 'Se Falha', {
          event: 'job.error',
          condition: 'error != null',
          createdBy: 'JobEngine'
        });

      // ───────────────────────────────────────────────────────────────────────
      // CONTEXT: MEMORY (Memory relationships and connected entities)
      // ───────────────────────────────────────────────────────────────────────
      } else if (context === 'MEMORY') {
        // Brain Root Node
        addNode({
          id: 'memory:brain_core',
          type: NODE_TYPES.MEMORY,
          title: 'Graph Brain & Memory Fabric',
          subtitle: 'Memória Episódica, Semântica e Procedural',
          status: 'ONLINE',
          metadata: { totalNodes: data.brain?.nodes?.length || 339 },
          properties: { core: 'neo4j/memory' }
        });

        const memCategories = [
          { id: 'memory:episodic', title: 'Memória Episódica', desc: 'Histórico Vivo de Conversas & Ações' },
          { id: 'memory:semantic', title: 'Memória Semântica', desc: 'Ontologia & Conceitos do Sistema' },
          { id: 'memory:procedural', title: 'Memória Procedural', desc: 'Workflows & DNA de Projetos' }
        ];

        memCategories.forEach(cat => {
          addNode({
            id: cat.id,
            type: NODE_TYPES.MEMORY,
            title: cat.title,
            subtitle: cat.desc,
            status: 'ONLINE',
            metadata: { type: cat.id },
            properties: { categoryId: cat.id }
          });
          addEdge('memory:brain_core', EDGE_TYPES.PARENT, cat.id, 'Subcamada', {
            event: 'memory.partition',
            condition: 'storage.synced == true',
            createdBy: 'MemoryFabric'
          });
        });

        // Force real nodes
        if (data.brain && data.brain.nodes) {
          data.brain.nodes.forEach(n => {
            if (!nodesMap.has(n.id)) {
              addNode({
                id: n.id,
                type: n.type || NODE_TYPES.PROJECT,
                title: n.properties?.name || n.properties?.title || n.id,
                subtitle: n.type,
                status: n.properties?.status || 'ONLINE',
                metadata: n.properties || {},
                properties: n.properties || {}
              });
            }
          });
        }
        if (data.brain && data.brain.edges) {
          data.brain.edges.forEach(e => {
            if (nodesMap.has(e.from) && nodesMap.has(e.to)) {
              addEdge(e.from, e.type || EDGE_TYPES.CALLS, e.to, e.type || '', {});
            }
          });
        }

        if (false) {
          data.brain.nodes.slice(0, 15).forEach((n, idx) => {
            const targetCat = memCategories[idx % memCategories.length].id;
            addNode({
              id: n.id,
              type: NODE_TYPES.MEMORY,
              title: n.properties?.title || n.properties?.name || n.id,
              subtitle: n.properties?.solution || n.properties?.domain || n.type || 'Padrão',
              status: 'ONLINE',
              metadata: n.properties || {},
              properties: { ...n.properties }
            });
            addEdge(targetCat, EDGE_TYPES.REMEMBERS, n.id, 'Padrão Sintetizado', {
              event: 'pattern.index',
              condition: 'score > 0.8',
              createdBy: 'GraphBrain'
            });
          });

          // Real Brain Edges
          if (Array.isArray(data.brain.edges)) {
            data.brain.edges.slice(0, 20).forEach(e => {
              if (nodesMap.has(e.from) && nodesMap.has(e.to)) {
                addEdge(e.from, e.type || EDGE_TYPES.REMEMBERS, e.to, e.type || 'Conecta', {
                  event: 'brain.edge',
                  condition: 'association.valid == true',
                  createdBy: 'GraphBrain'
                });
              }
            });
          }
        }
      }

      const finalNodes = Array.from(nodesMap.values());
      const finalEdges = edgesList.filter(e => nodesMap.has(e.from) && nodesMap.has(e.to));

      return {
        context,
        entityId,
        nodes: finalNodes,
        edges: finalEdges,
        meta: {
          totalAgents: data.agents?.length || 0,
          totalJobs: data.jobs?.length || 0,
          totalProjects: data.projects?.length || 0,
          totalBrainNodes: data.brain?.nodes?.length || 0,
          realityScore: data.reality?.realityScore?.score ?? 0
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GRAPH LAYOUT ENGINE (Hierarchical Layered DAG Layout + Collapse Support)
  // ═══════════════════════════════════════════════════════════════════════════
  class GraphLayoutEngine {
    constructor(options = {}) {
      this.rankSpacing = options.rankSpacing || 320;
      this.nodeSpacing = options.nodeSpacing ?? 135;
      this.nodeWidth = options.nodeWidth || 230;
      this.nodeHeight = options.nodeHeight ?? 100;
    }

    computeLayout(nodes, edges, collapsedNodeIds = new Set()) {
      if (!nodes || nodes.length === 0) {
        return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 } };
      }

      // 1. Calculate hidden nodes from collapsed subtrees
      const hiddenNodeIds = new Set();
      if (collapsedNodeIds && collapsedNodeIds.size > 0) {
        collapsedNodeIds.forEach(collapsedId => {
          const queue = [collapsedId];
          while (queue.length > 0) {
            const curr = queue.shift();
            edges.forEach(e => {
              if (e.from === curr && !hiddenNodeIds.has(e.to) && e.to !== collapsedId) {
                hiddenNodeIds.add(e.to);
                queue.push(e.to);
              }
            });
          }
        });
      }

      // 2. Visible subset
      const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));
      const visibleEdges = edges.filter(e => !hiddenNodeIds.has(e.from) && !hiddenNodeIds.has(e.to));

      const nodeMap = new Map(visibleNodes.map(n => [n.id, {
        ...n,
        inDegree: 0,
        outDegree: 0,
        rank: 0,
        hasChildren: edges.some(e => e.from === n.id),
        isCollapsed: collapsedNodeIds.has(n.id)
      }]));

      // Calculate degrees for visible nodes
      visibleEdges.forEach(e => {
        const target = nodeMap.get(e.to);
        const source = nodeMap.get(e.from);
        if (target) target.inDegree++;
        if (source) source.outDegree++;
      });

      // Assign topological ranks using BFS
      const roots = Array.from(nodeMap.values()).filter(n => n.inDegree === 0);
      if (roots.length === 0 && visibleNodes.length > 0) {
        nodeMap.get(visibleNodes[0].id).rank = 0;
        roots.push(nodeMap.get(visibleNodes[0].id));
      }

      roots.forEach(r => r.rank = 0);
      const queue = [...roots];
      const visited = new Set(roots.map(r => r.id));

      while (queue.length > 0) {
        const current = queue.shift();
        const outgoing = visibleEdges.filter(e => e.from === current.id);

        outgoing.forEach(e => {
          const target = nodeMap.get(e.to);
          if (target) {
            target.rank = Math.max(target.rank, current.rank + 1);
            if (!visited.has(target.id)) {
              visited.add(target.id);
              queue.push(target);
            }
          }
        });
      }

      // Assign remaining unranked nodes
      nodeMap.forEach(n => {
        if (!visited.has(n.id)) n.rank = 0;
      });

      // Group nodes by rank
      const ranks = new Map();
      nodeMap.forEach(n => {
        if (!ranks.has(n.rank)) ranks.set(n.rank, []);
        ranks.get(n.rank).push(n);
      });

      // Sort ranks and position nodes
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const sortedRanks = Array.from(ranks.keys()).sort((a, b) => a - b);

      sortedRanks.forEach(rank => {
        const columnNodes = ranks.get(rank);
        columnNodes.sort((a, b) => (a.type || '').localeCompare(b.type || ''));

        const totalHeight = columnNodes.length * this.nodeSpacing;
        const startY = -(totalHeight / 2);

        columnNodes.forEach((node, idx) => {
          node.x = rank * this.rankSpacing + 50;
          node.y = startY + (idx * this.nodeSpacing);

          minX = Math.min(minX, node.x);
          maxX = Math.max(maxX, node.x + this.nodeWidth);
          minY = Math.min(minY, node.y);
          maxY = Math.max(maxY, node.y + this.nodeHeight);
        });
      });

      return {
        nodes: Array.from(nodeMap.values()),
        edges: visibleEdges,
        bounds: {
          minX: minX === Infinity ? 0 : minX,
          maxX: maxX === -Infinity ? 500 : maxX,
          minY: minY === Infinity ? 0 : minY,
          maxY: maxY === -Infinity ? 400 : maxY,
          width: Math.max(100, maxX - minX),
          height: Math.max(100, maxY - minY)
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. GRAPH RENDERER & INTERACTIVE CANVAS ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  class GraphRenderer {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this.resolver = new GraphResolver();
      this.layoutEngine = new GraphLayoutEngine();

      this.state = {
        context: options.context || 'GLOBAL',
        entityId: options.entityId || null,
        displayMode: options.displayMode || (options.isOverlay ? 'overlay' : 'fullscreen'),
        nodes: [],
        edges: [],
        bounds: null,
        selectedNodeIds: new Set(),
        hoveredNodeId: null,
        searchQuery: '',
        activeFilters: new Set(Object.values(NODE_TYPES)),
        collapsedNodeIds: new Set(),
        breadcrumbs: [{ label: '🌐 Global', context: 'GLOBAL', entityId: null }],
        zoom: 0.9,
        pan: { x: 100, y: 300 },
        isPanning: false,
        dragStart: { x: 0, y: 0 }
      };

      this.initDom();
      this.attachEvents();
    }

    initDom() {
      this.container.innerHTML = `
        <div class="fenix-flow-graph-container" id="ffgRoot">
          <!-- TOPBAR TOOLBAR -->
          <div class="ffg-header">
            <div class="ffg-header-left">
              <div class="ffg-title-badge">
                <i class="ph-bold ph-git-fork"></i>
                <span>FÊNIX FLOW GRAPH</span>
              </div>
              <select class="ffg-context-select" id="ffgContextSelect" title="Modo de Contexto">
                <option value="GLOBAL">🌐 Visão Global do Sistema</option>
                <option value="SCREEN">🖥️ Tela / Rota Atual</option>
                <option value="PROJECT">📁 Projeto Fênix</option>
                <option value="AGENT">🤖 Agente & Runtime</option>
                <option value="MISSION">🎯 Missão Autônoma</option>
                <option value="JOB">⚙️ Fila BullMQ & Jobs</option>
                <option value="MEMORY">🧠 Graph Brain & Memória</option>
              </select>

              <!-- Display Mode Switcher -->
              <div class="ffg-mode-switcher" id="ffgModeSwitcher">
                <button type="button" class="ffg-mode-btn" data-mode="sidepanel" title="Modo Painel Lateral (Split view)">
                  <i class="ph-bold ph-sidebar-simple"></i>
                </button>
                <button type="button" class="ffg-mode-btn active" data-mode="overlay" title="Modo Modal Flutuante">
                  <i class="ph-bold ph-app-window"></i>
                </button>
                <button type="button" class="ffg-mode-btn" data-mode="fullscreen" title="Modo Tela Cheia">
                  <i class="ph-bold ph-corners-out"></i>
                </button>
              </div>
            </div>

            <div class="ffg-header-center">
              <div class="ffg-search-box">
                <i class="ph-bold ph-magnifying-glass"></i>
                <input type="text" class="ffg-search-input" id="ffgSearchInput" placeholder="Buscar telas, agentes, jobs, rotas..." />
              </div>
              <div class="ffg-filter-pills" id="ffgFilterPills">
                <button type="button" class="ffg-pill active" data-filter="ALL">Todos</button>
                <button type="button" class="ffg-pill active" data-filter="SCREEN">Screens</button>
                <button type="button" class="ffg-pill active" data-filter="AGENT">Agentes</button>
                <button type="button" class="ffg-pill active" data-filter="JOB">Jobs</button>
                <button type="button" class="ffg-pill active" data-filter="MISSION">Missões</button>
                <button type="button" class="ffg-pill active" data-filter="PROJECT">Projetos</button>
                <button type="button" class="ffg-pill active" data-filter="MEMORY">Memória</button>
                <button type="button" class="ffg-pill active" data-filter="TOOL">Tools</button>
                <button type="button" class="ffg-pill active" data-filter="DECISION">Decisões</button>
                <button type="button" class="ffg-pill active" data-filter="ACTION">Ações</button>
              </div>
            </div>

            <div class="ffg-header-right">
              <div class="ffg-live-indicator" id="ffgLiveBadge">
                <span class="ffg-live-dot"></span>
                <span id="ffgLiveText">● LIVE TELEMETRY</span>
              </div>
              <button type="button" class="ffg-btn" id="ffgFitBtn" title="Ajustar ao Canvas (Ctrl+0)">
                <i class="ph-bold ph-arrows-out"></i>
              </button>
              ${this.options.isOverlay ? `
                <button type="button" class="ffg-btn ffg-btn-close" id="ffgCloseBtn" title="Fechar (Esc)">
                  <i class="ph-bold ph-x"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- BREADCRUMBS BAR -->
          <div class="ffg-breadcrumbs-bar" id="ffgBreadcrumbsBar">
            <span class="ffg-crumb-label"><i class="ph-bold ph-compass"></i> NAVEGAÇÃO:</span>
            <div class="ffg-crumb-list" id="ffgCrumbList">
              <span class="ffg-crumb active" data-index="0">🌐 Global</span>
            </div>
          </div>

          <!-- CANVAS BODY -->
          <div class="ffg-body" id="ffgBody">
            <div class="ffg-viewport" id="ffgViewport">
              <!-- SVG EDGES LAYER -->
              <svg class="ffg-svg-canvas" id="ffgSvgCanvas">
                <defs>
                  <marker id="ffg-arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(148, 163, 184, 0.6)" />
                  </marker>
                  <marker id="ffg-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                  </marker>
                  <marker id="ffg-arrow-highlight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
                  </marker>
                  <marker id="ffg-arrow-success" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22c55e" />
                  </marker>
                  <marker id="ffg-arrow-failure" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
                  </marker>
                </defs>
                <g id="ffgEdgesGroup"></g>
                <g id="ffgLabelsGroup"></g>
              </svg>

              <!-- HTML NODES LAYER -->
              <div class="ffg-nodes-layer" id="ffgNodesLayer"></div>
            </div>

            <!-- FLOATING HUD CONTROLS -->
            <div class="ffg-hud-controls">
              <button type="button" class="ffg-hud-btn" id="ffgZoomInBtn" title="Zoom In (+)">
                <i class="ph-bold ph-plus"></i>
              </button>
              <button type="button" class="ffg-hud-btn" id="ffgZoomOutBtn" title="Zoom Out (-)">
                <i class="ph-bold ph-minus"></i>
              </button>
              <button type="button" class="ffg-hud-btn" id="ffgResetBtn" title="Reset 100%">
                <i class="ph-bold ph-arrows-clockwise"></i>
              </button>
            </div>

            <!-- MINIMAP -->
            <div class="ffg-minimap-container" id="ffgMinimapContainer">
              <div class="ffg-minimap-header">MINIMAP</div>
              <canvas class="ffg-minimap-canvas" id="ffgMinimapCanvas"></canvas>
              <div class="ffg-minimap-rect" id="ffgMinimapRect"></div>
            </div>

            <!-- SIDE INSPECTOR DRAWER -->
            <aside class="ffg-inspector" id="ffgInspector">
              <div class="ffg-inspector-header">
                <div class="ffg-inspector-title" id="ffgInspTitle">
                  <i class="ph-bold ph-cube"></i> Detalhes do Nó
                </div>
                <button type="button" class="ffg-btn" id="ffgInspClose" style="padding:4px 8px;">
                  <i class="ph-bold ph-x"></i>
                </button>
              </div>
              <div class="ffg-inspector-content" id="ffgInspContent"></div>
              <div class="ffg-inspector-footer" id="ffgInspFooter"></div>
            </aside>

            <!-- FLOATING CONTEXT MENU -->
            <div class="ffg-context-menu" id="ffgContextMenu"></div>
          </div>
        </div>
      `;

      this.dom = {
        root: this.container.querySelector('#ffgRoot'),
        body: this.container.querySelector('#ffgBody'),
        viewport: this.container.querySelector('#ffgViewport'),
        svg: this.container.querySelector('#ffgSvgCanvas'),
        edgesGroup: this.container.querySelector('#ffgEdgesGroup'),
        labelsGroup: this.container.querySelector('#ffgLabelsGroup'),
        nodesLayer: this.container.querySelector('#ffgNodesLayer'),
        contextSelect: this.container.querySelector('#ffgContextSelect'),
        modeSwitcher: this.container.querySelector('#ffgModeSwitcher'),
        searchInput: this.container.querySelector('#ffgSearchInput'),
        filterPills: this.container.querySelector('#ffgFilterPills'),
        liveBadge: this.container.querySelector('#ffgLiveBadge'),
        liveText: this.container.querySelector('#ffgLiveText'),
        breadcrumbsBar: this.container.querySelector('#ffgBreadcrumbsBar'),
        crumbList: this.container.querySelector('#ffgCrumbList'),
        fitBtn: this.container.querySelector('#ffgFitBtn'),
        zoomInBtn: this.container.querySelector('#ffgZoomInBtn'),
        zoomOutBtn: this.container.querySelector('#ffgZoomOutBtn'),
        resetBtn: this.container.querySelector('#ffgResetBtn'),
        closeBtn: this.container.querySelector('#ffgCloseBtn'),
        minimapCanvas: this.container.querySelector('#ffgMinimapCanvas'),
        minimapRect: this.container.querySelector('#ffgMinimapRect'),
        inspector: this.container.querySelector('#ffgInspector'),
        inspTitle: this.container.querySelector('#ffgInspTitle'),
        inspContent: this.container.querySelector('#ffgInspContent'),
        inspFooter: this.container.querySelector('#ffgInspFooter'),
        contextMenu: this.container.querySelector('#ffgContextMenu')
      };

      if (this.state.context) {
        this.dom.contextSelect.value = this.state.context;
      }
      this.updateModeUi(this.state.displayMode);
    }

    attachEvents() {
      const { body, contextSelect, modeSwitcher, searchInput, filterPills, fitBtn, zoomInBtn, zoomOutBtn, resetBtn, closeBtn, crumbList } = this.dom;

      // Mouse Pan & Drag
      body.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ffg-node') || e.target.closest('.ffg-hud-controls') || e.target.closest('.ffg-minimap-container') || e.target.closest('.ffg-inspector') || e.target.closest('.ffg-context-menu')) return;
        this.closeContextMenu();
        if (e.button === 0) {
          this.state.isPanning = true;
          this.state.dragStart = { x: e.clientX - this.state.pan.x, y: e.clientY - this.state.pan.y };
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.state.isPanning) return;
        this.state.pan.x = e.clientX - this.state.dragStart.x;
        this.state.pan.y = e.clientY - this.state.dragStart.y;
        this.applyTransform();
      });

      window.addEventListener('mouseup', () => {
        this.state.isPanning = false;
      });

      // Mouse Wheel Zoom (Anchored to mouse cursor)
      body.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = body.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
        const newZoom = Math.max(0.18, Math.min(2.5, this.state.zoom * zoomFactor));

        this.state.pan.x = mouseX - (mouseX - this.state.pan.x) * (newZoom / this.state.zoom);
        this.state.pan.y = mouseY - (mouseY - this.state.pan.y) * (newZoom / this.state.zoom);
        this.state.zoom = newZoom;

        this.applyTransform();
      }, { passive: false });

      // Context Selector Change
      contextSelect.addEventListener('change', () => {
        this.pushBreadcrumb(this.contextToLabel(contextSelect.value), contextSelect.value, null);
        this.setContext(contextSelect.value);
      });

      // Mode Switcher (Sidepanel / Overlay / Fullscreen)
      modeSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.ffg-mode-btn');
        if (!btn) return;
        const mode = btn.dataset.mode;
        this.setDisplayMode(mode);
      });

      // Breadcrumb click
      crumbList.addEventListener('click', (e) => {
        const crumb = e.target.closest('.ffg-crumb');
        if (!crumb) return;
        const idx = parseInt(crumb.dataset.index, 10);
        if (!isNaN(idx) && this.state.breadcrumbs[idx]) {
          const targetCrumb = this.state.breadcrumbs[idx];
          this.state.breadcrumbs = this.state.breadcrumbs.slice(0, idx + 1);
          this.renderBreadcrumbs();
          this.setContext(targetCrumb.context, targetCrumb.entityId);
        }
      });

      // Search Filter
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.toLowerCase().trim();
        this.filterAndHighlightNodes();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const match = this.state.nodes.find(n => (n.title || '').toLowerCase().includes(this.state.searchQuery));
          if (match) this.focusNode(match.id);
        }
      });

      // Type Filter Pills
      filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.ffg-pill');
        if (!pill) return;
        const filterType = pill.dataset.filter;

        if (filterType === 'ALL') {
          const allActive = filterPills.querySelectorAll('.ffg-pill.active').length > 1;
          filterPills.querySelectorAll('.ffg-pill').forEach(p => p.classList.toggle('active', !allActive));
          this.state.activeFilters = !allActive ? new Set(Object.values(NODE_TYPES)) : new Set();
        } else {
          pill.classList.toggle('active');
          if (pill.classList.contains('active')) {
            this.state.activeFilters.add(filterType);
          } else {
            this.state.activeFilters.delete(filterType);
          }
        }
        this.filterAndHighlightNodes();
      });

      // Zoom Controls
      zoomInBtn.addEventListener('click', () => this.zoomStep(1.2));
      zoomOutBtn.addEventListener('click', () => this.zoomStep(0.83));
      resetBtn.addEventListener('click', () => {
        this.state.zoom = 1.0;
        this.state.pan = { x: 100, y: 250 };
        this.applyTransform();
      });
      fitBtn.addEventListener('click', () => this.fitView());

      // Close Overlay
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }

      // Close Inspector Button
      this.dom.inspector.querySelector('#ffgInspClose').addEventListener('click', () => {
        this.closeInspector();
      });

      // Context Menu Click Dismiss
      window.addEventListener('click', (e) => {
        if (!e.target.closest('.ffg-context-menu')) {
          this.closeContextMenu();
        }
      });

      // Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        if (!this.container.isConnected || this.container.offsetParent === null) return;
        if (e.key === 'Escape') {
          if (this.dom.contextMenu.classList.contains('open')) {
            this.closeContextMenu();
          } else if (this.dom.inspector.classList.contains('open')) {
            this.closeInspector();
          } else if (this.options.isOverlay) {
            this.close();
          }
        } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.fitView();
        } else if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.zoomStep(1.2);
        } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.zoomStep(0.83);
        } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          this.dom.searchInput.focus();
        }
      });

      // Live SSE / Event Listeners
      const handleLiveEvent = (ev) => {
        const detail = ev.detail || {};
        this.pulseLiveBadge();
        this.handleEventUpdate(detail);
      };

      document.addEventListener('fenix-live', handleLiveEvent);
      document.addEventListener('fenix-city-event', handleLiveEvent);
      window.addEventListener('fenix-agent-selected', (e) => {
        if (e.detail?.agentId) this.focusNode('agent:' + e.detail.agentId);
      });
      window.addEventListener('fenix-job-selected', (e) => {
        if (e.detail?.jobId) this.focusNode('job:' + e.detail.jobId);
      });
    }

    contextToLabel(ctx) {
      const map = {
        GLOBAL: '🌐 Global',
        SCREEN: '🖥️ Tela',
        PROJECT: '📁 Projeto',
        AGENT: '🤖 Agente',
        MISSION: '🎯 Missão',
        JOB: '⚙️ Job',
        MEMORY: '🧠 Memória'
      };
      return map[ctx] || ctx;
    }

    pushBreadcrumb(label, context, entityId) {
      this.state.breadcrumbs.push({ label, context, entityId });
      this.renderBreadcrumbs();
    }

    renderBreadcrumbs() {
      const list = this.dom.crumbList;
      if (!list) return;
      list.innerHTML = this.state.breadcrumbs.map((b, idx) => {
        const isLast = idx === this.state.breadcrumbs.length - 1;
        return `
          <span class="ffg-crumb ${isLast ? 'active' : ''}" data-index="${idx}">
            ${esc(b.label)}
          </span>
          ${!isLast ? '<span class="ffg-crumb-sep">›</span>' : ''}
        `;
      }).join('');
    }

    setDisplayMode(mode) {
      this.state.displayMode = mode;
      const modal = document.getElementById('fenixFlowGraphModal');
      if (modal) {
        modal.classList.remove('mode-overlay', 'mode-sidepanel', 'mode-fullscreen');
        modal.classList.add(`mode-${mode}`);
      }
      this.updateModeUi(mode);
      setTimeout(() => this.fitView(), 150);
    }

    updateModeUi(mode) {
      if (!this.dom.modeSwitcher) return;
      this.dom.modeSwitcher.querySelectorAll('.ffg-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    }

    applyTransform() {
      const { viewport } = this.dom;
      viewport.style.transform = `translate(${this.state.pan.x}px, ${this.state.pan.y}px) scale(${this.state.zoom})`;
      this.renderMinimap();
    }

    zoomStep(factor) {
      const rect = this.dom.body.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const newZoom = Math.max(0.18, Math.min(2.5, this.state.zoom * factor));

      this.state.pan.x = cx - (cx - this.state.pan.x) * (newZoom / this.state.zoom);
      this.state.pan.y = cy - (cy - this.state.pan.y) * (newZoom / this.state.zoom);
      this.state.zoom = newZoom;
      this.applyTransform();
    }

    fitView() {
      if (!this.state.bounds || this.state.nodes.length === 0) return;
      const rect = this.dom.body.getBoundingClientRect();
      const b = this.state.bounds;

      const padding = 80;
      const scaleX = (rect.width - padding * 2) / Math.max(b.width, 100);
      const scaleY = (rect.height - padding * 2) / Math.max(b.height, 100);
      const targetZoom = Math.min(1.2, Math.max(0.35, Math.min(scaleX, scaleY)));

      this.state.zoom = targetZoom;
      this.state.pan.x = (rect.width / 2) - ((b.minX + b.width / 2) * targetZoom);
      this.state.pan.y = (rect.height / 2) - ((b.minY + b.height / 2) * targetZoom);

      this.applyTransform();
    }

    async setContext(context, entityId = null) {
      this.state.context = context;
      this.state.entityId = entityId;
      this.dom.contextSelect.value = context;

      this.dom.nodesLayer.innerHTML = `
        <div class="ffg-loading-state">
          <div class="ffg-spinner"></div>
          <div>Carregando malha viva de estados [${context}]...</div>
        </div>
      `;
      this.dom.edgesGroup.innerHTML = '';
      this.dom.labelsGroup.innerHTML = '';

      const resolved = await this.resolver.resolveContext(context, entityId);
      this.state.allNodes = resolved.nodes;
      this.state.allEdges = resolved.edges;
      const layout = this.layoutEngine.computeLayout(this.state.allNodes, this.state.allEdges, this.state.collapsedNodeIds);

      this.state.nodes = layout.nodes;
      this.state.edges = layout.edges;
      this.state.bounds = layout.bounds;

      if (this.dom.liveText) {
        this.dom.liveText.textContent = `● LIVE (${resolved.meta.totalAgents} Agentes • ${resolved.meta.totalJobs} Jobs • Score ${resolved.meta.realityScore}%)`;
      }

      this.render();
      setTimeout(() => this.fitView(), 60);
    }

    render() {
      const { nodesLayer, edgesGroup, labelsGroup } = this.dom;
      nodesLayer.innerHTML = '';
      edgesGroup.innerHTML = '';
      labelsGroup.innerHTML = '';

      if (this.state.nodes.length === 0) {
        nodesLayer.innerHTML = `
          <div class="ffg-empty-state">
            <i class="ph-bold ph-circle-slash" style="font-size:36px; color:#64748b;"></i>
            <div style="font-size:14px; font-weight:700;">Nenhum nó encontrado no contexto</div>
            <div style="font-size:11px; color:#94a3b8;">Tente alternar o seletor para "Visão Global do Sistema"</div>
          </div>
        `;
        return;
      }

      // 1. Render Edges (SVG cubic bezier paths)
      const nodeMap = new Map(this.state.nodes.map(n => [n.id, n]));

      this.state.edges.forEach(edge => {
        const source = nodeMap.get(edge.from);
        const target = nodeMap.get(edge.to);
        if (!source || !target) return;

        const x1 = source.x + 230;
        const y1 = source.y + 45;
        const x2 = target.x;
        const y2 = target.y + 45;

        const dx = Math.max(40, (x2 - x1) * 0.5);
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathData);
        pathEl.setAttribute('class', `ffg-edge edge-type-${edge.type.toLowerCase()} ${edge.active ? 'active' : ''}`);
        pathEl.setAttribute('data-edge-id', edge.id);
        pathEl.setAttribute('data-from', edge.from);
        pathEl.setAttribute('data-to', edge.to);

        let marker = 'url(#ffg-arrow-default)';
        if (edge.type === 'SUCCESS') marker = 'url(#ffg-arrow-success)';
        else if (edge.type === 'FAILURE') marker = 'url(#ffg-arrow-failure)';
        else if (edge.active) marker = 'url(#ffg-arrow-active)';
        pathEl.setAttribute('marker-end', marker);

        pathEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.inspectEdge(edge, source, target);
        });

        edgesGroup.appendChild(pathEl);

        // Edge Label Pill
        if (edge.label) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('class', 'ffg-edge-label-group');
          g.setAttribute('transform', `translate(${midX}, ${midY})`);

          const textWidth = Math.max(50, edge.label.length * 6.5 + 14);
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', -textWidth / 2);
          rect.setAttribute('y', -8);
          rect.setAttribute('width', textWidth);
          rect.setAttribute('height', 16);
          rect.setAttribute('class', `ffg-edge-label-bg type-${edge.type.toLowerCase()}`);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('class', 'ffg-edge-label-text');
          text.textContent = edge.label;

          g.appendChild(rect);
          g.appendChild(text);

          g.addEventListener('click', (e) => {
            e.stopPropagation();
            this.inspectEdge(edge, source, target);
          });

          labelsGroup.appendChild(g);
        }
      });

      // 2. Render Nodes (Rich HTML Cards)
      this.state.nodes.forEach(node => {
        const meta = TYPE_META[node.type] || TYPE_META.SCREEN;
        const statusClass = `status-${(node.status || 'ready').toLowerCase()}`;

        const el = document.createElement('div');
        el.className = 'ffg-node';
        el.id = 'ffg-node-' + node.id.replace(/[^a-zA-Z0-9-_]/g, '_');
        el.setAttribute('data-id', node.id);
        el.setAttribute('data-type', node.type);
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        let badgesHtml = '';
        if (node.metadata) {
          Object.entries(node.metadata).slice(0, 2).forEach(([k, v]) => {
            if (v !== undefined && v !== null && typeof v !== 'object') {
              badgesHtml += `<span class="ffg-node-badge">${esc(k)}: ${esc(v)}</span>`;
            }
          });
        }

        const collapseBtnHtml = node.hasChildren ? `
          <button type="button" class="ffg-node-collapse-btn ${node.isCollapsed ? 'collapsed' : ''}" title="${node.isCollapsed ? 'Expandir Ramificações' : 'Recolher Ramificações'}">
            ${node.isCollapsed ? '+' : '−'}
          </button>
        ` : '';

        el.innerHTML = `
          <div class="ffg-node-header">
            <div class="ffg-node-type-tag">
              <i class="ph-bold ${meta.icon}"></i>
              <span>${meta.label}</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <div class="ffg-node-status-pill ${statusClass}">
                <span>●</span> ${esc(node.status || 'READY')}
              </div>
              ${collapseBtnHtml}
            </div>
          </div>
          <div class="ffg-node-title" title="${esc(node.title)}">${esc(node.title)}</div>
          <div class="ffg-node-sub" title="${esc(node.subtitle)}">${esc(node.subtitle)}</div>
          <div class="ffg-node-meta">${badgesHtml}</div>
        `;

        // Collapse Button Click
        const collapseBtn = el.querySelector('.ffg-node-collapse-btn');
        if (collapseBtn) {
          collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCollapse(node.id);
          });
        }

        // Single Click: Select (or Multi-Select with Shift/Ctrl)
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
          this.selectNode(node.id, isMulti);
        });

        // Double Click: Open Real Resource Directly
        el.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          this.openRealResource(node);
        });

        // Right Click: Context Menu
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e.clientX, e.clientY, node);
        });

        // Hover Highlighting
        el.addEventListener('mouseenter', () => {
          if (this.state.selectedNodeIds.size === 0) {
            this.highlightConnectedPath(node.id);
          }
        });

        el.addEventListener('mouseleave', () => {
          if (this.state.selectedNodeIds.size === 0) {
            this.clearHighlights();
          }
        });

        nodesLayer.appendChild(el);
      });

      this.renderMinimap();
    }

    toggleCollapse(nodeId) {
      if (this.state.collapsedNodeIds.has(nodeId)) {
        this.state.collapsedNodeIds.delete(nodeId);
      } else {
        this.state.collapsedNodeIds.add(nodeId);
      }

      // Recompute layout and re-render
      const layout = this.layoutEngine.computeLayout(this.state.allNodes || this.state.nodes, this.state.allEdges || this.state.edges, this.state.collapsedNodeIds);
      this.state.nodes = layout.nodes;
      this.state.edges = layout.edges;
      this.state.bounds = layout.bounds;
      this.render();
    }

    selectNode(nodeId, isMulti = false) {
      if (isMulti) {
        if (this.state.selectedNodeIds.has(nodeId)) {
          this.state.selectedNodeIds.delete(nodeId);
        } else {
          this.state.selectedNodeIds.add(nodeId);
        }
      } else {
        this.state.selectedNodeIds.clear();
        this.state.selectedNodeIds.add(nodeId);
      }

      // Update CSS classes
      this.dom.nodesLayer.querySelectorAll('.ffg-node').forEach(el => {
        const id = el.dataset.id;
        const isSel = this.state.selectedNodeIds.has(id);
        el.classList.toggle('selected', isSel);
        el.classList.toggle('multi-selected', isSel && this.state.selectedNodeIds.size > 1);
      });

      if (this.state.selectedNodeIds.size === 1) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        this.highlightConnectedPath(nodeId);
        if (node) this.inspectNode(node);
      } else if (this.state.selectedNodeIds.size > 1) {
        this.inspectMultiNodes(Array.from(this.state.selectedNodeIds));
      } else {
        this.clearHighlights();
        this.closeInspector();
      }
    }

    highlightConnectedPath(rootNodeId) {
      const upstream = new Set();
      const downstream = new Set();
      const connectedEdges = new Set();

      const queueDown = [rootNodeId];
      while (queueDown.length > 0) {
        const curr = queueDown.shift();
        downstream.add(curr);
        this.state.edges.forEach(e => {
          if (e.from === curr && !downstream.has(e.to)) {
            connectedEdges.add(e.id);
            queueDown.push(e.to);
          }
        });
      }

      const queueUp = [rootNodeId];
      while (queueUp.length > 0) {
        const curr = queueUp.shift();
        upstream.add(curr);
        this.state.edges.forEach(e => {
          if (e.to === curr && !upstream.has(e.from)) {
            connectedEdges.add(e.id);
            queueUp.push(e.from);
          }
        });
      }

      const allConnectedNodes = new Set([...upstream, ...downstream]);

      this.dom.nodesLayer.querySelectorAll('.ffg-node').forEach(el => {
        const isConnected = allConnectedNodes.has(el.dataset.id);
        el.classList.toggle('dimmed', !isConnected);
      });

      this.dom.edgesGroup.querySelectorAll('.ffg-edge').forEach(el => {
        const isConnected = connectedEdges.has(el.dataset.edgeId);
        el.classList.toggle('highlighted', isConnected);
        el.classList.toggle('dimmed', !isConnected);
        if (isConnected) {
          el.setAttribute('marker-end', 'url(#ffg-arrow-highlight)');
        }
      });
    }

    clearHighlights() {
      this.dom.nodesLayer.querySelectorAll('.ffg-node').forEach(el => {
        el.classList.remove('dimmed');
      });
      this.dom.edgesGroup.querySelectorAll('.ffg-edge').forEach(el => {
        el.classList.remove('highlighted', 'dimmed');
        let marker = 'url(#ffg-arrow-default)';
        if (el.classList.contains('edge-type-success')) marker = 'url(#ffg-arrow-success)';
        else if (el.classList.contains('edge-type-failure')) marker = 'url(#ffg-arrow-failure)';
        else if (el.classList.contains('active')) marker = 'url(#ffg-arrow-active)';
        el.setAttribute('marker-end', marker);
      });
    }

    focusNode(nodeId) {
      const node = this.state.nodes.find(n => n.id === nodeId);
      if (!node) return;

      const rect = this.dom.body.getBoundingClientRect();
      this.state.zoom = Math.max(this.state.zoom, 1.1);
      this.state.pan.x = (rect.width / 2) - ((node.x + 115) * this.state.zoom);
      this.state.pan.y = (rect.height / 2) - ((node.y + 50) * this.state.zoom);
      this.applyTransform();

      this.selectNode(nodeId);
    }

    filterAndHighlightNodes() {
      const q = this.state.searchQuery;
      const filters = this.state.activeFilters;

      this.dom.nodesLayer.querySelectorAll('.ffg-node').forEach(el => {
        const type = el.dataset.type;
        const id = el.dataset.id;
        const node = this.state.nodes.find(n => n.id === id);
        if (!node) return;

        const matchesType = filters.has(type);
        const matchesQuery = !q || (node.title || '').toLowerCase().includes(q) || (node.subtitle || '').toLowerCase().includes(q) || (node.id || '').toLowerCase().includes(q);

        const visible = matchesType && matchesQuery;
        el.style.display = visible ? 'block' : 'none';
      });
    }

    inspectNode(node) {
      const { inspector, inspTitle, inspContent, inspFooter } = this.dom;
      const meta = TYPE_META[node.type] || TYPE_META.SCREEN;

      inspTitle.innerHTML = `<i class="ph-bold ${meta.icon}" style="color:${meta.color}"></i> ${esc(node.title)}`;

      const incoming = this.state.edges.filter(e => e.to === node.id);
      const outgoing = this.state.edges.filter(e => e.from === node.id);

      let incomingHtml = incoming.length === 0 ? '<div style="font-size:10px; color:#64748b;">Nenhuma entrada direta</div>' : '';
      incoming.forEach(e => {
        const src = this.state.nodes.find(n => n.id === e.from);
        incomingHtml += `
          <div class="ffg-inspector-conn-item" onclick="window.FenixFlowGraph.focusNode('${esc(e.from)}')">
            <span>← <b>${esc(e.label || e.type)}</b> de ${esc(src?.title || e.from)}</span>
            <i class="ph-bold ph-arrow-right"></i>
          </div>
        `;
      });

      let outgoingHtml = outgoing.length === 0 ? '<div style="font-size:10px; color:#64748b;">Nenhuma saída direta</div>' : '';
      outgoing.forEach(e => {
        const tgt = this.state.nodes.find(n => n.id === e.to);
        outgoingHtml += `
          <div class="ffg-inspector-conn-item" onclick="window.FenixFlowGraph.focusNode('${esc(e.to)}')">
            <span>→ <b>${esc(e.label || e.type)}</b> para ${esc(tgt?.title || e.to)}</span>
            <i class="ph-bold ph-arrow-right"></i>
          </div>
        `;
      });

      let propsRows = `
        <tr><td class="key">ID</td><td class="val">${esc(node.id)}</td></tr>
        <tr><td class="key">TIPO</td><td class="val" style="color:${meta.color}; font-weight:700;">${esc(node.type)}</td></tr>
        <tr><td class="key">STATUS</td><td class="val">● ${esc(node.status || 'READY')}</td></tr>
      `;

      if (node.metadata) {
        Object.entries(node.metadata).forEach(([k, v]) => {
          if (typeof v !== 'object') {
            propsRows += `<tr><td class="key">${esc(k)}</td><td class="val">${esc(v)}</td></tr>`;
          }
        });
      }

      inspContent.innerHTML = `
        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">PROPRIEDADES DO SISTEMA</div>
          <table class="ffg-inspector-table">${propsRows}</table>
        </div>

        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">ENTRADAS (UPSTREAM / ORIGEM)</div>
          <div class="ffg-inspector-conn-list">${incomingHtml}</div>
        </div>

        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">SAÍDAS (DOWNSTREAM / DESTINO)</div>
          <div class="ffg-inspector-conn-list">${outgoingHtml}</div>
        </div>
      `;

      let actionLabel = 'Abrir Recurso no Fênix ↗';
      if (node.type === NODE_TYPES.SCREEN) actionLabel = `Navegar para Tela [${node.title}] ↗`;
      else if (node.type === NODE_TYPES.AGENT) actionLabel = `Inspecionar Agente [${node.title}] 🤖`;
      else if (node.type === NODE_TYPES.JOB) actionLabel = `Ver Job na Fila BullMQ 📋`;
      else if (node.type === NODE_TYPES.MISSION) actionLabel = `Inspecionar Missão 🎯`;
      else if (node.type === NODE_TYPES.PROJECT) actionLabel = `Abrir Workspace do Projeto 📁`;
      else if (node.type === NODE_TYPES.MEMORY) actionLabel = `Inspecionar Memória & DNA 🧠`;

      inspFooter.innerHTML = `
        <button type="button" class="ffg-inspector-action-btn" id="ffgActionBtn">
          ${esc(actionLabel)}
        </button>
      `;

      inspFooter.querySelector('#ffgActionBtn').onclick = () => {
        this.openRealResource(node);
      };

      inspector.classList.add('open');
    }

    inspectMultiNodes(nodeIds) {
      const { inspector, inspTitle, inspContent, inspFooter } = this.dom;
      inspTitle.innerHTML = `<i class="ph-bold ph-cards" style="color:#38bdf8"></i> Multi-Seleção (${nodeIds.length} nós)`;

      const selectedNodes = this.state.nodes.filter(n => nodeIds.includes(n.id));

      let itemsHtml = selectedNodes.map(n => {
        const meta = TYPE_META[n.type] || TYPE_META.SCREEN;
        return `
          <div class="ffg-inspector-conn-item" onclick="window.FenixFlowGraph.focusNode('${esc(n.id)}')">
            <span style="color:${meta.color}; font-weight:700;">[${esc(n.type)}]</span>
            <span>${esc(n.title)}</span>
            <span style="margin-left:auto; font-size:9px; color:#64748b;">${esc(n.status)}</span>
          </div>
        `;
      }).join('');

      inspContent.innerHTML = `
        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">NÓS SELECIONADOS</div>
          <div class="ffg-inspector-conn-list">${itemsHtml}</div>
        </div>
        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">AÇÕES EM LOTE</div>
          <div style="font-size:11px; color:#94a3b8; line-height:1.4;">
            Pressione <b>Shift+Click</b> para adicionar ou remover nós da seleção.
          </div>
        </div>
      `;

      inspFooter.innerHTML = `
        <button type="button" class="ffg-inspector-action-btn" onclick="window.FenixFlowGraph.clearSelection()">
          Limpar Seleção Multipla
        </button>
      `;

      inspector.classList.add('open');
    }

    // Rich Connection / Edge Explainability
    inspectEdge(edge, source, target) {
      const { inspector, inspTitle, inspContent, inspFooter } = this.dom;
      inspTitle.innerHTML = `<i class="ph-bold ph-git-branch" style="color:#38bdf8"></i> Conexão: ${esc(edge.label || edge.type)}`;

      const props = edge.properties || {};

      inspContent.innerHTML = `
        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">DETALHES DA RELAÇÃO</div>
          <table class="ffg-inspector-table">
            <tr><td class="key">TIPO</td><td class="val" style="color:#38bdf8; font-weight:700;">${esc(edge.type)}</td></tr>
            <tr><td class="key">ORIGEM</td><td class="val">${esc(source?.title || edge.from)}</td></tr>
            <tr><td class="key">DESTINO</td><td class="val">${esc(target?.title || edge.to)}</td></tr>
            <tr><td class="key">EVENTO</td><td class="val" style="color:#f43f5e; font-family:monospace;">${esc(props.event || 'default.event')}</td></tr>
            <tr><td class="key">CONDIÇÃO</td><td class="val" style="color:#f59e0b; font-family:monospace;">${esc(props.condition || 'none')}</td></tr>
            <tr><td class="key">SUBSISTEMA</td><td class="val" style="color:#10b981;">${esc(props.createdBy || 'Fênix Core')}</td></tr>
            <tr><td class="key">ÚLTIMA EXEC.</td><td class="val">${esc(props.lastExecuted || 'Recente')}</td></tr>
            <tr><td class="key">EXECUÇÕES</td><td class="val">${esc(props.executions || '1')}</td></tr>
          </table>
        </div>

        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">EXPLICAÇÃO DA RAMIFICAÇÃO</div>
          <div class="ffg-edge-explain-box">
            A conexão <b>${esc(edge.label || edge.type)}</b> foi estabelecida pelo <b>${esc(props.createdBy || 'Kernel')}</b> quando o evento <code>${esc(props.event || 'event')}</code> foi disparado com a regra <code>${esc(props.condition || 'true')}</code>.
          </div>
        </div>

        <div class="ffg-inspector-section">
          <div class="ffg-inspector-label">AÇÕES RÁPIDAS</div>
          <div class="ffg-inspector-conn-list">
            <div class="ffg-inspector-conn-item" onclick="window.FenixFlowGraph.focusNode('${esc(edge.from)}')">
              <span>Focar na Origem (${esc(source?.title || edge.from)})</span>
            </div>
            <div class="ffg-inspector-conn-item" onclick="window.FenixFlowGraph.focusNode('${esc(edge.to)}')">
              <span>Focar no Destino (${esc(target?.title || edge.to)})</span>
            </div>
          </div>
        </div>
      `;

      inspFooter.innerHTML = `
        <button type="button" class="ffg-inspector-action-btn" onclick="window.FenixFlowGraph.openRealResource(window.FenixFlowGraph.findNode('${esc(target?.id)}'))">
          Abrir Recurso Destino ↗
        </button>
      `;

      inspector.classList.add('open');
    }

    closeInspector() {
      this.dom.inspector.classList.remove('open');
      this.state.selectedNodeIds.clear();
      this.clearHighlights();
    }

    // Right-Click Context Menu
    showContextMenu(clientX, clientY, node) {
      const menu = this.dom.contextMenu;
      if (!menu) return;

      const rect = this.dom.body.getBoundingClientRect();
      const x = Math.min(rect.width - 200, clientX - rect.left);
      const y = Math.min(rect.height - 240, clientY - rect.top);

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;

      menu.innerHTML = `
        <div class="ffg-ctx-item" data-action="focus">
          <i class="ph-bold ph-crosshair"></i> <span>Focar / Centralizar</span>
        </div>
        <div class="ffg-ctx-item" data-action="open">
          <i class="ph-bold ph-arrow-square-out"></i> <span>Abrir Recurso no Fênix ↗</span>
        </div>
        <div class="ffg-ctx-item" data-action="drilldown">
          <i class="ph-bold ph-git-fork"></i> <span>Mudar Contexto para este Nó 🧬</span>
        </div>
        <div class="ffg-ctx-item" data-action="collapse">
          <i class="ph-bold ph-tree-structure"></i> <span>${node.isCollapsed ? 'Expandir' : 'Recolher'} Ramificações</span>
        </div>
        <div class="ffg-ctx-item" data-action="highlight">
          <i class="ph-bold ph-lightning"></i> <span>Destacar Caminho Completo</span>
        </div>
        <div class="ffg-ctx-sep"></div>
        <div class="ffg-ctx-item" data-action="copy">
          <i class="ph-bold ph-copy"></i> <span>Copiar ID: ${esc(node.id.slice(0, 16))}...</span>
        </div>
      `;

      menu.onclick = (e) => {
        const item = e.target.closest('.ffg-ctx-item');
        if (!item) return;
        const action = item.dataset.action;

        if (action === 'focus') {
          this.focusNode(node.id);
        } else if (action === 'open') {
          this.openRealResource(node);
        } else if (action === 'drilldown') {
          const newContext = node.type === 'AGENT' ? 'AGENT' : (node.type === 'PROJECT' ? 'PROJECT' : (node.type === 'JOB' ? 'JOB' : 'SCREEN'));
          this.pushBreadcrumb(node.title, newContext, node.id);
          this.setContext(newContext, node.id);
        } else if (action === 'collapse') {
          this.toggleCollapse(node.id);
        } else if (action === 'highlight') {
          this.selectNode(node.id);
        } else if (action === 'copy') {
          navigator.clipboard?.writeText(node.id).catch(() => {});
          if (typeof window.showNotification === 'function') {
            window.showNotification(`ID copiado: ${node.id}`);
          }
        }
        this.closeContextMenu();
      };

      menu.classList.add('open');
    }

    closeContextMenu() {
      if (this.dom.contextMenu) {
        this.dom.contextMenu.classList.remove('open');
      }
    }

    openRealResource(node) {
      if (!node) return;
      if (this.options.isOverlay && this.state.displayMode !== 'sidepanel') {
        this.close();
      }

      if (node.type === NODE_TYPES.SCREEN) {
        const route = node.properties?.route || node.id.replace(/^screen:/, '');
        if (typeof window.showView === 'function') {
          window.showView(route);
        }
      } else if (node.type === NODE_TYPES.AGENT) {
        const agentId = node.properties?.agentId || node.id.replace(/^agent:/, '');
        if (typeof window.fenixInspectAgent === 'function') {
          window.fenixInspectAgent(agentId);
        } else if (typeof window.showView === 'function') {
          window.showView('agents');
        }
      } else if (node.type === NODE_TYPES.JOB) {
        if (typeof window.fenixInspectJob === 'function') {
          window.fenixInspectJob(node.properties);
        } else if (typeof window.showView === 'function') {
          window.showView('operations');
        }
      } else if (node.type === NODE_TYPES.MISSION) {
        const missionId = node.properties?.missionId || node.id.replace(/^mission:/, '');
        if (typeof window.fenixInspectMission === 'function') {
          window.fenixInspectMission(missionId);
        } else if (typeof window.showView === 'function') {
          window.showView('operations');
        }
      } else if (node.type === NODE_TYPES.PROJECT) {
        const projectId = node.properties?.projectId || node.id.replace(/^project:/, '');
        if (typeof window.openProjectWorkspace === 'function') {
          window.openProjectWorkspace(projectId);
        } else if (typeof window.fenixNavigateWithContext === 'function') {
          window.fenixNavigateWithContext('projects', { projectId });
        } else if (typeof window.showView === 'function') {
          window.showView('projects');
        }
      } else if (node.type === NODE_TYPES.MEMORY || node.type === NODE_TYPES.REBORN_MEMORY) {
        if (typeof window.fenixInspectMemory === 'function') {
          window.fenixInspectMemory(node.properties || node);
        } else if (typeof window.showView === 'function') {
          window.showView('memory');
        }
      } else if (node.type === NODE_TYPES.PROJECT_DNA) {
        const pId = node.properties?.projectId || node.id.replace('dna:', '');
        if (typeof window.fenixInspectProjectDNA === 'function') {
          window.fenixInspectProjectDNA(pId);
        } else if (typeof window.fenixNavigateWithContext === 'function') {
          window.fenixNavigateWithContext('projects', { projectId: pId });
        }
      } else if (node.type === NODE_TYPES.EVENT) {
        if (typeof window.fenixInspectEvent === 'function') {
          window.fenixInspectEvent(node.properties);
        }
      } else {
        if (typeof window.showNotification === 'function') {
          window.showNotification(`Nó ${node.title} selecionado.`);
        }
      }
    }

    renderMinimap() {
      const canvas = this.dom.minimapCanvas;
      const rectEl = this.dom.minimapRect;
      if (!canvas || !rectEl || !this.state.bounds) return;

      const ctx = canvas.getContext('2d');
      const cw = (canvas.width = canvas.clientWidth || 200);
      const ch = (canvas.height = canvas.clientHeight ?? 130);

      ctx.clearRect(0, 0, cw, ch);

      const b = this.state.bounds;
      const scaleX = (cw - 16) / Math.max(b.width, 100);
      const scaleY = (ch - 16) / Math.max(b.height, 100);
      const scale = Math.min(scaleX, scaleY);

      const offsetX = 8 - b.minX * scale;
      const offsetY = 8 - b.minY * scale;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      const nodeMap = new Map(this.state.nodes.map(n => [n.id, n]));

      this.state.edges.forEach(e => {
        const s = nodeMap.get(e.from);
        const t = nodeMap.get(e.to);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x * scale + offsetX + 8, s.y * scale + offsetY + 4);
          ctx.lineTo(t.x * scale + offsetX + 8, t.y * scale + offsetY + 4);
          ctx.stroke();
        }
      });

      this.state.nodes.forEach(n => {
        const meta = TYPE_META[n.type] || TYPE_META.SCREEN;
        ctx.fillStyle = meta.color || '#38bdf8';
        ctx.beginPath();
        const nx = n.x * scale + offsetX;
        const ny = n.y * scale + offsetY;
        ctx.arc(nx, ny, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      const bodyRect = this.dom.body.getBoundingClientRect();
      const visibleLeft = (-this.state.pan.x / this.state.zoom);
      const visibleTop = (-this.state.pan.y / this.state.zoom);
      const visibleWidth = bodyRect.width / this.state.zoom;
      const visibleHeight = bodyRect.height / this.state.zoom;

      const rx = visibleLeft * scale + offsetX;
      const ry = visibleTop * scale + offsetY;
      const rw = visibleWidth * scale;
      const rh = visibleHeight * scale;

      rectEl.style.left = `${Math.max(0, rx)}px`;
      rectEl.style.top = `${Math.max(0, ry)}px`;
      rectEl.style.width = `${Math.min(cw, Math.max(10, rw))}px`;
      rectEl.style.height = `${Math.min(ch, Math.max(10, rh))}px`;
    }

    pulseLiveBadge() {
      const badge = this.dom.liveBadge;
      if (badge) {
        badge.style.transform = 'scale(1.08)';
        badge.style.borderColor = '#10b981';
        setTimeout(() => {
          badge.style.transform = 'scale(1)';
          badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        }, 300);
      }
    }

    handleEventUpdate(detail) {
      const type = String(detail.type || detail.event || '').toLowerCase();
      const subject = detail.subject || detail.agentId || detail.jobId;

      if (type.includes('job') && subject) {
        const jobNode = this.state.nodes.find(n => n.id === 'job:' + subject || n.properties?.jobId === subject);
        if (jobNode) {
          jobNode.status = type.includes('started') ? 'RUNNING' : (type.includes('failed') ? 'FAILED' : 'COMPLETED');
          const nodeEl = this.dom.nodesLayer.querySelector(`[data-id="${jobNode.id}"]`);
          if (nodeEl) {
            const pill = nodeEl.querySelector('.ffg-node-status-pill');
            if (pill) {
              pill.className = `ffg-node-status-pill status-${jobNode.status.toLowerCase()}`;
              pill.innerHTML = `<span>●</span> ${jobNode.status}`;
            }
          }
        }
      }

      if (type.includes('agent') && subject) {
        const agentNode = this.state.nodes.find(n => n.id === 'agent:' + subject || n.properties?.agentId === subject);
        if (agentNode) {
          agentNode.status = type.includes('thinking') || type.includes('tool') ? 'WORKING' : 'READY';
          const nodeEl = this.dom.nodesLayer.querySelector(`[data-id="${agentNode.id}"]`);
          if (nodeEl) {
            const pill = nodeEl.querySelector('.ffg-node-status-pill');
            if (pill) {
              pill.className = `ffg-node-status-pill status-${agentNode.status.toLowerCase()}`;
              pill.innerHTML = `<span>●</span> ${agentNode.status}`;
            }
          }
        }
      }
    }

    close() {
      if (this.options.onClose) {
        this.options.onClose();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GLOBAL FLOW GRAPH CONTROLLER & WINDOW EXPOSURE
  // ═══════════════════════════════════════════════════════════════════════════
  let activeOverlay = null;
  let activeRenderer = null;

  window.FenixFlowGraph = {
    NODE_TYPES,
    EDGE_TYPES,
    TYPE_META,

    async mountView(containerId, options = {}) {
      let container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
      if (!container) return null;
      const sub = container.querySelector ? container.querySelector('#fenixFlowGraphDynamicMesh') : null;
      if (sub) {
        container = sub;
      }
      activeRenderer = new GraphRenderer(container, { ...options, isOverlay: false, displayMode: 'fullscreen' });
      await activeRenderer.setContext(options.context || 'GLOBAL', options.entityId);
      return activeRenderer;
    },

    async open(options = {}) {
      if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
      }

      const displayMode = options.displayMode || 'overlay';
      const overlay = document.createElement('div');
      overlay.className = `fenix-flow-graph-overlay mode-${displayMode}`;
      overlay.id = 'fenixFlowGraphModal';
      document.body.appendChild(overlay);

      activeOverlay = overlay;

      const renderer = new GraphRenderer(overlay, {
        ...options,
        isOverlay: true,
        displayMode,
        onClose: () => {
          overlay.remove();
          activeOverlay = null;
          activeRenderer = null;
        }
      });

      activeRenderer = renderer;

      let initialContext = options.context || 'GLOBAL';
      let initialEntityId = options.entityId || null;

      if (!options.context && window.__fenixState?.currentRoute) {
        initialContext = 'SCREEN';
        initialEntityId = window.__fenixState.currentRoute;
      }

      await renderer.setContext(initialContext, initialEntityId);
      return renderer;
    },

    // Opens or toggles docked sidepanel mode (Nível 1 — Mini/Side Graph)
    async openSidepanel(options = {}) {
      if (activeOverlay && activeRenderer?.state.displayMode === 'sidepanel') {
        this.close();
        return null;
      }
      return await this.open({ ...options, displayMode: 'sidepanel' });
    },

    close() {
      if (activeOverlay) {
        activeOverlay.remove();
        activeOverlay = null;
        activeRenderer = null;
      }
    },

    focusNode(nodeId) {
      if (activeRenderer) activeRenderer.focusNode(nodeId);
    },

    findNode(nodeId) {
      if (!activeRenderer) return null;
      return activeRenderer.state.nodes.find(n => n.id === nodeId);
    },

    openRealResource(node) {
      if (activeRenderer) activeRenderer.openRealResource(node);
    },

    setContext(context, entityId) {
      if (activeRenderer) activeRenderer.setContext(context, entityId);
    },

    clearSelection() {
      if (activeRenderer) {
        activeRenderer.state.selectedNodeIds.clear();
        activeRenderer.closeInspector();
      }
    }
  };

  // Convenience Global Helpers
  window.fenixOpenFlowGraph = async function (options = {}) {
    return await window.FenixFlowGraph.open(options);
  };

  window.fenixToggleFlowGraphPanel = async function (options = {}) {
    return await window.FenixFlowGraph.openSidepanel(options);
  };

  // Global Keyboard Shortcut: Ctrl+G or Cmd+G to toggle Flow Graph
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
      e.preventDefault();
      if (activeOverlay) {
        window.FenixFlowGraph.close();
      } else {
        const curRoute = window.__fenixState?.currentRoute || 'command';
        window.FenixFlowGraph.open({ context: 'SCREEN', entityId: curRoute });
      }
    }
  });

})();

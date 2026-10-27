((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FenixCityMachineScene = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MACHINE_ANCHOR = Object.freeze({ x: -18, z: 2 });
  const MACHINE_COLUMNS = 4;
  const MACHINE_SPACING = 3.2;
  const PROJECT_ANCHOR = Object.freeze({ x: 63, z: 32 });
  const PROJECT_COLUMNS = 7;
  const PROJECT_SPACING_X = 7.2;
  const PROJECT_SPACING_Z = 7.0;
  const PROJECT_SPACING = PROJECT_SPACING_X;
  const PROJECT_COLORS = Object.freeze(['#4e8f88', '#657ea0', '#9a8053', '#806d9b', '#4e8492']);
  const LOGISTICS_TRAFFIC_ROUTE = Object.freeze({ x: 22, startZ: -37, endZ: -4, speed: 3.4 });
  const CANONICAL_BUILDING_IDS = Object.freeze({
    'command-center': 'bld-fenix-hq',
    'fenix-hq': 'bld-fenix-hq',
    'bld-fenix-hq': 'bld-fenix-hq',
    logistics: 'bld-deposito-mais',
    'industrial-hub': 'bld-deposito-mais',
    'deposito-mais': 'bld-deposito-mais',
    'bld-deposito-mais': 'bld-deposito-mais',
    'mf-atacadista': 'bld-mf-atacadista',
    'bld-mf-atacadista': 'bld-mf-atacadista',
    'api-platform': 'bld-api-platform',
    'bld-api-platform': 'bld-api-platform',
    'zapai-crm': 'bld-zapai-crm',
    'bld-zapai-crm': 'bld-zapai-crm',
    'fortlev-quote': 'bld-fortlev-quote',
    'bld-fortlev-quote': 'bld-fortlev-quote',
    'dev-district': 'bld-dev-loft',
    'bld-dev-loft': 'bld-dev-loft',
    'ai-district': 'bld-ai-nexus',
    'bld-ai-nexus': 'bld-ai-nexus',
  });

  const ARCHETYPE_DIMENSIONS = Object.freeze({
    warehouse: Object.freeze({ width: 7.2, depth: 5.4, height: 4.2 }),
    tech_cloud: Object.freeze({ width: 6.0, depth: 5.2, height: 6.5 }),
    commerce_crm: Object.freeze({ width: 6.4, depth: 5.2, height: 5.2 }),
    fintech: Object.freeze({ width: 5.8, depth: 5.0, height: 7.0 }),
    dev_studio: Object.freeze({ width: 6.2, depth: 5.0, height: 4.8 }),
  });

  function resolveProjectArchetype(project = {}) {
    const hint = [
      project.id,
      project.name,
      project.group,
      project.workspace,
      project.stack
    ].filter(Boolean).join(' ').toLowerCase();

    if (/deposito|wms|logistic|atacad|estoque|distrib|frete|transp|armaz|supply/.test(hint)) return 'warehouse';
    if (/pay|bank|crypto|finan|invest|carteira|ledger|vault|fiscal|contabil|billing/.test(hint)) return 'fintech';
    if (/crm|zapai|zapflow|quote|fortlev|commerce|shop|venda|lead|market|store|atendimento/.test(hint)) return 'commerce_crm';
    if (/api|platform|fastify|gateway|cloud|infra|runtime|core|server|bai|browser|docker|kubernetes/.test(hint)) return 'tech_cloud';
    return 'dev_studio';
  }

  function resolveSupervisorProfile(project = {}, archetype = 'dev_studio') {
    const profiles = {
      warehouse: { id: `sup-wh-${project.id}`, name: 'Marcos Silva', role: 'Supervisor de Logística & WMS', dept: 'Logística & Atacado' },
      tech_cloud: { id: `sup-tc-${project.id}`, name: 'Victor Hugo', role: 'Tech Lead & SRE Gateway', dept: 'Infraestrutura Cloud' },
      commerce_crm: { id: `sup-crm-${project.id}`, name: 'Elena Santos', role: 'Supervisora de Operações & CRM', dept: 'Comercial & Atendimento' },
      fintech: { id: `sup-fin-${project.id}`, name: 'Gabriel Costa', role: 'Supervisor de Risco & Liquidação', dept: 'Finanças & Liquidação' },
      dev_studio: { id: `sup-dev-${project.id}`, name: 'Alex Rivera', role: 'Lead Software Architect', dept: 'Engenharia de Software' },
    };
    return profiles[archetype] || profiles.dev_studio;
  }

  function validId(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function canonicalBuildingId(selection = {}) {
    if (typeof selection === 'string') {
      selection = { id: selection };
    }
    const type = String(selection?.type || '').toLowerCase();
    const value = selection?.buildingId || selection?.id || selection?.districtId || selection?.companyId;
    const id = String(value || '').trim();
    if (!id) return null;
    const canonical = CANONICAL_BUILDING_IDS[id.toLowerCase()];
    if (canonical) return canonical;
    return type === 'building' && id.startsWith('bld-') ? id : null;
  }

  function advanceLaneTraffic(state = {}, deltaSeconds = 0) {
    const route = LOGISTICS_TRAFFIC_ROUTE;
    const span = route.endZ - route.startZ;
    const z = Number.isFinite(Number(state.z)) ? Number(state.z) : route.startZ;
    const direction = Number(state.direction) < 0 ? -1 : 1;
    const offset = Math.max(0, Math.min(span, z - route.startZ));
    const period = span * 2;
    const currentPhase = direction > 0 ? offset : period - offset;
    const elapsed = Math.max(0, Number(deltaSeconds) || 0);
    const phase = ((currentPhase + elapsed * route.speed) % period + period) % period;
    const forward = phase < span;
    const routeOffset = forward ? phase : period - phase;
    const nextDirection = forward ? 1 : -1;
    return {
      x: route.x,
      z: route.startZ + routeOffset,
      direction: nextDirection,
      rotationY: nextDirection > 0 ? 0 : Math.PI,
    };
  }

  function projectMachineScene(machines, anchor = MACHINE_ANCHOR) {
    if (!Array.isArray(machines)) return [];
    const unique = new Set();
    const accepted = machines.filter((machine) => {
      if (!machine || !validId(machine.id) || !['runtime', 'worker'].includes(machine.kind) || unique.has(machine.id)) return false;
      unique.add(machine.id);
      return true;
    });
    const columns = Math.min(MACHINE_COLUMNS, Math.max(1, accepted.length));
    return accepted.map((machine, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const rowsInThisBand = Math.min(columns, accepted.length - row * columns);
      const centeredColumn = column - (rowsInThisBand - 1) / 2;
      return {
        id: machine.id,
        name: validId(machine.name) ? machine.name : machine.id,
        kind: machine.kind,
        status: machine.status || 'UNKNOWN',
        currentJob: validId(machine.currentJob) ? machine.currentJob : null,
        processed: Number.isFinite(machine.processed) ? machine.processed : null,
        failed: Number.isFinite(machine.failed) ? machine.failed : null,
        lastHeartbeat: machine.lastHeartbeat || null,
        hostname: machine.hostname || null,
        memoryFreeBytes: Number.isFinite(machine.memoryFreeBytes) ? machine.memoryFreeBytes : null,
        memoryTotalBytes: Number.isFinite(machine.memoryTotalBytes) ? machine.memoryTotalBytes : null,
        cpuLoad1m: Number.isFinite(machine.cpuLoad1m) ? machine.cpuLoad1m : null,
        position: {
          x: anchor.x + centeredColumn * MACHINE_SPACING,
          y: 0,
          z: anchor.z + row * MACHINE_SPACING,
        },
      };
    });
  }

  function projectSceneSites(projects, recentJobs = [], anchor = PROJECT_ANCHOR) {
    if (!Array.isArray(projects)) return [];
    const seen = new Set();
    const candidates = projects.filter((project) => {
      if (!project || !validId(project.id) || seen.has(project.id)) return false;
      seen.add(project.id);
      return true;
    });
    return candidates.map((project, index) => {
      const column = index % PROJECT_COLUMNS;
      const row = Math.floor(index / PROJECT_COLUMNS);
      const columnsInThisRow = Math.min(PROJECT_COLUMNS, candidates.length - row * PROJECT_COLUMNS);
      const hash = [...project.id].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 7);
      const linkedJobs = Array.isArray(recentJobs) ? recentJobs.filter((job) => job?.projectId === project.id) : [];
      const runningJobs = linkedJobs.filter((job) => String(job.status).toUpperCase() === 'RUNNING').length;
      const queuedJobs = linkedJobs.filter((job) => String(job.status).toUpperCase() === 'QUEUED').length;
      const failedJobs = linkedJobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(String(job.status).toUpperCase())).length;
      const archetype = resolveProjectArchetype(project);
      const dimensions = ARCHETYPE_DIMENSIONS[archetype] || ARCHETYPE_DIMENSIONS.dev_studio;
      const supervisor = resolveSupervisorProfile(project, archetype);
      const posX = Number((anchor.x + (column - (columnsInThisRow - 1) / 2) * PROJECT_SPACING_X).toFixed(2));
      const posZ = Number((anchor.z + row * PROJECT_SPACING_Z).toFixed(2));

      return {
        id: project.id,
        sceneId: `fenix-project:${project.id}`,
        name: validId(project.name) ? project.name : project.id,
        status: project.lifecycleState || project.status || 'UNKNOWN',
        activityStatus: failedJobs ? 'FAILED' : runningJobs ? 'RUNNING' : queuedJobs ? 'QUEUED' : project.lifecycleState || project.status || 'UNKNOWN',
        runningJobs,
        queuedJobs,
        failedJobs,
        workspace: project.workspace || null,
        archetype,
        dimensions,
        lot: { width: 8.8, depth: 6.6 },
        supervisor,
        entryPosition: {
          x: posX,
          y: 0.8,
          z: Number((posZ + dimensions.depth / 2 + 0.6).toFixed(2)),
        },
        color: PROJECT_COLORS[hash % PROJECT_COLORS.length],
        position: {
          x: posX,
          y: 0,
          z: posZ,
        },
      };
    });
  }

  return Object.freeze({
    ARCHETYPE_DIMENSIONS,
    CANONICAL_BUILDING_IDS,
    LOGISTICS_TRAFFIC_ROUTE,
    PROJECT_ANCHOR,
    PROJECT_COLUMNS,
    PROJECT_SPACING,
    PROJECT_SPACING_X,
    PROJECT_SPACING_Z,
    advanceLaneTraffic,
    canonicalBuildingId,
    projectMachineScene,
    projectSceneSites,
    resolveProjectArchetype,
    resolveSupervisorProfile,
  });
});


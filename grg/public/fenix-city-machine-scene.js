((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FenixCityMachineScene = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MACHINE_ANCHOR = Object.freeze({ x: -18, z: 2 });
  const MACHINE_COLUMNS = 4;
  const MACHINE_SPACING = 3.2;
  const PROJECT_ANCHOR = Object.freeze({ x: 42, z: 20 });
  const PROJECT_COLUMNS = 6;
  const PROJECT_SPACING = 8.5;
  const MAX_PROJECT_SITES = 32;
  const PROJECT_COLORS = Object.freeze(['#27d7c4', '#7aa2ff', '#e8b45d', '#ba8cff', '#69c7e8']);

  function validId(value) {
    return typeof value === 'string' && value.trim().length > 0;
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
    const sites = candidates.slice(-MAX_PROJECT_SITES);
    return sites.map((project, index) => {
      const column = index % PROJECT_COLUMNS;
      const row = Math.floor(index / PROJECT_COLUMNS);
      const hash = [...project.id].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 7);
      const linkedJobs = Array.isArray(recentJobs) ? recentJobs.filter((job) => job?.projectId === project.id) : [];
      const runningJobs = linkedJobs.filter((job) => String(job.status).toUpperCase() === 'RUNNING').length;
      const queuedJobs = linkedJobs.filter((job) => String(job.status).toUpperCase() === 'QUEUED').length;
      const failedJobs = linkedJobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(String(job.status).toUpperCase())).length;
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
        color: PROJECT_COLORS[hash % PROJECT_COLORS.length],
        position: {
          x: anchor.x + (column - (PROJECT_COLUMNS - 1) / 2) * PROJECT_SPACING,
          y: 0,
          z: anchor.z + row * PROJECT_SPACING,
        },
      };
    });
  }

  return Object.freeze({ projectMachineScene, projectSceneSites, maxProjectSites: MAX_PROJECT_SITES });
});

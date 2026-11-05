(function attachAgentRosterFilter(root, factory) {
  const filter = factory();
  if (typeof module === 'object' && module.exports) module.exports = filter;
  if (root) root.FenixAgentRosterFilter = filter;
})(typeof window !== 'undefined' ? window : globalThis, function createAgentRosterFilter() {
  'use strict';

  const WORKING = new Set(['WORKING', 'BUSY', 'RUNNING', 'THINKING', 'TOOL_CALL', 'IN_PROGRESS']);
  const AVAILABLE = new Set(['IDLE', 'AVAILABLE', 'READY', 'STANDBY']);
  const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  function classifyAgent(agent) {
    const status = String(agent?.state || agent?.status || '').trim().toUpperCase();
    const currentTask = String(agent?.currentTask || agent?.currentJob || '').trim();
    if (WORKING.has(status)) return 'WORKING';
    if (AVAILABLE.has(status)) return 'AVAILABLE';
    if (currentTask && !/^(none|n\/a|idle|aguardando)$/i.test(currentTask)) return 'WORKING';
    return 'OTHER';
  }

  function filterAgentRoster(agents, { query = '', status = 'all' } = {}) {
    const needle = normalize(query.trim());
    return (Array.isArray(agents) ? agents : []).filter((agent) => {
      if (!agent || typeof agent !== 'object') return false;
      const classification = classifyAgent(agent);
      if (status === 'WORKING' && classification !== 'WORKING') return false;
      if (status === 'AVAILABLE' && classification !== 'AVAILABLE') return false;
      if (status === 'other' && classification !== 'OTHER') return false;
      if (!needle) return true;
      const skills = [agent.skills, agent.tools, agent.capabilities].flatMap((list) => Array.isArray(list) ? list : []);
      const searchable = [agent.id, agent.agentId, agent.name, agent.role, agent.domain, agent.squad, agent.team, agent.location, agent.district, agent.currentTask, agent.currentJob, ...skills.map((skill) => typeof skill === 'string' ? skill : skill?.name || skill?.id)];
      return searchable.some((value) => normalize(value).includes(needle));
    });
  }

  function summarizeAgentRoster(agents) {
    const summary = { registered: 0, working: 0, available: 0, other: 0 };
    for (const agent of Array.isArray(agents) ? agents : []) {
      if (!agent || typeof agent !== 'object') continue;
      summary.registered += 1;
      const classification = classifyAgent(agent);
      if (classification === 'WORKING') summary.working += 1;
      else if (classification === 'AVAILABLE') summary.available += 1;
      else summary.other += 1;
    }
    return summary;
  }

  return { classifyAgent, filterAgentRoster, summarizeAgentRoster };
});

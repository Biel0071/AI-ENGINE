(function attachAgentActivityFilter(root, factory) {
  const filter = factory();
  if (typeof module === 'object' && module.exports) module.exports = filter;
  if (root) root.FenixAgentActivityFilter = filter;
})(typeof window !== 'undefined' ? window : globalThis, function createAgentActivityFilter() {
  'use strict';

  const asText = (value) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const unique = (values) => [...new Set(values.map(asText).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const dataOf = (event) => event?.data && typeof event.data === 'object' ? event.data : {};

  function agentIds(event) {
    const data = dataOf(event);
    const ids = [event?.agentId, data.agentId, data.agent?.id, data.agent?.agentId];
    const subject = asText(event?.subject).match(/^agent:(.+)$/i);
    if (subject) ids.push(subject[1]);
    return unique(ids);
  }

  function relationIds(event) {
    const data = dataOf(event);
    const ids = [event?.missionId, event?.jobId, data.missionId, data.jobId, data.mission?.id, data.job?.id];
    const subject = asText(event?.subject).match(/^(?:mission|job):(.+)$/i);
    if (subject) ids.push(subject[1]);
    return unique(ids);
  }

  function eventLevel(event) {
    const data = dataOf(event);
    const value = asText(event?.level || event?.severity || data.level || data.severity);
    return value ? value.toUpperCase() : 'UNDECLARED';
  }

  function eventTimestamp(event) {
    const value = event?.occurredAt || event?.timestamp || event?.createdAt || event?.recordedAt;
    const timestamp = value ? Date.parse(value) : NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function buildActivityFilterOptions(events) {
    const list = Array.isArray(events) ? events : [];
    return {
      agents: unique(list.flatMap(agentIds)),
      relations: unique(list.flatMap(relationIds)),
      levels: unique(list.map(eventLevel).filter((level) => level !== 'UNDECLARED'))
    };
  }

  function filterAgentActivity(events, filters = {}, now = Date.now()) {
    const agentId = asText(filters.agentId);
    const relation = asText(filters.relation).toLocaleLowerCase('pt-BR');
    const level = asText(filters.level).toUpperCase();
    const periodMs = ({ '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 })[filters.period] || null;
    const cutoff = periodMs ? now - periodMs : null;
    return (Array.isArray(events) ? events : []).filter((event) => {
      if (!event || typeof event !== 'object') return false;
      if (agentId && !agentIds(event).includes(agentId)) return false;
      if (relation && !relationIds(event).some((id) => id.toLocaleLowerCase('pt-BR').includes(relation))) return false;
      if (level && eventLevel(event) !== level) return false;
      if (cutoff !== null) {
        const timestamp = eventTimestamp(event);
        if (timestamp === null || timestamp < cutoff || timestamp > now) return false;
      }
      return true;
    });
  }

  return { agentIds, relationIds, eventLevel, eventTimestamp, buildActivityFilterOptions, filterAgentActivity };
});

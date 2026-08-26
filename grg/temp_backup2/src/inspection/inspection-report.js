const crypto = require('node:crypto');
const { ValidationError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
const { stable } = require('../governance/approval-engine');

const ENTITY_TYPES = new Set(['project', 'service', 'class', 'module', 'api', 'database', 'table', 'event', 'worker', 'capability', 'container', 'pipeline', 'document', 'script', 'library', 'framework', 'ai-model', 'runtime', 'queue', 'cache', 'integration', 'authentication', 'authorization']);

function parseInspectionReport(stdout) {
  if (Buffer.byteLength(String(stdout || '')) > 10_000_000) throw new ValidationError('inspection report exceeds 10MB');
  let input; try { input = JSON.parse(String(stdout || '')); } catch { throw new ValidationError('inspection sandbox must return one valid JSON report'); }
  if (input.schemaVersion !== 1 || !input.revision || !Array.isArray(input.entities) || !Array.isArray(input.relationships)) throw new ValidationError('invalid inspection report envelope');
  if (input.entities.length > 10_000 || input.relationships.length > 20_000) throw new ValidationError('inspection report exceeds entity limits');
  const entities = input.entities.map(normalizeEntity); const keys = new Set(entities.map((item) => item.key));
  if (keys.size !== entities.length) throw new ValidationError('inspection entity keys must be unique');
  const relationships = input.relationships.map((item) => normalizeRelationship(item, keys));
  const report = { schemaVersion: 1, revision: String(input.revision).slice(0, 200), sourceHash: String(input.sourceHash || '').slice(0, 128), summary: String(input.summary || '').slice(0, 20_000), architecture: object(input.architecture), metrics: object(input.metrics), entities, relationships, risks: findings(input.risks, 500), roadmap: findings(input.roadmap, 500), documents: documents(input.documents), generatedAt: input.generatedAt || new Date().toISOString() };
  assertNoSecrets(report); report.reportHash = crypto.createHash('sha256').update(JSON.stringify(stable(report))).digest('hex'); return report;
}
function normalizeEntity(item) { const type = String(item?.type || '').toLowerCase(); const key = String(item?.key || '').trim(); if (!ENTITY_TYPES.has(type) || !/^[a-zA-Z0-9._:/@-]{1,500}$/.test(key)) throw new ValidationError(`invalid inspection entity: ${type}:${key}`); return { type, key, label: String(item.label || key).slice(0, 500), attributes: object(item.attributes), confidence: confidence(item.confidence), evidence: evidence(item.evidence) }; }
function normalizeRelationship(item, keys) { const fromKey = String(item?.fromKey || ''); const toKey = String(item?.toKey || ''); if (!keys.has(fromKey) || !keys.has(toKey) || fromKey === toKey || !/^[A-Z][A-Z0-9_]{1,80}$/.test(String(item.type || ''))) throw new ValidationError('invalid inspection relationship'); return { fromKey, toKey, type: String(item.type), attributes: object(item.attributes), confidence: confidence(item.confidence), evidence: evidence(item.evidence) }; }
function evidence(values) { if (!Array.isArray(values) || !values.length || values.length > 100) throw new ValidationError('inspection fact requires evidence'); return values.map((item) => { const reference = String(item?.reference || item?.path || '').slice(0, 1000); if (!reference || /(^|[\\/])\.\.([\\/]|$)/.test(reference)) throw new ValidationError('invalid inspection evidence reference'); return { reference, line: item.line == null ? null : Math.max(1, Number(item.line)), hash: item.hash ? String(item.hash).slice(0, 128) : null }; }); }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? structuredClone(value) : {}; }
function list(value, limit) { return Array.isArray(value) ? structuredClone(value.slice(0, limit)) : []; }
function findings(value, limit) { return list(value, limit).map((item) => { if (!Array.isArray(item.evidence) || !item.evidence.length) throw new ValidationError('inspection risk and proposal require evidence'); return item; }); }
function documents(value) { return list(value, 5000).map((item) => { const reference = String(item?.path || item?.reference || '').slice(0, 1000); if (!reference || /(^|[\\/])\.\.([\\/]|$)/.test(reference)) throw new ValidationError('invalid indexed document reference'); return { ...item, path: reference }; }); }
function confidence(value) { const number = Number(value ?? 0.5); if (number < 0 || number > 1) throw new ValidationError('inspection confidence must be between 0 and 1'); return number; }
module.exports = { parseInspectionReport, ENTITY_TYPES };

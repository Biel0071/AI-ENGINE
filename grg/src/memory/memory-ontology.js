'use strict';
/**
 * FÊNIX REBORN MEMORY ONTOLOGY (LEVELS 0 - 6)
 * Strict schema definitions for Living Memory, Causal Provenance & Knowledge Evolution
 */

const MEMORY_LEVELS = Object.freeze({
  L0_RAW: 0,
  L1_EPISODE: 1,
  L2_PATTERN: 2,
  L3_CONCEPT: 3,
  L4_PRINCIPLE: 4,
  L5_CAPABILITY: 5,
  L6_REBORN: 6,
});

const LEVEL_NAMES = Object.freeze({
  0: 'RAW',
  1: 'EPISODE',
  2: 'PATTERN',
  3: 'CONCEPT',
  4: 'PRINCIPLE',
  5: 'CAPABILITY',
  6: 'REBORN',
});

const MEMORY_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  DEPRECATED: 'DEPRECATED',
  CONFLICT: 'CONFLICT',
});

const MEMORY_SCOPES = Object.freeze({
  GLOBAL: 'GLOBAL',
  PROJECT: 'PROJECT',
  AGENT: 'AGENT',
  SESSION: 'SESSION',
  SYSTEM: 'SYSTEM',
});

/**
 * Creates a normalized base memory entity with weights & provenance
 */
function createBaseMemoryEntity({
  id,
  level = MEMORY_LEVELS.L0_RAW,
  scope = MEMORY_SCOPES.GLOBAL,
  projectId = null,
  agentId = null,
  title = '',
  description = '',
  provenance = {},
  weights = {},
  metadata = {},
}) {
  const now = new Date().toISOString();
  return {
    id: id || `mem_${level}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    level,
    levelName: LEVEL_NAMES[level] || 'RAW',
    scope,
    projectId,
    agentId,
    title: String(title).slice(0, 300),
    description: String(description).slice(0, 2000),
    status: MEMORY_STATUS.ACTIVE,
    version: 1,
    supersededBy: null,
    createdAt: now,
    updatedAt: now,
    provenance: {
      source: provenance.source || 'system',
      actorId: provenance.actorId || agentId || 'system',
      jobId: provenance.jobId || null,
      missionId: provenance.missionId || null,
      derivedFrom: Array.isArray(provenance.derivedFrom) ? provenance.derivedFrom : [],
      supportedBy: Array.isArray(provenance.supportedBy) ? provenance.supportedBy : [],
      evidence: Array.isArray(provenance.evidence) ? provenance.evidence : [],
      decisions: Array.isArray(provenance.decisions) ? provenance.decisions : [],
      ...provenance,
    },
    weights: {
      importance: Number(weights.importance ?? 0.5),
      confidence: Number(weights.confidence ?? 0.8),
      relevance: Number(weights.relevance ?? 0.7),
      frequency: Number(weights.frequency ?? 1),
      recency: Date.now(),
      stability: Number(weights.stability ?? 0.5),
      usageCount: Number(weights.usageCount ?? 0),
      successRate: Number(weights.successRate ?? 1.0),
      failureRate: Number(weights.failureRate ?? 0.0),
      dependencyCount: Number(weights.dependencyCount ?? 0),
      projectScope: scope === MEMORY_SCOPES.PROJECT ? 1.0 : 0.0,
      globalScope: scope === MEMORY_SCOPES.GLOBAL ? 1.0 : 0.0,
    },
    metadata,
  };
}

module.exports = {
  MEMORY_LEVELS,
  LEVEL_NAMES,
  MEMORY_STATUS,
  MEMORY_SCOPES,
  createBaseMemoryEntity,
};

'use strict';

const { AutonomousEvolutionEngine } = require('./autonomous-evolution-engine');
const { AutonomousGovernanceGuard, CRITICAL_ACTIONS } = require('./autonomous-governance-guard');
const { TaskGenerationEngine, VALID_TASK_STATUSES, VALID_PRIORITIES } = require('./task-generation-engine');
const { FenixAutonomousLoop } = require('./fenix-autonomous-loop');
const { EvolutionMemory } = require('./evolution-memory');
const { AutonomousMissionQueue } = require('./autonomous-mission-queue');
const { AutonomousEvolutionKernel } = require('./autonomous-evolution-kernel');
const { ExternalChangeDetector } = require('./external-change-detector');

module.exports = {
  AutonomousEvolutionEngine,
  AutonomousGovernanceGuard,
  CRITICAL_ACTIONS,
  TaskGenerationEngine,
  VALID_TASK_STATUSES,
  VALID_PRIORITIES,
  FenixAutonomousLoop,
  EvolutionMemory,
  AutonomousMissionQueue,
  AutonomousEvolutionKernel,
  ExternalChangeDetector
};

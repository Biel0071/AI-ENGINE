'use strict';
/**
 * FÊNIX OS V11 — UNIVERSAL VISUAL SYSTEM RECONSTRUCTION ENGINE
 * Master Module Export
 */

const { SystemObserver, globalSystemObserver, ELEMENT_CATEGORIES } = require('./system-observer');
const { PageGraph, BehaviorGraph, INTERACTION_TYPES } = require('./graphs-engine');
const { VideoSystemDecoder, globalVideoSystemDecoder } = require('./video-decoder');
const { VisualDnaEngine, globalVisualDnaEngine } = require('./visual-dna-engine');
const { ArchitectureDetector, globalArchitectureDetector } = require('./architecture-detector');
const { SystemTwinEngine, globalSystemTwinEngine } = require('./system-twin');
const { FullstackGenerator, globalFullstackGenerator } = require('./fullstack-generator');
const { VisualComparator, globalVisualComparator } = require('./visual-comparator');
const { SystemLevelEvaluator, globalSystemLevelEvaluator } = require('./system-level-evaluator');
const { DynamicWorkforce, globalDynamicWorkforce, WORKFORCE_ROLES, EXECUTOR_TYPES } = require('./dynamic-workforce');
const { SystemMapExplorer, globalSystemMapExplorer, NODE_COLORS } = require('./system-map-explorer');
const { UniversalReconstructionEngine, globalUniversalReconstructionEngine } = require('./universal-reconstruction-engine');
const { ExportTargetsEngine, globalExportTargetsEngine, SUPPORTED_TARGETS } = require('./export-targets-engine');
const { VisualLoopEngine, globalVisualLoopEngine } = require('./visual-loop-engine');
const { UrlToSystemEngine, globalUrlToSystemEngine } = require('./url-to-system');

module.exports = {
  SystemObserver,
  globalSystemObserver,
  ELEMENT_CATEGORIES,

  PageGraph,
  BehaviorGraph,
  INTERACTION_TYPES,

  VideoSystemDecoder,
  globalVideoSystemDecoder,

  VisualDnaEngine,
  globalVisualDnaEngine,

  ArchitectureDetector,
  globalArchitectureDetector,

  SystemTwinEngine,
  globalSystemTwinEngine,

  FullstackGenerator,
  globalFullstackGenerator,

  VisualComparator,
  globalVisualComparator,

  SystemLevelEvaluator,
  globalSystemLevelEvaluator,

  DynamicWorkforce,
  globalDynamicWorkforce,
  WORKFORCE_ROLES,
  EXECUTOR_TYPES,

  SystemMapExplorer,
  globalSystemMapExplorer,
  NODE_COLORS,

  UniversalReconstructionEngine,
  globalUniversalReconstructionEngine,

  ExportTargetsEngine,
  globalExportTargetsEngine,
  SUPPORTED_TARGETS,

  VisualLoopEngine,
  globalVisualLoopEngine,

  UrlToSystemEngine,
  globalUrlToSystemEngine
};

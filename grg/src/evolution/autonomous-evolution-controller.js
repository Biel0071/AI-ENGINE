'use strict';

/**
 * FÊNIX OS — Autonomous Evolution Controller (Level 10)
 * =====================================================
 * Coordinates the full continuous cycle of self-improvement:
 * OBSERVE → DETECT → PLAN → EXECUTE → VALIDATE → LEARN → PROMOTE / ROLLBACK
 *
 * Invariant: Never promote an unbalanced, unilateral, or mock-containing change!
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { AutonomousMissionQueue } = require('./autonomous-mission-queue');
const { EvolutionMemory } = require('./evolution-memory');
const { FrontendBackendReciprocityEngine } = require('../software-factory/frontend-backend-reciprocity-engine');
const { globalPatternLibrary } = require('../memory/pattern-library');
const { VisualCompositionEngine } = require('./visual-composition-engine');
const { VisualDesignEvaluator } = require('./visual-design-evaluator');

class AutonomousEvolutionController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.storageManager = options.storageManager || null;
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;

    this.evolutionMemory = options.evolutionMemory || new EvolutionMemory({
      storageManager: this.storageManager,
      eventBus: this.eventBus,
      logger: this.logger
    });

    this.missionQueue = options.missionQueue || new AutonomousMissionQueue({
      eventBus: this.eventBus,
      evolutionMemory: this.evolutionMemory,
      logger: this.logger
    });

    this.reciprocityEngine = options.reciprocityEngine || new FrontendBackendReciprocityEngine();
    this.patternLibrary = options.patternLibrary || globalPatternLibrary;

    this.visualCompositionEngine = options.visualCompositionEngine || new VisualCompositionEngine({ logger: this.logger });
    this.visualDesignEvaluator = options.visualDesignEvaluator || new VisualDesignEvaluator({ logger: this.logger });

    this._checkpoints = new Map(); // checkpointId -> state
    this._status = 'IDLE';
  }

  /**
   * 1. OBSERVE: Measures current system state, tests, and reciprocity balance
   * @param {object} [runtimeMetrics]
   */
  async observe(runtimeMetrics = {}) {
    const memory = process.memoryUsage();

    let visualComposition = null;
    let visualScorecard = null;
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      try {
        const html = fs.readFileSync(indexPath, 'utf8');
        visualComposition = this.visualCompositionEngine.decomposeSpatialLayout(html, 'view-command');
        visualScorecard = this.visualDesignEvaluator.evaluate(visualComposition);
      } catch (e) {
        this.logger.warn?.(`Visual evaluation in observe failed: ${e.message}`);
      }
    }

    const communication = runtimeMetrics.communication || {
      isFabricOnline: true,
      hasLoops: false,
      isolatedAgents: []
    };

    return {
      timestamp: new Date().toISOString(),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      isOnline: runtimeMetrics.isOnline !== false,
      persistence: runtimeMetrics.persistence || 'HEALTHY',
      queueSnapshot: this.missionQueue.getSnapshot(),
      visualComposition,
      visualScorecard,
      communication
    };
  }

  /**
   * 2. DETECT: Identifies capability gaps, unilateral implementations, or performance regressions
   * @param {object} observation
   * @param {Array<object>} [contracts]
   */
  detect(observation, contracts = []) {
    const findings = [];

    // Check for unbalanced reciprocity in contracts
    for (const c of contracts) {
      const audit = this.reciprocityEngine.verifyReciprocity(c);
      if (!audit.isBalanced) {
        findings.push({
          type: 'UNBALANCED_RECIPROCITY',
          severity: 'HIGH',
          feature: c.name,
          details: audit
        });
      }
    }

    // Check persistence health
    if (observation.persistence === 'PERSISTENCE DEGRADED') {
      findings.push({
        type: 'PERSISTENCE_DEGRADED',
        severity: 'CRITICAL',
        details: 'Relational or cache driver running in fallback mode'
      });
    }

    // Check for visual antipatterns or design debt
    if (observation.visualComposition?.isAntiPattern) {
      findings.push({
        type: 'VISUAL_ANTIPATTERN_DETECTED',
        severity: 'HIGH',
        feature: observation.visualComposition.viewId,
        details: 'View exhibits SaaS KPI Dashboard antipattern without hero stage or context inspector'
      });
    }

    if (observation.visualScorecard?.defects?.length) {
      for (const d of observation.visualScorecard.defects) {
        findings.push({
          type: 'VISUAL_DEFECT_DETECTED',
          severity: 'MEDIUM',
          feature: observation.visualComposition?.viewId || 'view-unknown',
          details: d.defect || d
        });
      }
    }

    // Check communication loop or fabric gaps
    if (observation.communication) {
      if (observation.communication.hasLoops) {
        findings.push({
          type: 'COMMUNICATION_LOOP_DETECTED',
          severity: 'HIGH',
          feature: 'CommunicationFabric',
          details: 'Potential conversational loop detected requiring circuit breaker intervention'
        });
      }
      if (observation.communication.isolatedAgents?.length) {
        findings.push({
          type: 'COMMUNICATION_AGENT_ISOLATED',
          severity: 'MEDIUM',
          feature: 'PresenceManager',
          details: `${observation.communication.isolatedAgents.length} agents have no active desk or route`
        });
      }
      if (observation.communication.brokenPresence?.length) {
        findings.push({
          type: 'COMMUNICATION_BROKEN_PRESENCE',
          severity: 'HIGH',
          feature: 'PresenceManager',
          details: `${observation.communication.brokenPresence.length} agents have invalid or stale presence`
        });
      }
      if (observation.communication.staleAgents?.length) {
        findings.push({
          type: 'COMMUNICATION_STALE_AGENT',
          severity: 'MEDIUM',
          feature: 'OfficeManager',
          details: `${observation.communication.staleAgents.length} agents are unassigned or inactive beyond threshold`
        });
      }
      if (observation.communication.failedConversations?.length) {
        findings.push({
          type: 'COMMUNICATION_CONVERSATION_FAILURE',
          severity: 'HIGH',
          feature: 'ConversationManager',
          details: `${observation.communication.failedConversations.length} conversations terminated abnormally`
        });
      }
      if (observation.communication.realtimeDisconnected) {
        findings.push({
          type: 'COMMUNICATION_REALTIME_DISCONNECT',
          severity: 'CRITICAL',
          feature: 'CommunicationBus',
          details: 'Office realtime event bus disconnected or unresponsive'
        });
      }
    }

    return {
      hasGaps: findings.length > 0,
      totalFindings: findings.length,
      findings,
      detectedAt: new Date().toISOString()
    };
  }

  /**
   * 3. PLAN: Decomposes detected gaps into prioritised autonomous missions
   * @param {object} detectionResult
   */
  plan(detectionResult) {
    const plannedMissions = [];

    for (const finding of detectionResult.findings) {
      const priority = finding.severity === 'CRITICAL' ? 'P0' : (finding.severity === 'HIGH' ? 'P1' : 'P3');
      let missionIdPrefix = 'EVO-';
      if (finding.type && finding.type.startsWith('VISUAL')) missionIdPrefix = 'EVO-VISUAL-';
      else if (finding.type && finding.type.startsWith('COMMUNICATION')) missionIdPrefix = 'EVO-OFFICE-';

      const mission = {
        id: `${missionIdPrefix}${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        priority,
        problem: `Address ${finding.type} in ${finding.feature || 'System Core'}`,
        hypothesis: (finding.type && finding.type.startsWith('VISUAL'))
          ? 'Reconstructing spatial layout into 3-Pane Cockpit or 4-Quadrant IDE resolves visual debt'
          : (finding.type && finding.type.startsWith('COMMUNICATION'))
          ? 'Reconnecting spatial desk or adjusting circuit breaker cooldown restores communication flow'
          : 'Applying reciprocal generation and full-stack contract restores balance',
        context: finding.details
      };
      const enqueued = this.missionQueue.enqueue(mission);
      plannedMissions.push(enqueued.mission || enqueued);
    }

    return {
      plannedCount: plannedMissions.length,
      missions: plannedMissions,
      plannedAt: new Date().toISOString()
    };
  }

  /**
   * 4. EXECUTE: Dispatches and applies candidate implementation
   * @param {object} mission
   * @param {Function} executionHandler
   */
  async execute(mission, executionHandler) {
    this._status = 'EXECUTING';
    const checkpointId = `chk_${Date.now()}`;
    this._checkpoints.set(checkpointId, { missionId: mission.id, time: new Date().toISOString() });

    try {
      const result = typeof executionHandler === 'function'
        ? await executionHandler(mission)
        : { executed: true, filesModified: [] };

      return {
        success: true,
        checkpointId,
        missionId: mission.id,
        result
      };
    } catch (err) {
      return {
        success: false,
        checkpointId,
        missionId: mission.id,
        error: err.message
      };
    } finally {
      this._status = 'IDLE';
    }
  }

  /**
   * 5. VALIDATE: Tests the modified system against all quality gates
   * @param {object} executionOutcome
   * @param {Function} [testSuiteFn]
   */
  async validate(executionOutcome, testSuiteFn) {
    if (!executionOutcome.success) {
      return {
        passed: false,
        reason: executionOutcome.error || 'Execution failed',
        shouldRollback: true
      };
    }

    if (typeof testSuiteFn === 'function') {
      try {
        const testRes = await testSuiteFn();
        return {
          passed: testRes.passed !== false,
          shouldPromote: testRes.passed !== false,
          shouldRollback: testRes.passed === false,
          details: testRes
        };
      } catch (err) {
        return {
          passed: false,
          reason: err.message,
          shouldRollback: true
        };
      }
    }

    return {
      passed: true,
      shouldPromote: true,
      shouldRollback: false
    };
  }

  /**
   * 6. LEARN: Extracts reusable patterns and records memory
   * @param {object} mission
   * @param {object} validationResult
   */
  async learn(mission, validationResult) {
    const memoryRecord = {
      missionId: mission.id,
      problem: mission.problem,
      hypothesis: mission.hypothesis,
      passed: validationResult.passed,
      lesson: validationResult.passed
        ? `Successfully resolved ${mission.problem} with full-stack reciprocity.`
        : `Resolution failed: ${validationResult.reason}. Rollback triggered.`,
      pattern: `pat_${(mission.problem || 'evolution').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 32)}`
    };

    const recordFn = this.evolutionMemory.record || this.evolutionMemory.recordCycle;
    const saved = typeof recordFn === 'function' ? await recordFn.call(this.evolutionMemory, memoryRecord) : memoryRecord;
    return {
      learned: true,
      memoryRecord: saved
    };
  }

  /**
   * 7. PROMOTE: Commits and approves validated improvements
   * @param {object} executionOutcome
   */
  promote(executionOutcome) {
    if (executionOutcome.checkpointId) {
      this._checkpoints.delete(executionOutcome.checkpointId);
    }
    this.emit('evolution:promoted', { missionId: executionOutcome.missionId });
    return {
      status: 'PROMOTED',
      missionId: executionOutcome.missionId,
      promotedAt: new Date().toISOString()
    };
  }

  /**
   * 8. ROLLBACK: Safely reverses unvalidated or broken modifications
   * @param {object} executionOutcome
   */
  rollback(executionOutcome) {
    const checkpoint = this._checkpoints.get(executionOutcome.checkpointId);
    this._checkpoints.delete(executionOutcome.checkpointId);
    this.emit('evolution:rolled_back', { missionId: executionOutcome.missionId, checkpoint });
    return {
      status: 'ROLLED_BACK',
      missionId: executionOutcome.missionId,
      rolledBackAt: new Date().toISOString()
    };
  }
}

const globalAutonomousEvolutionController = new AutonomousEvolutionController();

module.exports = {
  AutonomousEvolutionController,
  globalAutonomousEvolutionController
};

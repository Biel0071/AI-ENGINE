'use strict';

/**
 * FÊNIX OS — Design & Frontend Critic (Intent Engine 2.0)
 * =======================================================
 * Implements Section 6, 22, 23, 25 & 26:
 * - Generates Design A, Design B, Design C
 * - Multi-dimensional critique (Simplicity, Correctness, Scalability, UX, Security)
 * - Frontend Reality & Anti-Prototype Critic
 * - World-First Presence Critic
 * - Zero-AI Offline Guarantee Critic
 */

class DesignCritic {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Generates 3 designs and chooses the optimal architecture
   */
  evaluateDesigns(intentSpec, gapAnalysis) {
    const isVisual = (intentSpec.entities?.views?.length > 0) || intentSpec.capabilities.some(c => c.includes('UI') || c.includes('VISUAL'));
    const isAgent = intentSpec.capabilities.some(c => c.includes('AGENT'));
    const isData = intentSpec.capabilities.some(c => c.includes('DATA') || c.includes('STORAGE'));

    // Design A: Canonical Full-Stack Integrated (Fênix Golden Pattern)
    const designA = {
      id: 'DESIGN_A_CANONICAL',
      name: 'Full-Stack Real Capability (Golden Rule VII)',
      approach: 'Proposed extension through existing controllers and runtime services, after workspace and contracts are inspected.',
      pros: ['Provides a proposal that can reuse existing Fênix services after the workspace and contracts are verified'],
      cons: ['Requires touching backend and frontend contracts simultaneously'],
      score: null,
      scoreStatus: 'NOT_MEASURED',
      zeroAiCompatible: true,
      worldIntegrated: null
    };

    // Design B: Lightweight Local-First (Minimal Surface)
    const designB = {
      id: 'DESIGN_B_LIGHTWEIGHT',
      name: 'Deterministic Local-First Extension',
      approach: 'Proposed local-first UI extension with the smallest backend surface allowed by the verified project contract.',
      pros: ['Limits the proposed change surface when project constraints permit'],
      cons: ['Limited multi-tenant persistence', 'Lacks spatial embodiment in 3D deck unless explicitly linked'],
      score: null,
      scoreStatus: 'NOT_MEASURED',
      zeroAiCompatible: true,
      worldIntegrated: null
    };

    // Design C: Distributed Scalable Stream
    const designC = {
      id: 'DESIGN_C_ENTERPRISE',
      name: 'Event-Driven Distributed Micro-Flow',
      approach: 'Proposed distributed execution path; queue, stream, storage and worker requirements must be established from measured load and runtime contracts.',
      pros: ['Separates queue and stream responsibilities in the proposed architecture'],
      cons: ['Overkill for contained tasks', 'Adds operational overhead and potential latency'],
      score: null,
      scoreStatus: 'NOT_MEASURED',
      zeroAiCompatible: false, // May require queue infrastructure
      worldIntegrated: null
    };

    // Critique evaluation
    let selectedDesign = designA;
    let critiqueRationale = 'Design A is an initial proposal. Workspace-specific reuse, runtime behavior, risk and visual quality have not been validated.';

    if (intentSpec.constraints?.includes('OFFLINE_ONLY') || intentSpec.constraints?.includes('MINIMAL_FOOTPRINT')) {
      selectedDesign = designB;
      critiqueRationale = 'Design B selected: Constraint mandates local-first minimal footprint.';
    }

    const frontendCritique = this.critiqueFrontend(intentSpec);
    const worldCritique = this.critiqueWorld(intentSpec);

    return {
      designs: [designA, designB, designC],
      selectedDesign,
      critiqueRationale,
      frontendCritique,
      worldCritique,
      meetsDefinitionOfDone: false,
      evaluationStatus: 'NOT_VALIDATED'
    };
  }

  /**
   * Frontend Critic (Section 23): Verifies that UI does not look like a prototype
   */
  critiqueFrontend(intentSpec, measurements = {}) {
    const dimensions = ['hierarchy', 'density', 'typography', 'emptyStates', 'responsiveness', 'interaction', 'accessibility'];
    const checks = Object.fromEntries(dimensions.map((dimension) => {
      const measurement = measurements[dimension];
      const status = ['PASS', 'FAIL'].includes(String(measurement?.status || '').toUpperCase()) && typeof measurement.evidence === 'string' && measurement.evidence.trim()
        ? String(measurement.status).toUpperCase()
        : 'NOT_MEASURED';
      return [dimension, { status, evidence: status === 'NOT_MEASURED' ? null : measurement.evidence.trim() }];
    }));
    const measured = Object.values(checks).filter((check) => check.status !== 'NOT_MEASURED');
    const passedCount = measured.filter((check) => check.status === 'PASS').length;
    const failedCount = measured.filter((check) => check.status === 'FAIL').length;
    const status = !measured.length ? 'NOT_MEASURED'
      : measured.length < dimensions.length ? 'PARTIALLY_MEASURED'
        : failedCount ? 'ISSUES_FOUND' : 'VERIFIED';
    return { status, checks, measuredCount: measured.length, passedCount, failedCount, requiredEvidence: dimensions.filter((dimension) => checks[dimension].status === 'NOT_MEASURED') };
  }

  /**
   * World-First Critic (Section 25): Verifies spatial embodiment for agents
   */
  critiqueWorld(intentSpec, evidence = {}) {
    const dimensions = ['hasWorkstation', 'hasPresence', 'hasDistrict', 'avoidsFloatingEntities', 'preservesDualEngine'];
    const checks = Object.fromEntries(dimensions.map((dimension) => {
      const item = evidence[dimension];
      const status = ['PASS', 'FAIL'].includes(String(item?.status || '').toUpperCase()) && typeof item.evidence === 'string' && item.evidence.trim()
        ? String(item.status).toUpperCase() : 'NOT_MEASURED';
      return [dimension, { status, evidence: status === 'NOT_MEASURED' ? null : item.evidence.trim() }];
    }));
    const measuredCount = Object.values(checks).filter((check) => check.status !== 'NOT_MEASURED').length;
    return { status: measuredCount ? (measuredCount === dimensions.length ? 'MEASURED' : 'PARTIALLY_MEASURED') : 'NOT_MEASURED', isSpatial: null, checks, measuredCount };
  }
}

module.exports = { DesignCritic };

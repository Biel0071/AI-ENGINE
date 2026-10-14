'use strict';

/**
 * FÊNIX OS — Visual Reference Analyzer (Fase 13)
 * =============================================
 * Implements the design learning pipeline:
 * REFERENCE → OBSERVE → DECOMPOSE → IDENTIFY PRINCIPLES → STORE VISUAL KNOWLEDGE → GENERATE HYPOTHESIS
 *
 * Extracts foundational engineering principles (density, spatial hierarchy,
 * status feedback, dual streams) from references without copying superficial UIs.
 */

class VisualReferenceAnalyzer {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this._knowledgeBase = new Map();
  }

  /**
   * Decomposes a design reference archetype into core architectural principles.
   * @param {string} referenceName
   * @param {object} referenceSpec
   * @returns {object} Extracted principles
   */
  decomposeReference(referenceName, referenceSpec = {}) {
    const principles = [];

    if (referenceSpec.isDeveloperFocused || referenceName.toLowerCase().includes('ide') || referenceName.toLowerCase().includes('code')) {
      principles.push({
        id: 'PRIN_4_QUADRANT',
        name: '4-Quadrant Spatial Layout',
        rationale: 'Code, Explorer, Live Preview, and Docked Tray must occupy distinct dedicated planes without modal obstruction.'
      });
      principles.push({
        id: 'PRIN_TERMINAL_DOCK',
        name: 'Docked Operational Telemetry',
        rationale: 'Process logs, build status, and git changes belong to a permanent bottom tray rather than hidden dialogs.'
      });
    }

    if (referenceSpec.isCockpit || referenceName.toLowerCase().includes('command') || referenceName.toLowerCase().includes('cockpit')) {
      principles.push({
        id: 'PRIN_HERO_DOMINANCE',
        name: 'Primary Work Dominance',
        rationale: 'The active mission or task must visually claim 60%+ of primary viewport height and width.'
      });
      principles.push({
        id: 'PRIN_STEPPER_TIMELINE',
        name: 'Multi-Phase Sequential Progress',
        rationale: 'Complex operations require visual step nodes demonstrating clear past, active, and future gates.'
      });
    }

    if (referenceSpec.isWorkforce || referenceName.toLowerCase().includes('agent')) {
      principles.push({
        id: 'PRIN_SQUAD_GROUPING',
        name: 'Operational Squad Clustering',
        rationale: 'Autonomous entities must be grouped by operational lifecycle state (Active vs Standby vs Supervised).'
      });
      principles.push({
        id: 'PRIN_DEEP_INSPECTOR',
        name: 'Contextual Right-Rail Inspection',
        rationale: 'Selecting any entity must update a persistent docked inspector with full memory, tools, and telemetry.'
      });
    }

    const result = {
      referenceName,
      extractedAt: new Date().toISOString(),
      principles,
      densityProfile: referenceSpec.density || 'COMPACT_OPERATIONAL',
      recommendedLayoutArchetype: referenceSpec.recommendedLayout || '3_PANE_COCKPIT'
    };

    this._knowledgeBase.set(referenceName, result);
    return result;
  }

  /**
   * Generates a design hypothesis for addressing visual debt.
   * @param {object} defectFinding
   * @returns {object} Design hypothesis
   */
  generateDesignHypothesis(defectFinding) {
    return {
      hypothesisId: `HYP_${Date.now()}`,
      targetDimension: defectFinding.dimension,
      problem: defectFinding.defect,
      hypothesis: `Recomposing ${defectFinding.dimension} using principles from the Visual Knowledge Base will eliminate the antipattern while preserving Zero-Mock and Vanilla JS integrity.`,
      recommendedAction: 'APPLY_SPATIAL_RECOMPOSITION',
      expectedImprovementScore: 25
    };
  }
}

module.exports = { VisualReferenceAnalyzer };

'use strict';

/**
 * FÊNIX OS — Visual Regression Engine (Fase 13)
 * ============================================
 * Detects layout regressions, visual drift, and DOM structural anomalies
 * between baseline iterations and current releases deterministically.
 */

class VisualRegressionEngine {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.toleranceThreshold = options.toleranceThreshold || 0.05; // 5% drift threshold
  }

  /**
   * Compares two evaluation scorecards or composition snapshots.
   * @param {object} baselineScorecard
   * @param {object} currentScorecard
   * @returns {object} Regression analysis
   */
  compareScorecards(baselineScorecard, currentScorecard) {
    if (!baselineScorecard || !currentScorecard) {
      return { isRegressed: false, reason: 'Missing scorecard data for comparison' };
    }

    const baselineScore = baselineScorecard.totalScore || 0;
    const currentScore = currentScorecard.totalScore || 0;
    const scoreDiff = currentScore - baselineScore;

    const regressions = [];
    const improvements = [];

    // Compare individual dimensions
    if (baselineScorecard.scores && currentScorecard.scores) {
      for (const [dim, bVal] of Object.entries(baselineScorecard.scores)) {
        const cVal = currentScorecard.scores[dim];
        if (cVal != null) {
          if (cVal < bVal) {
            regressions.push({ dimension: dim, baseline: bVal, current: cVal, delta: cVal - bVal });
          } else if (cVal > bVal) {
            improvements.push({ dimension: dim, baseline: bVal, current: cVal, delta: cVal - bVal });
          }
        }
      }
    }

    const isRegressed = scoreDiff < 0 || regressions.length > 3;

    return {
      viewId: currentScorecard.viewId,
      baselineScore,
      currentScore,
      scoreDiff,
      isRegressed,
      verdict: isRegressed ? 'REGRESSION_DETECTED_ROLLBACK' : (scoreDiff > 0 ? 'SIGNIFICANT_IMPROVEMENT_PROMOTE' : 'STABLE_NO_CHANGE'),
      regressions,
      improvements,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validates whether a candidate change complies with the visual regression gate.
   * @param {object} comparisonResult
   */
  canPromote(comparisonResult) {
    return comparisonResult.isRegressed === false && comparisonResult.currentScore >= 80;
  }
}

module.exports = { VisualRegressionEngine };

/**
 * FÊNIX OS — Causal Analyzer
 * Analyzes atomic observation events to identify Cause -> Action -> Effect relationships.
 */

class CausalAnalyzer {
  constructor() {
    this.insights = [];
  }

  /**
   * Analyzes an array of ObservationEvents to extract causal patterns
   */
  analyzeSequence(events = []) {
    const causalPairs = [];

    for (let i = 0; i < events.length; i += 1) {
      const current = events[i];
      const previous = i > 0 ? events[i - 1] : null;

      if (current.causality && current.causality.problemDetected) {
        causalPairs.push({
          problem: current.causality.problemDetected,
          action: current.action,
          target: current.target,
          deltaScore: current.result.visualMatchDelta || null,
          buildStatus: current.result.buildStatus,
          rule: current.causality.ruleLearned || `When encountering '${current.causality.problemDetected}', execute '${current.action}' on '${current.target.component || current.target.file}'`
        });
      } else if (previous && previous.result && previous.result.buildStatus === 'FAILED' && current.result.buildStatus === 'PASSED') {
        // Detected automatic error fix causality
        causalPairs.push({
          problem: 'Build or test failure',
          action: current.action,
          target: current.target,
          diff: current.codeState.gitDiff,
          buildStatus: 'RECOVERED_PASSED',
          rule: `Fix build error by applying ${current.action} to ${current.target.file}`
        });
      }
    }

    return causalPairs;
  }
}

module.exports = { CausalAnalyzer };

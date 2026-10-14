'use strict';

const fs = require('fs');
const path = require('path');
const { globalVisualComparator } = require('./visual-comparator');
const { globalSystemObserver } = require('./system-observer');

class VisualLoopEngine {
  constructor(options = {}) {
    this.artifactsDir = options.artifactsDir || path.join(__dirname, '..', '.data', 'visual_loop');
    this.observer = options.observer || globalSystemObserver;
    this.comparator = options.comparator || globalVisualComparator;
    if (!fs.existsSync(this.artifactsDir)) fs.mkdirSync(this.artifactsDir, { recursive: true });
  }

  /**
   * Capture evidence for a visual run. Repair is withheld until a real
   * comparison and an isolated, verifiable change executor are available.
   */
  async runVisualLoop(params = {}) {
    const startedAt = Date.now();
    const systemUrl = typeof params.url === 'string' ? params.url.trim() : '';
    const maxCycles = Math.min(3, Math.max(1, Number(params.maxCycles) || 3));

    if (!systemUrl) {
      return blockedResult({ status: 'INPUT_REQUIRED', reason: 'Informe a URL da aplicação a observar.', maxCycles, startedAt });
    }

    let observation;
    try {
      observation = await this.observer.observeUrl(systemUrl, { timeoutMs: 8000 });
    } catch (error) {
      return blockedResult({
        status: 'BLOCKED',
        reason: 'A observação da aplicação falhou.',
        observationStatus: 'UNAVAILABLE',
        failureCode: 'OBSERVATION_FAILED',
        maxCycles,
        startedAt
      });
    }

    const hasBrowserScreenshot = observation?.driver === 'playwright'
      && typeof observation.screenshot === 'string'
      && fs.existsSync(observation.screenshot);
    const comparison = hasBrowserScreenshot && params.referenceImage
      ? this.comparator.compare({
        referenceImage: params.referenceImage,
        currentImage: observation.screenshot,
        referenceDna: params.referenceDna || {},
        currentDna: params.currentDna || {},
        referenceComponents: params.referenceComponents || [],
        currentComponents: params.currentComponents || [],
        viewport: params.viewport
      })
      : null;

    const reason = !hasBrowserScreenshot
      ? 'A observação não produziu uma captura real do navegador; nenhum ciclo de correção foi executado.'
      : !comparison || comparison.measurementStatus !== 'MEASURED'
        ? 'A comparação visual ainda não mede diferença de pixels; nenhum ciclo de correção foi executado.'
        : 'O executor isolado de reparo não está configurado; nenhuma alteração foi aplicada.';

    return blockedResult({
      status: hasBrowserScreenshot && comparison?.measurementStatus === 'MEASURED' ? 'BLOCKED_NO_REPAIR_EXECUTOR' : 'NOT_MEASURED',
      reason,
      systemUrl,
      observationStatus: observation?.observationStatus || 'UNKNOWN',
      targetOk: observation?.targetOk ?? null,
      screenshot: hasBrowserScreenshot ? observation.screenshot : null,
      comparison,
      maxCycles,
      startedAt
    });
  }
}

function blockedResult({ status, reason, systemUrl = null, observationStatus = 'NOT_RUN', targetOk = null, screenshot = null, comparison = null, failureCode = null, maxCycles = 0, startedAt }) {
  return {
    ok: false,
    loopId: null,
    status,
    reason,
    failureCode,
    systemUrl,
    observationStatus,
    targetOk,
    screenshot,
    comparison,
    converged: false,
    finalFidelityScore: comparison?.fidelityScore ?? null,
    totalCyclesExecuted: 0,
    maxCyclesAllowed: maxCycles,
    cycles: [],
    totalDurationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString()
  };
}

const globalVisualLoopEngine = new VisualLoopEngine();

module.exports = {
  VisualLoopEngine,
  globalVisualLoopEngine
};

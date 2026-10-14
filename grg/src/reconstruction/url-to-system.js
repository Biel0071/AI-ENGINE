'use strict';

const { globalSystemObserver } = require('./system-observer');
const { globalVisualDnaEngine } = require('./visual-dna-engine');
const { globalSystemTwinEngine } = require('./system-twin');

class UrlToSystemEngine {
  constructor(options = {}) {
    this.systemObserver = options.systemObserver || globalSystemObserver;
    this.visualDnaEngine = options.visualDnaEngine || globalVisualDnaEngine;
    this.systemTwinEngine = options.systemTwinEngine || globalSystemTwinEngine;
  }

  async analyzeAndPlan(targetUrl, options = {}) {
    const startTime = Date.now();
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
        throw new Error('A URL deve usar HTTP ou HTTPS e não pode conter credenciais.');
      }
    } catch (error) {
      return failedAnalysis(targetUrl, error.message, startTime);
    }

    let observation;
    try {
      observation = await this.systemObserver.observeUrl(parsedUrl.toString(), options);
    } catch (error) {
      return failedAnalysis(targetUrl, error.message, startTime);
    }
    if (!observation || observation.targetOk !== true) {
      return failedAnalysis(targetUrl, observation?.error || 'O destino não respondeu com sucesso.', startTime, observation);
    }

    const publicUrl = sanitizeUrl(parsedUrl);
    const systemName = options.name || parsedUrl.hostname.replace(/[^a-zA-Z0-9]/g, '-') || 'observed-system';
    const elements = Array.isArray(observation.elements) ? observation.elements : [];
    const evidenceLevel = observation.observationStatus === 'BROWSER_OBSERVED' ? 'BROWSER_RENDER' : 'HTML_SOURCE';
    const page = {
      id: null,
      title: observation.title || null,
      route: parsedUrl.pathname || '/',
      url: publicUrl,
      evidenceLevel,
      status: observation.observationStatus || 'OBSERVED'
    };
    const components = elements.map((element) => ({
      id: element.id || null,
      category: element.category || null,
      tag: element.tag || null,
      label: element.text || null,
      evidenceLevel: element.evidenceLevel || evidenceLevel
    }));
    const apis = Array.isArray(observation.apis)
      ? observation.apis.map(sanitizeApiObservation)
      : [];
    const visualDna = this.visualDnaEngine.extractVisualDna(observation);
    const architecture = {
      status: 'NOT_INSPECTED',
      reason: 'A observação por URL não acessa os manifests, arquivos de backend ou catálogos de banco.'
    };
    const screens = [page];
    const emptyEvidence = [];
    const twin = this.systemTwinEngine.createOrUpdateTwin({
      name: systemName,
      sourceUrl: publicUrl,
      status: 'PARTIAL_OBSERVATION',
      pages: screens,
      flows: emptyEvidence,
      components,
      visualDna,
      apis,
      dataModels: emptyEvidence,
      frontend: null,
      backend: null,
      services: emptyEvidence,
      tests: emptyEvidence,
      git: null,
      agents: emptyEvidence,
      memory: null,
      dependencies: emptyEvidence
    });

    return {
      ok: true,
      status: 'PARTIAL_OBSERVATION',
      planId: null,
      targetUrl: publicUrl,
      systemName,
      analysisDurationMs: Date.now() - startTime,
      observationSummary: summarizeObservation(observation),
      systemTwin: twin,
      screens,
      linkedRoutes: Array.isArray(observation.routes) ? observation.routes : [],
      components,
      flows: emptyEvidence,
      apis,
      data: emptyEvidence,
      dependencies: emptyEvidence,
      visualDna,
      architecture,
      tests: emptyEvidence,
      estimatedJobs: emptyEvidence,
      actions: emptyEvidence,
      timestamp: new Date().toISOString()
    };
  }
}

function failedAnalysis(targetUrl, reason, startTime, observation = null) {
  const emptyEvidence = [];
  return {
    ok: false,
    status: 'OBSERVATION_FAILED',
    targetUrl: safeUrlString(targetUrl),
    reason,
    analysisDurationMs: Date.now() - startTime,
    observationSummary: observation ? summarizeObservation(observation) : null,
    systemTwin: null,
    screens: emptyEvidence,
    linkedRoutes: emptyEvidence,
    components: emptyEvidence,
    flows: emptyEvidence,
    apis: emptyEvidence,
    data: emptyEvidence,
    dependencies: emptyEvidence,
    visualDna: null,
    architecture: { status: 'NOT_INSPECTED' },
    tests: emptyEvidence,
    estimatedJobs: emptyEvidence,
    actions: emptyEvidence,
    timestamp: new Date().toISOString()
  };
}

function sanitizeApiObservation(api) {
  const source = typeof api === 'string' ? { url: api, method: 'GET' } : api || {};
  return {
    method: typeof source.method === 'string' ? source.method : null,
    url: safeUrlString(source.url || source.endpoint),
    type: typeof source.type === 'string' ? source.type : null,
    evidenceLevel: 'NETWORK_REQUEST_OBSERVED'
  };
}

function sanitizeUrl(parsedUrl) {
  const sanitized = new URL(parsedUrl.toString());
  sanitized.username = '';
  sanitized.password = '';
  for (const key of sanitized.searchParams.keys()) {
    if (/(token|secret|api.?key|auth|password|signature)/i.test(key)) sanitized.searchParams.set(key, '[REDACTED]');
  }
  if (/(token|secret|api.?key|auth|password|signature)/i.test(sanitized.hash)) sanitized.hash = '';
  return sanitized.toString();
}

function safeUrlString(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? sanitizeUrl(url) : null;
  } catch { return null; }
}

function summarizeObservation(observation) {
  return {
    status: observation.observationStatus || 'UNKNOWN',
    driver: observation.driver || null,
    statusCode: Number.isFinite(observation.statusCode) ? observation.statusCode : null,
    latencyMs: Number.isFinite(observation.latencyMs) ? observation.latencyMs : null,
    viewport: observation.viewport || null,
    interactiveVerification: observation.interactiveVerification === true,
    elementsCount: Number.isFinite(observation.elementsCount) ? observation.elementsCount : null,
    linkedRoutesCount: Array.isArray(observation.routes) ? observation.routes.length : 0,
    observedApiRequestsCount: Array.isArray(observation.apis) ? observation.apis.length : 0,
    consoleErrorsCount: Number.isFinite(observation.console?.errorsCount) ? observation.console.errorsCount : null,
    screenshotCaptured: Boolean(observation.screenshot || observation.screenshotPath)
  };
}

const globalUrlToSystemEngine = new UrlToSystemEngine();

module.exports = {
  UrlToSystemEngine,
  globalUrlToSystemEngine
};

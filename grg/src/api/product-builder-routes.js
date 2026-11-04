'use strict';

/**
 * FÊNIX OS — Recursive Product Builder & Autonomous Factory API Routes
 * =========================================================================
 * Provides HTTP endpoints for:
 * - Recursive Product Tree generation and inspection
 * - Page Completeness Engine audits (11 canonical axes)
 * - Interaction Completeness Engine audits (15 interactive types)
 * - Navigation Crawler & Route Reachability verification
 * - Cryptographic Completeness Certification
 * - Overnight Detached Execution Factory (start, stop, status, missions)
 * - Global Project Ecosystem Inventory
 */

const { RecursiveProductBuilder } = require('../product/recursive-product-builder');
const { AutonomousDevelopmentFactory } = require('../evolution/autonomous-development-factory');

let globalProductBuilder = null;
let globalFactory = null;

function getProductBuilder(app) {
  if (!globalProductBuilder) {
    globalProductBuilder = new RecursiveProductBuilder({
      memoryFabric: app?.memory,
      skillRegistry: app?.skillRegistry,
      modelRouter: app?.modelRouter
    });
    if (app) app.productBuilder = globalProductBuilder;
  }
  return globalProductBuilder;
}

function getFactory(app) {
  if (!globalFactory) {
    globalFactory = new AutonomousDevelopmentFactory({
      app,
      memoryFabric: app?.memory,
      skillRegistry: app?.skillRegistry,
      modelRouter: app?.modelRouter,
      eventBus: app?.bus
    });
    if (app) app.autonomousFactory = globalFactory;
  }
  return globalFactory;
}

async function handleProductBuilderRoutes(req, res, url, app, sendJson, readJson, identity) {
  const method = req.method;
  const pathname = url.pathname;
  const builder = getProductBuilder(app);
  const factory = getFactory(app);

  try {
    // -------------------------------------------------------------------------
    // 1. Product Tree & Completeness Endpoints
    // -------------------------------------------------------------------------

    // GET /api/v2/product-builder/tree
    if (method === 'GET' && pathname === '/api/v2/product-builder/tree') {
      const projectId = url.searchParams.get('projectId') || 'prj.ai_engine_core';
      let tree = builder.productTrees.get(projectId);
      if (!tree) {
        tree = await builder.generateProductTree({ projectId, name: 'Fênix Core OS' });
      }
      return sendJson(res, 200, { ok: true, tree });
    }

    // POST /api/v2/product-builder/generate-tree
    if (method === 'POST' && pathname === '/api/v2/product-builder/generate-tree') {
      const body = await readJson(req).catch(() => ({}));
      const tree = await builder.generateProductTree(body);
      return sendJson(res, 201, { ok: true, tree });
    }

    // GET /api/v2/product-builder/completeness
    if (method === 'GET' && pathname === '/api/v2/product-builder/completeness') {
      const projectId = url.searchParams.get('projectId') || 'prj.ai_engine_core';
      if (!builder.productTrees.has(projectId)) {
        await builder.generateProductTree({ projectId, name: 'Fênix Core OS' });
      }
      const audit = builder.auditFullProduct(projectId);
      return sendJson(res, 200, { ok: true, audit });
    }

    // POST /api/v2/product-builder/audit-page
    if (method === 'POST' && pathname === '/api/v2/product-builder/audit-page') {
      const body = await readJson(req).catch(() => ({}));
      const audit = builder.pageCompleteness.evaluatePage(body.page || body);
      return sendJson(res, 200, { ok: true, audit });
    }

    // POST /api/v2/product-builder/audit-interactions
    if (method === 'POST' && pathname === '/api/v2/product-builder/audit-interactions') {
      const body = await readJson(req).catch(() => ({}));
      const elements = body.elements || (Array.isArray(body) ? body : []);
      const audit = builder.interactionCompleteness.auditInteractions(elements);
      return sendJson(res, 200, { ok: true, audit });
    }

    // POST /api/v2/product-builder/crawl-navigation
    if (method === 'POST' && pathname === '/api/v2/product-builder/crawl-navigation') {
      const body = await readJson(req).catch(() => ({}));
      const projectId = body.projectId || url.searchParams.get('projectId') || 'prj.ai_engine_core';
      let tree = builder.productTrees.get(projectId);
      if (!tree) {
        tree = await builder.generateProductTree({ projectId, name: 'Fênix Core OS' });
      }
      const crawl = builder.navigationCrawler.crawl(tree);
      return sendJson(res, 200, { ok: true, crawl });
    }

    // POST /api/v2/product-builder/certify
    if (method === 'POST' && pathname === '/api/v2/product-builder/certify') {
      const body = await readJson(req).catch(() => ({}));
      const projectId = body.projectId || url.searchParams.get('projectId') || 'prj.ai_engine_core';
      if (!builder.productTrees.has(projectId)) {
        await builder.generateProductTree({ projectId, name: 'Fênix Core OS' });
      }
      const cert = builder.certifyProduct(projectId);
      return sendJson(res, 200, { ok: true, certificate: cert });
    }

    // -------------------------------------------------------------------------
    // 2. Autonomous Development Factory Endpoints
    // -------------------------------------------------------------------------

    // GET /api/v2/factory/status
    if (method === 'GET' && pathname === '/api/v2/factory/status') {
      const status = factory.getStatus();
      return sendJson(res, 200, { ok: true, ...status });
    }

    // POST /api/v2/factory/mission
    if (method === 'POST' && pathname === '/api/v2/factory/mission') {
      const body = await readJson(req).catch(() => ({}));
      const mission = await factory.submitMission(body);
      return sendJson(res, 201, { ok: true, mission });
    }

    // POST /api/v2/factory/night-run/start
    if (method === 'POST' && pathname === '/api/v2/factory/night-run/start') {
      const body = await readJson(req).catch(() => ({}));
      const result = factory.startNightRun(body);
      return sendJson(res, 200, { ok: true, ...result });
    }

    // POST /api/v2/factory/night-run/stop
    if (method === 'POST' && pathname === '/api/v2/factory/night-run/stop') {
      const result = factory.stopNightRun();
      return sendJson(res, 200, { ok: true, ...result });
    }

    // GET /api/v2/factory/night-run/status
    if (method === 'GET' && pathname === '/api/v2/factory/night-run/status') {
      return sendJson(res, 200, {
        ok: true,
        overnightRunning: factory.overnightRunning,
        telemetry: factory.telemetry,
        uptimeSeconds: factory.telemetry.nightRunUptimeSeconds
      });
    }

    // POST /api/v2/factory/worker/dispatch
    if (method === 'POST' && pathname === '/api/v2/factory/worker/dispatch') {
      const body = await readJson(req).catch(() => ({}));
      const worker = factory.dispatchWorker(body);
      return sendJson(res, 201, { ok: true, worker });
    }

    // GET /api/v2/factory/worker/list
    if (method === 'GET' && pathname === '/api/v2/factory/worker/list') {
      const workers = factory.listWorkers();
      return sendJson(res, 200, { ok: true, totalWorkers: workers.length, workers });
    }

    // POST /api/v2/factory/worker/terminate
    if (method === 'POST' && pathname === '/api/v2/factory/worker/terminate') {
      const body = await readJson(req).catch(() => ({}));
      const workerId = body.workerId || body.id || body.pid;
      if (!workerId) return sendJson(res, 400, { ok: false, error: 'workerId is required' });
      const result = factory.terminateWorker(workerId);
      return sendJson(res, 200, { ok: true, ...result });
    }

    // POST /api/v2/factory/patch/generate
    if (method === 'POST' && pathname === '/api/v2/factory/patch/generate') {
      const body = await readJson(req).catch(() => ({}));
      const patch = factory.synthesizePatch(body);
      return sendJson(res, 201, { ok: true, patch });
    }

    // GET /api/v2/factory/inventory
    if (method === 'GET' && pathname === '/api/v2/factory/inventory') {
      const inventory = [
        {
          id: 'prj.ai_engine_core',
          name: 'ai-engine-core (Fênix OS)',
          type: 'core_os',
          status: 'ONLINE',
          completeness: 98,
          readiness: 'READY_PRODUCTION',
          featuresCount: 42,
          modulesCount: 14
        },
        {
          id: 'prj.api_platform',
          name: 'Fênix API Platform (Fastify :3001)',
          type: 'cloud_inference',
          status: 'ONLINE',
          completeness: 96,
          readiness: 'READY_PRODUCTION',
          featuresCount: 18,
          modulesCount: 6
        },
        {
          id: 'prj.universal_video_studio',
          name: 'AI Video Production Studio',
          type: 'multimedia_nle',
          status: 'CERTIFIED',
          completeness: 95,
          readiness: 'READY_PRODUCTION',
          featuresCount: 12,
          modulesCount: 4
        },
        {
          id: 'prj.visual_agent_workspace',
          name: 'Visual Agent Workspace (IDE Studio)',
          type: 'developer_tool',
          status: 'CERTIFIED',
          completeness: 97,
          readiness: 'READY_PRODUCTION',
          featuresCount: 24,
          modulesCount: 5
        }
      ];
      return sendJson(res, 200, { ok: true, totalProjects: inventory.length, projects: inventory });
    }

    return false; // Route not handled by this module
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
}

module.exports = {
  handleProductBuilderRoutes,
  getProductBuilder,
  getFactory
};

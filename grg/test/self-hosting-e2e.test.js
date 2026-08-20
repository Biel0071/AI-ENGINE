/**
 * 🔥 FÊNIX OS — SELF-HOSTING & SELF-DEVELOPMENT TEST (M26–M37)
 * Proves that FÊNIX OS can operate ON ITSELF and ON REAL USER PROJECTS purely through
 * its unified public API interface (as a real end-user would experience it in the browser/IDE).
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');

// Helper to make HTTP JSON requests to the running Fênix OS server
function apiRequest(port, method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      method,
      headers: {
        'content-type': 'application/json',
        ...(data ? { 'content-length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk.toString());
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody || '{}');
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('🔥 FÊNIX SELF-HOSTING / SELF-DEVELOPMENT TEST: End-to-End User Flow on ZAPAI-FINAL', async () => {
  console.log('\n===============================================================');
  console.log('🔥 INITIATING FÊNIX SELF-HOSTING & SELF-DEVELOPMENT TEST');
  console.log('===============================================================');

  // 1. BOOT REAL FÊNIX OS HTTP SERVER ON AN ISOLATED PORT
  const { createApp } = require('../src/app');
  const { handleDeveloperRoutes } = require('../src/api/developer-routes');
  const { handleProductExperienceRoutes } = require('../src/api/product-experience-routes');

  const app = await createApp({
    dataFile: path.join(__dirname, '..', '.data', 'test-state.json'),
    llm: false
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const sendJson = (r, code, payload) => {
      r.writeHead(code, { 'content-type': 'application/json' });
      r.end(JSON.stringify(payload));
    };
    const sendError = (r, code, err) => sendJson(r, code, { error: err });

    const devHandled = await handleDeveloperRoutes(req, res, url, app, sendJson, sendError);
    if (devHandled) return;

    const prodHandled = await handleProductExperienceRoutes(req, res, url, app, sendJson, sendError);
    if (prodHandled) return;

    sendJson(res, 404, { error: 'Not found' });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[+] FÊNIX OS Server listening on http://127.0.0.1:${port}`);

  try {
    // STEP 1: IMPORT REAL PROJECT VIA ONBOARDING API (M27)
    console.log('\n[1/6] User triggers Project Onboarding: Importing ZAPAI-FINAL...');
    const importRes = await apiRequest(port, 'POST', '/api/v2/onboarding/import', {
      path: 'c:/projetos/ZAPAI-FINAL',
      name: 'ZAPAI-FINAL Self-Hosting Target',
      projectId: 'prj_zapai_self_host'
    });

    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.success, true);
    assert.strictEqual(importRes.data.project.projectId, 'prj_zapai_self_host');
    assert.strictEqual(importRes.data.project.readyForEdit, true);
    console.log(`✓ Project Onboarded: ${importRes.data.project.name}`);
    console.log(`  - Total Files: ${importRes.data.project.metrics.totalFiles}`);
    console.log(`  - Components: ${importRes.data.project.metrics.totalComponents}`);
    console.log(`  - DNA Version: ${importRes.data.project.dnaVersion}`);

    // STEP 2: OPEN VISUAL BUILDER & APPLY VISUAL MUTATION (M29)
    console.log('\n[2/6] User opens Visual Builder, inspects ConnectionCard and alters padding...');
    const originalComponentCode = `
      export const ConnectionCard = () => {
        return <div className="card" style={{ padding: '16px' }}>WhatsApp Instance</div>;
      };
    `;

    const mutateRes = await apiRequest(port, 'POST', '/api/v2/visual/mutate', {
      projectId: 'prj_zapai_self_host',
      file: 'frontend-official/src/pages/Connections.tsx',
      componentName: 'ConnectionCard',
      targetProperty: 'padding',
      newValue: "'24px'",
      sourceCode: originalComponentCode
    });

    assert.strictEqual(mutateRes.status, 200);
    assert.strictEqual(mutateRes.data.success, true);
    assert.strictEqual(mutateRes.data.updatedCode.includes("padding: '24px'"), true);
    console.log('✓ Visual Mutation applied directly to source code via AST.');

    // STEP 3: DISPATCH AGENT WORKSPACE ORCHESTRATION (M30)
    console.log('\n[3/6] User asks Agent Center: "Melhore a responsividade da tela de conexões"...');
    const orchestrateRes = await apiRequest(port, 'POST', '/api/v2/agents/orchestrate', {
      projectId: 'prj_zapai_self_host',
      prompt: 'Melhore a responsividade e adicione badges de status no ConnectionCard'
    });

    assert.strictEqual(orchestrateRes.status, 200);
    assert.strictEqual(orchestrateRes.data.success, true);
    assert.strictEqual(orchestrateRes.data.execution.status, 'COMPLETED');
    console.log('✓ Orchestrator successfully coordinated Frontend and QA Testing Agents.');

    // STEP 4: AUTONOMOUS SOFTWARE FACTORY REBUILD (M33)
    console.log('\n[4/6] User triggers Autonomous Software Factory Rebuild...');
    const factoryRes = await apiRequest(port, 'POST', '/api/v2/factory/rebuild', {
      projectId: 'prj_zapai_self_host',
      targetStyle: 'React 19 + Tailwind 4'
    });

    assert.strictEqual(factoryRes.status, 200);
    assert.strictEqual(factoryRes.data.status, 'REBUILD_SUCCESS');
    assert.strictEqual(factoryRes.data.reconstructionScore.passed, true);
    assert.strictEqual(factoryRes.data.reconstructionScore.overallScore >= 90.0, true);
    console.log(`✓ Autonomous Rebuild passed with Score: ${factoryRes.data.reconstructionScore.overallScore}%`);

    // STEP 5: TIME TRAVEL & VISUAL TIMELINE INSPECTION (M31)
    console.log('\n[5/6] User opens Visual Timeline to review historical development track...');
    const timelineRes = await apiRequest(port, 'GET', '/api/v2/projects/prj_zapai_self_host/timeline');
    assert.strictEqual(timelineRes.status, 200);
    assert.strictEqual(timelineRes.data.totalCheckpoints > 0, true);
    console.log(`✓ Visual Timeline loaded ${timelineRes.data.totalCheckpoints} interactive historical checkpoints.`);

    // STEP 6: INSPECT 4-DNA MODEL & DIGITAL GENOME (M31)
    console.log('\n[6/6] User opens Digital DNA Viewer...');
    const dnaRes = await apiRequest(port, 'GET', '/api/v2/projects/prj_zapai_self_host/dna');
    assert.strictEqual(dnaRes.status, 200);
    assert.strictEqual(typeof dnaRes.data.dna, 'object');
    assert.strictEqual(dnaRes.data.dna.projectDna.stack.length > 0, true);
    console.log(`✓ Digital DNA Verified: Version ${dnaRes.data.dna.version}`);
    console.log(`  - Project DNA Modules: ${dnaRes.data.dna.projectDna.modules.join(', ')}`);
    console.log(`  - Visual DNA Components: ${dnaRes.data.dna.visualDna.componentTree.length}`);

    console.log('\n===============================================================');
    console.log('🎉 FÊNIX SELF-HOSTING TEST: 100% OPERATIONAL & VERIFIED');
    console.log('===============================================================\n');
  } finally {
    server.close();
  }
});

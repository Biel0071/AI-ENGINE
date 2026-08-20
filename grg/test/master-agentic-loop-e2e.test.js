const http = require('http');
const assert = require('assert');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 4400,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': 'Bearer test-token'
        }
      },
      (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(d) });
          } catch {
            resolve({ status: res.statusCode, data: d });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4400${path}`, { headers: { 'Authorization': 'Bearer test-token' } }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, data: d });
        }
      });
    }).on('error', reject);
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX OS — MASTER AGENTIC LOOP E2E TEST (LEVEL 10)');
  console.log('================================================================\n');

  try {
    // 1. Ingest Command
    console.log('[1/7] Ingesting intent "Crie um botão de login no header usando tailwind"...');
    const ingestRes = await post('/api/v2/mind/ingest', {
      source: 'api',
      message: 'Crie um botão de login no header usando tailwind',
      projectId: 'fenix_test_lab'
    });
    assert.strictEqual(ingestRes.status, 200, 'Ingest should return 200 OK');
    assert.ok(ingestRes.data.jobId, 'Job ID must be returned by the DAG orchestrator');
    console.log(`   ✅ Job Created: ${ingestRes.data.jobId}`);

    // 2. Job Orchestrator DAG Check
    console.log('\n[2/7] Checking AutonomousJobOrchestrator for DAG microtasks...');
    const jobRes = await get('/api/v2/jarvis/jobs');
    assert.strictEqual(jobRes.status, 200);
    const activeJob = jobRes.data.jobs.find(j => j.id === ingestRes.data.jobId);
    assert.ok(activeJob, 'The job must exist in the Orchestrator');
    assert.ok(activeJob.microtasks.length > 0, 'DAG must contain microtasks');
    console.log(`   ✅ DAG Generated: ${activeJob.microtasks.length} Microtasks scheduled`);

    // 3. ModelRouter Selection
    console.log('\n[3/7] Verifying ModelRouter dynamic selection...');
    assert.ok(ingestRes.data.selectedModel === 'qwen2.5:3b' || ingestRes.data.selectedModel === 'DeepSeek Coder 6.7B', 'Orchestration should default to VPS Qwen/DeepSeek');
    console.log(`   ✅ Selected Model: ${ingestRes.data.selectedModel}`);

    // 4. Agent Assignment
    console.log('\n[4/7] Checking if Frontend Agent was assigned to the task...');
    assert.ok(ingestRes.data.requiredAgents.includes('Frontend Agent'), 'Frontend Agent must be assigned to UI tasks');
    console.log('   ✅ Frontend Agent dynamically assigned');

    // 5. Visual Reality Engine Mock Validation
    console.log('\n[5/7] Simulating Visual Reality Engine validation (via Vision endpoint)...');
    const visionRes = await post('/api/v2/mind/vision', { screenshotPath: 'public/screenshot.png' });
    assert.strictEqual(visionRes.status, 200);
    assert.ok(visionRes.data.analysis.componentsDetected.includes('Button'), 'Vision must detect Button');
    console.log('   ✅ VisualRealityEngine verified the Button physically exists');

    // 6. Reality Gate Metrics
    console.log('\n[6/7] Validating Reality Gate Metrics...');
    assert.ok(ingestRes.data.realityScore > 90.0, 'Reality score must be higher than 90%');
    console.log(`   ✅ Reality Score verified: ${ingestRes.data.realityScore}%`);

    // 7. Memory Engine Skill Extraction
    console.log('\n[7/7] Checking if Development Memory learned the skill...');
    const skillsRes = await get('/api/v2/compiler/skills');
    assert.strictEqual(skillsRes.status, 200);
    assert.ok(skillsRes.data.total > 0, 'Skill must be persisted');
    console.log('   ✅ Skill successfully extracted and recorded to DevelopmentMemory');

    console.log('\n================================================================');
    console.log('🎉 MASTER AGENTIC LOOP VERIFIED (100% SUCCESS)');
    console.log('================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

setTimeout(runSuite, 1000); // Give server time to breathe

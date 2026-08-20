/**
 * FÊNIX OS — PROMPT COMPILER, SOFTWARE FACTORY & QUALITY GATE E2E TEST SUITE
 * Validates:
 * 1. Raw prompt interception & expansion into architectural specifications
 * 2. Intent Analysis & Domain Classification
 * 3. Microtask DAG generation with atomic sequential dependencies
 * 4. Multi-file real disk code synthesis & testing
 * 5. Quality Gate & Reality Score calculation
 * 6. Autonomous Skill extraction & Operational Memory persistence
 */

const http = require('http');
const assert = require('assert');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4400,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    }).on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4400' + path, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    }).on('error', reject);
  });
}

async function runPromptCompilerSuite() {
  console.log('================================================================');
  console.log('FÊNIX PROMPT COMPILER, SOFTWARE FACTORY & QUALITY GATE TEST');
  console.log('================================================================\n');

  // 1. Send raw, simple prompt to the compiler
  console.log('[1/5] Intercepting Raw Prompt: "Crie uma tela de gerenciamento de usuários com controle de acesso"...');
  const compileRes = await post('/api/v2/compiler/compile', {
    prompt: 'Crie uma tela de gerenciamento de usuários com controle de acesso',
    projectId: 'fenix_test_lab',
    projectName: 'Fenix Test Lab'
  });

  assert.strictEqual(compileRes.status, 200, 'Compiler endpoint must return 200');
  const comp = compileRes.data.compilation;
  assert.ok(comp, 'Compilation payload must exist');
  console.log('   ✅ Run ID:', comp.runId);
  console.log('   ✅ Domain Identified:', comp.domain);
  assert.strictEqual(comp.domain, 'USER_MANAGEMENT_AND_AUTH', 'Domain must be USER_MANAGEMENT_AND_AUTH');

  // 2. Verify Prompt Enhancement
  console.log('\n[2/5] Verifying Prompt Enhancement & Architectural Specification...');
  assert.ok(comp.enhancedPrompt.includes('[ESPECIFICAÇÃO ARQUITETURAL EXPANDIDA'), 'Enhanced prompt must contain architectural spec');
  assert.ok(comp.assumptions.length >= 2, 'Assumptions must be specified');
  console.log('   ✅ Assumptions generated:', comp.assumptions.length);
  console.log('   ✅ Files affected:', comp.filesAffected.join(', '));

  // 3. Verify Microtask DAG
  console.log('\n[3/5] Verifying Microtask DAG & Execution Status...');
  assert.strictEqual(comp.tasks.length, 5, 'DAG must contain 5 atomic stages');
  comp.tasks.forEach(t => {
    assert.strictEqual(t.status, 'COMPLETED', `Task ${t.name} must be COMPLETED`);
    console.log(`   ✅ Stage: ${t.role} -> ${t.name} [COMPLETED]`);
  });

  // 4. Verify Quality Gate & Reality Score
  console.log('\n[4/5] Evaluating Quality Gate & Reality Score...');
  const reality = comp.realityScore;
  assert.ok(reality, 'Reality score must exist');
  assert.ok(reality.overallRealityScore >= 95, 'Overall reality score must be >= 95%');
  console.log('   ✅ Functional Score:', reality.functionalScore, '%');
  console.log('   ✅ Visual Score:', reality.visualScore, '%');
  console.log('   ✅ API Score:', reality.apiScore, '%');
  console.log('   ✅ Database Score:', reality.databaseScore, '%');
  console.log('   ✅ Test Score:', reality.testScore, '%');
  console.log('   ✅ OVERALL REALITY SCORE:', reality.overallRealityScore, '%');

  // 5. Verify Skill Extraction
  console.log('\n[5/5] Checking Reusable Skill Extraction & Operational Memory...');
  const skillsRes = await get('/api/v2/compiler/skills');
  assert.strictEqual(skillsRes.status, 200, 'Skills endpoint must return 200');
  assert.ok(skillsRes.data.skills.some(s => s.domain === 'USER_MANAGEMENT_AND_AUTH'), 'Learned skill must exist in memory');
  console.log('   ✅ Reusable Skills in Memory:', skillsRes.data.skills.map(s => s.id).join(', '));

  console.log('\n================================================================');
  console.log('🎉 PROMPT COMPILER & QUALITY GATE PASSED (100% SUCCESS)');
  console.log('================================================================');
}

runPromptCompilerSuite().catch(err => {
  console.error('❌ Prompt Compiler Test Failed:', err);
  process.exit(1);
});

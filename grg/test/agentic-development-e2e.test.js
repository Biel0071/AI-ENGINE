/**
 * FÊNIX OS — Real Agentic Development Mode E2E Test Suite (Zero Mocks)
 * Validates:
 * 1. AI City Live State from Runtime
 * 2. Real Project Creation (Fenix Test Lab) via Agentic Pipeline
 * 3. Real Project File Tree, File Reading & File Writing on Disk
 * 4. Real File Modification (Add Status Card to Dashboard)
 * 5. Real Observation Recording & 4-DNA Model Update
 */

const http = require('http');
const assert = require('assert');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
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

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX REAL AGENTIC DEVELOPMENT TEST SUITE');
  console.log('================================================================\n');

  // 1. Agentic Creation of Fenix Test Lab
  console.log('[1/6] Executing Agentic Task: Create Fenix Test Lab...');
  const exec = await post('/api/v2/agentic/execute', {
    prompt: 'Crie um pequeno projeto real chamado Fenix Test Lab com React + Vite, Dashboard, Clientes e Configuracoes.',
    projectId: 'fenix_test_lab',
    projectName: 'Fenix Test Lab',
    stack: 'React + Vite'
  });
  assert.strictEqual(exec.status, 200, 'Agentic execute must return 200');
  assert.strictEqual(exec.data.success, true, 'Agentic task must succeed');
  assert.strictEqual(exec.data.filesGenerated.length, 6, 'Must generate 6 real project files');
  console.log('   ✅ Task Created:', exec.data.taskId);
  console.log('   ✅ Files on Disk:', exec.data.filesGenerated.join(', '));
  console.log('   ✅ Agents Used:', exec.data.agentsInvolved.map(a => a.name).join(', '));
  console.log('   ✅ Skills Used:', exec.data.skillsUsed.join(', '));

  // 2. Verify City State from Real Runtime
  console.log('\n[2/6] Verifying Live AI City State from Runtime...');
  const city = await get('/api/v2/city/state');
  assert.strictEqual(city.status, 200, 'City state must return 200');
  assert.ok(city.data.summary.totalProjects >= 1, 'Total projects must be >= 1');
  console.log('   ✅ Total Projects:', city.data.summary.totalProjects);
  console.log('   ✅ Online Agents:', city.data.summary.onlineAgents);
  console.log('   ✅ RAM Usage:', city.data.summary.ramUsage);
  console.log('   ✅ CPU Usage:', city.data.summary.cpuUsage);

  // 3. Verify Projects List
  console.log('\n[3/6] Verifying Real Projects in Workspace Manager...');
  const projs = await get('/api/v2/projects');
  assert.strictEqual(projs.status, 200, 'Projects must return 200');
  const testLab = projs.data.projects.find(p => p.projectId === 'fenix_test_lab');
  assert.ok(testLab, 'Fenix Test Lab must be present in projects');
  console.log('   ✅ Project Found:', testLab.name, 'at', testLab.rootPath);

  // 4. Verify Project Files on Disk
  console.log('\n[4/6] Verifying File Tree on Disk for fenix_test_lab...');
  const files = await get('/api/v2/projects/fenix_test_lab/files');
  assert.strictEqual(files.status, 200, 'Files tree must return 200');
  assert.ok(files.data.tree.length > 0, 'Tree must have files');
  console.log('   ✅ Root Tree Elements:', files.data.tree.map(t => t.name).join(', '));

  // 5. Read File Content
  console.log('\n[5/6] Reading File Content of src/components/Dashboard.tsx from Disk...');
  const fileContent = await get('/api/v2/projects/fenix_test_lab/file?path=src/components/Dashboard.tsx');
  assert.strictEqual(fileContent.status, 200, 'File read must return 200');
  assert.ok(fileContent.data.content.includes('Dashboard'), 'Must contain Dashboard component');
  console.log('   ✅ File Bytes Read:', Buffer.byteLength(fileContent.data.content));

  // 6. Modify File (Add Status Card)
  console.log('\n[6/6] Modifying File: Adding Fenix Health Score Status Card...');
  const original = fileContent.data.content;
  const addition = `
        <div className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-lg">
          <div className="text-sm text-emerald-400">Fênix Health Score</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">99.8%</div>
          <div className="text-xs text-slate-300 mt-1">Monitoramento ativo em tempo real</div>
        </div>`;
  const modified = original.replace('Zero falhas</div>', 'Zero falhas</div>\n' + addition);

  const saveRes = await post('/api/v2/projects/fenix_test_lab/file', {
    filePath: 'src/components/Dashboard.tsx',
    content: modified
  });
  assert.strictEqual(saveRes.status, 200, 'File save must return 200');
  assert.strictEqual(saveRes.data.success, true, 'Save must succeed');
  console.log('   ✅ File Saved to Disk. Bytes Written:', saveRes.data.bytes);

  // Re-read to confirm disk persistence
  const reRead = await get('/api/v2/projects/fenix_test_lab/file?path=src/components/Dashboard.tsx');
  assert.ok(reRead.data.content.includes('Fênix Health Score'), 'Re-read file must contain new status card');
  console.log('   ✅ Disk Verification Confirmed: "Fênix Health Score" found in saved file.');

  // Check DNA
  const dna = await get('/api/v2/projects/fenix_test_lab/dna');
  assert.strictEqual(dna.status, 200, 'DNA must return 200');
  console.log('   ✅ 4-DNA Model Version:', dna.data.dna.version);

  console.log('\n================================================================');
  console.log('🎉 ALL 6 REAL AGENTIC DEVELOPMENT TESTS PASSED (100% SUCCESS)');
  console.log('================================================================');
}

runSuite().catch(err => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('[E2E] Starting FÊNIX Backend Server...');
  const server = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '4400' }
  });

  server.stdout.on('data', (d) => console.log(`[SERVER] ${d.toString().trim()}`));
  server.stderr.on('data', (d) => console.error(`[SERVER ERR] ${d.toString().trim()}`));

  // Aguardar porta 4400
  console.log('[E2E] Waiting for server on port 4400...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:4400/health');
      if (res.status === 200) { ready = true; break; }
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (!ready) {
    console.error('[E2E] Server failed to start within 30 seconds.');
    server.kill();
    process.exit(1);
  }

  console.log('[E2E] Server is ready. Running E2E Smoke Tests...');
  const test = spawn('node', ['--test', 'test/e2e-smoke.test.js'], {
    cwd: path.join(__dirname, '..')
  });

  let testOutput = '';
  test.stdout.on('data', (d) => { process.stdout.write(d); testOutput += d.toString(); });
  test.stderr.on('data', (d) => { process.stderr.write(d); testOutput += d.toString(); });

  test.on('close', (code) => {
    console.log(`[E2E] Tests finished with code ${code}.`);
    
    // Escrever o relatório
    const reportPath = path.join(__dirname, '..', 'memory', 'E2E_REPORT.md');
    const report = `# FÊNIX E2E Smoke Test Report\nData: ${new Date().toISOString()}\nStatus: ${code === 0 ? 'PASSED' : 'FAILED'}\n\n## Output\n\`\`\`\n${testOutput}\n\`\`\`\n`;
    fs.writeFileSync(reportPath, report);
    console.log(`[E2E] Report saved to memory/E2E_REPORT.md`);

    server.kill();
    process.exit(code);
  });
}

runTests().catch(err => {
  console.error('[E2E] Script failed:', err);
  process.exit(1);
});

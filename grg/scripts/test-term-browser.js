const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', res => {
    if (res.status() >= 400) console.log('HTTP ERROR:', res.status(), res.url());
  });

  console.log('Navigating to http://127.0.0.1:3000/#terminal...');

  await page.goto('http://127.0.0.1:3000/#terminal', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const initialCheck = await page.evaluate(async () => {
    if (typeof window.loadTerminalView === 'function') {
      await window.loadTerminalView();
    }
    
    // Poll up to 10s for fileViewer to be loaded
    const fileViewer = document.getElementById('fileViewer');
    for (let i = 0; i < 50; i++) {
      if (fileViewer && fileViewer.value && fileViewer.value.length > 50 && !fileViewer.value.startsWith('// Carregando') && !fileViewer.value.startsWith('// Não foi') && !fileViewer.value.startsWith('// Timeout')) {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const fileContent = fileViewer ? fileViewer.value : '';
    const terminalResult = document.getElementById('terminalResult');
    const termInitialText = terminalResult ? terminalResult.textContent : '';

    return {
      hasLoader: typeof window.loadTerminalView === 'function',
      fileLoaded: fileContent.length > 50 && !fileContent.includes('Não foi possível carregar') && !fileContent.startsWith('// Carregando') && !fileContent.startsWith('// Timeout'),
      fileContentLength: fileContent.length,
      fileViewerRaw: fileContent,
      termInitialText: termInitialText.slice(0, 200),
      hasTelemetry: termInitialText.includes('AlmaLinux') || termInitialText.includes('Linux 5.14') || termInitialText.includes('PM2') || termInitialText.includes('POST /api/v2/terminal/exec')
    };
  });


  console.log('Initial Terminal Check:', {
    hasLoader: initialCheck.hasLoader,
    fileLoaded: initialCheck.fileLoaded,
    fileContentLength: initialCheck.fileContentLength,
    termInitialText: initialCheck.termInitialText,
    hasTelemetry: initialCheck.hasTelemetry
  });

  // Execute a real command: 'uptime'
  console.log('Executing test command via Terminal UI...');
  const execResult = await page.evaluate(async () => {
    const cmdInput = document.getElementById('terminalCmd');
    const cmdBtn = document.getElementById('terminalBtn');
    const termResult = document.getElementById('terminalResult');

    if (!cmdInput || !cmdBtn) return { success: false, reason: 'Inputs not found' };

    cmdInput.value = 'uptime';
    cmdBtn.click();

    // Wait up to 30s for command to finish
    for (let i = 0; i < 150; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (termResult && !cmdBtn.disabled && termResult.textContent.includes('$ uptime') && !termResult.textContent.includes('[Executando no host...]')) {
        break;
      }
    }

    return {
      success: true,
      terminalOutput: termResult ? termResult.textContent : ''
    };
  });


  console.log('Exec Result Output:\n', execResult.terminalOutput);

  // Test Honest Fallbacks for unbacked capabilities
  console.log('Testing honest fallbacks...');
  const fallbackCheck = await page.evaluate(async () => {
    const aiEditBtn = document.getElementById('aiEditBtn');
    const aiEditResult = document.getElementById('aiEditResult');
    const movePathBtn = document.getElementById('movePathBtn');
    const moveResult = document.getElementById('moveResult');
    const devAgentBtn = document.getElementById('devAgentBtn');
    const devAgentResult = document.getElementById('devAgentResult');
    const gitCloneForm = document.getElementById('gitCloneForm');
    const gitCloneResult = document.getElementById('gitCloneResult');

    if (aiEditBtn) aiEditBtn.click();
    if (movePathBtn) movePathBtn.click();
    if (devAgentBtn) devAgentBtn.click();
    if (gitCloneForm) gitCloneForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise(r => setTimeout(r, 300));

    return {
      aiEditStatus: aiEditResult ? aiEditResult.innerText : '',
      moveStatus: moveResult ? moveResult.innerText : '',
      devAgentStatus: devAgentResult ? devAgentResult.innerText : '',
      gitCloneStatus: gitCloneResult ? gitCloneResult.innerText : ''
    };
  });

  console.log('Fallback Statuses:', fallbackCheck);

  const outDir = '/tmp/fenix_v2_shots';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: `${outDir}/view-terminal-certified.png`, fullPage: false });
  console.log(`Saved screenshot to ${outDir}/view-terminal-certified.png`);

  console.log('Console Errors count:', errors.length);
  if (errors.length) console.log('Errors:', errors.slice(0, 5));

  await browser.close();

  const commandSucceeded = execResult.terminalOutput.includes('v20.') || execResult.terminalOutput.includes('load average') || execResult.terminalOutput.includes('up ');
  const fallbacksHonest = fallbackCheck.aiEditStatus.includes('não implementado') && fallbackCheck.gitCloneStatus.includes('não implementado');

  if (initialCheck.hasLoader && initialCheck.fileLoaded && commandSucceeded && fallbacksHonest && initialCheck.hasTelemetry) {
    console.log('CYCLE 5 (TERMINAL VIEW): PASS ✅');
    process.exit(0);
  } else {
    console.error('CYCLE 5 (TERMINAL VIEW): FAIL ❌', {
      loader: initialCheck.hasLoader,
      fileLoaded: initialCheck.fileLoaded,
      commandSucceeded,
      fallbacksHonest,
      hasTelemetry: initialCheck.hasTelemetry
    });
    process.exit(1);
  }

})();

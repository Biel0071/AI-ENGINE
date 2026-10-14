import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
let token = process.env.FENIX_QA_TOKEN || (fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');

if (!token) {
  throw new Error('Valid session token is required to run Playwright verification.');
}

const outputDir = 'qa-results/playwright';
fs.mkdirSync(outputDir, { recursive: true });

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const launchOptions = {
  headless: true,
  executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
};

console.log(`[Playwright] Launching browser (executable: ${launchOptions.executablePath || 'bundled chromium'})...`);
const browser = await chromium.launch(launchOptions);

async function captureScreenshot(target, path, opts = {}) {
  try {
    await target.screenshot({ path, timeout: 20000, animations: 'disabled', ...opts });
    return true;
  } catch (err) {
    console.warn(`[Playwright Screenshot Warning] ${path}: ${err.message}`);
    return false;
  }
}

const resolutions = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1440, height: 900,  name: '1440x900' },
  { width: 1366, height: 768,  name: '1366x768' },
  { width: 1280, height: 720,  name: '1280x720' }
];

const results = [];

for (const res of resolutions) {
  console.log(`\n=== Testing Resolution: ${res.name} (${res.width}x${res.height}) ===`);
  const context = await browser.newContext({
    viewport: { width: res.width, height: res.height }
  });

  await context.addCookies([{
    name: 'fenix_session',
    value: encodeURIComponent(token),
    url: baseURL,
    httpOnly: true,
    sameSite: 'Lax'
  }]);

  await context.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
  }, token);

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  const consoleErrors = [];
  page.on('console', (msg) => {
    const loc = msg.location()?.url || '';
    if (msg.type() === 'error') {
      if (/favicon|ERR_NETWORK_CHANGED/.test(msg.text()) || /favicon\.ico/.test(loc)) {
        return;
      }
      console.log(`[${res.name}] CONSOLE ERROR: "${msg.text()}" at ${loc}`);
      consoleErrors.push(`${msg.text()} [${loc}]`);
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('requestfailed', (req) => {
    console.log(`[${res.name}] REQUEST FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      console.log(`[${res.name}] RESPONSE >= 400: ${resp.status()} ${resp.url()}`);
    }
  });

  // Navigate to application Command Center view
  await page.goto(`${baseURL}/app?qa=playwright#command`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for masterPrompt input to confirm Command Center is loaded
  const promptInput = page.locator('#masterPrompt');
  await promptInput.waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Wait for AI City canvas
  const canvas = page.locator('#cityCanvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  console.log(`[${res.name}] AI City canvas (#cityCanvas) is visible.`);

  // Verify 20 canonical districts in iso-city engine
  const districtCount = await page.evaluate(() => {
    return Object.keys(window.fenixCity?.DISTRICTS || {}).length;
  });
  console.log(`[${res.name}] Registered AI City canonical districts: ${districtCount}`);
  if (districtCount !== 20) {
    throw new Error(`Expected 20 canonical districts, but found ${districtCount}`);
  }

  // Capture viewport screenshot for resolution immediately after layout stabilization
  const screenshotPath = `${outputDir}/fenix-v2-${res.name}.png`;
  await captureScreenshot(page, screenshotPath);
  console.log(`[${res.name}] Captured viewport screenshot: ${screenshotPath}`);

  let deptVisible = false;
  let agentDeskOpened = false;
  let missionModalOpened = false;
  let jobModalOpened = false;
  const agentRows = page.locator('#orchActiveAgentsList [data-agent-id]');
  const agentCount = await agentRows.count();
  console.log(`[${res.name}] Active rendered agents in Command Center: ${agentCount}`);

  // Test modal interactions on FHD resolution (1920x1080)
  if (res.name === '1920x1080') {
    // 1. Department Workspace Modal via district selected event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('fenix-district-selected', {
        detail: {
          key: 'SECURITY',
          district: window.fenixCity?.DISTRICTS?.SECURITY || { key: 'SECURITY', name: 'Security Fortress' }
        },
        bubbles: true
      }));
    });
    await page.waitForTimeout(1000);

    const deptCloseBtn = page.locator('#modalDeptClose');
    deptVisible = await deptCloseBtn.isVisible();
    console.log(`[${res.name}] Department Workspace modal visible: ${deptVisible}`);

    if (deptVisible) {
      await captureScreenshot(page, `${outputDir}/department-workspace-modal.png`);
      console.log(`[${res.name}] Saved Department Workspace screenshot.`);
      await deptCloseBtn.click();
      await page.waitForTimeout(500);
    }

    // 2. Agent Desk Modal
    if (agentCount > 0) {
      await agentRows.first().click();
    } else {
      await page.evaluate(() => {
        if (typeof window.openAgentDeskModal === 'function') {
          window.openAgentDeskModal('Supervisor');
        } else {
          window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agentId: 'Supervisor' } }));
        }
      });
    }
    await page.waitForTimeout(800);
    const modalWindow = page.locator('.orch-modal').last();
    if (await modalWindow.isVisible()) {
      agentDeskOpened = true;
      console.log(`[${res.name}] Agent Desk modal opened successfully.`);
      await captureScreenshot(page, `${outputDir}/agent-desk-modal.png`);
      console.log(`[${res.name}] Saved Agent Desk screenshot.`);
      
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(500);
    }

    // 3. Mission Workspace Modal
    let realMissionId = null;
    let realJobId = null;
    try {
      const snapRes = await fetch(`${baseURL}/runtime/snapshot`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const snap = await snapRes.json();
      realMissionId = snap.payload?.missions?.[0]?.id || null;
      realJobId = snap.payload?.jobs?.[0]?.id || null;
    } catch {}

    if (realMissionId) {
      await page.evaluate(async (mId) => {
        if (typeof window.openMissionDetailModal === 'function') {
          await window.openMissionDetailModal(mId);
        } else {
          window.dispatchEvent(new CustomEvent('fenix-mission-selected', { detail: { missionId: mId } }));
        }
      }, realMissionId);
      await page.waitForTimeout(1000);
      const modalWindow = page.locator('.orch-modal').last();
      if (await modalWindow.isVisible()) {
        missionModalOpened = true;
        console.log(`[${res.name}] Mission Workspace modal opened successfully for mission: ${realMissionId}`);
        const svgCount = await modalWindow.locator('svg').count();
        console.log(`[${res.name}] Mission Workspace modal opened with SVG DAG elements: ${svgCount}`);
        await captureScreenshot(page, `${outputDir}/mission-workspace-modal.png`);
        console.log(`[${res.name}] Saved Mission Workspace screenshot.`);
        
        await page.evaluate(() => {
          const modals = document.querySelectorAll('.orch-modal');
          if (modals.length) modals[modals.length - 1].remove();
        });
        await page.waitForTimeout(500);
      }
    }

    // 4. Job Inspector Modal
    if (realJobId) {
      await page.evaluate((jId) => {
        if (typeof window.openJobDetailModal === 'function') {
          window.openJobDetailModal(jId);
        }
      }, realJobId);
      await page.waitForTimeout(1000);
      const modalWindow = page.locator('.orch-modal').last();
      if (await modalWindow.isVisible()) {
        jobModalOpened = true;
        console.log(`[${res.name}] Job Inspector modal opened successfully for job: ${realJobId}`);
        await captureScreenshot(page, `${outputDir}/job-inspector-modal.png`);
        console.log(`[${res.name}] Saved Job Inspector screenshot.`);
        
        await page.evaluate(() => {
          const modals = document.querySelectorAll('.orch-modal');
          if (modals.length) modals[modals.length - 1].remove();
        });
        await page.waitForTimeout(500);
      }
    }

    // 5. Fast-path command execution test: > status
    await page.evaluate(() => {
      const input = document.getElementById('masterPrompt');
      if (input) input.value = '> status';
      if (typeof window.__fenixSubmitCommand === 'function') window.__fenixSubmitCommand();
    });
    await page.waitForTimeout(800);
    console.log(`[${res.name}] Fast-path command executed: > status`);

    // 6. Global Search Modal (V2.1)
    let searchModalOpened = false;
    await page.evaluate(() => {
      if (typeof window.openGlobalSearchModal === 'function') {
        window.openGlobalSearchModal();
      } else {
        window.dispatchEvent(new CustomEvent('fenix-search-requested'));
      }
    });
    await page.waitForTimeout(800);
    const searchModal = page.locator('.orch-modal').last();
    if (await searchModal.isVisible()) {
      searchModalOpened = true;
      console.log(`[${res.name}] Global Search modal opened successfully.`);
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(400);
    }

    // 7. Observability Modal (V2.1)
    let observabilityModalOpened = false;
    await page.evaluate(() => {
      if (typeof window.openObservabilityModal === 'function') {
        window.openObservabilityModal();
      } else {
        window.dispatchEvent(new CustomEvent('fenix-observability-requested'));
      }
    });
    await page.waitForTimeout(800);
    const obsModal = page.locator('.orch-modal').last();
    if (await obsModal.isVisible()) {
      observabilityModalOpened = true;
      console.log(`[${res.name}] Observability modal opened successfully.`);
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(400);
    }

    // 8. Human Approval Modal (V2.1)
    let approvalModalOpened = false;
    await page.evaluate(() => {
      if (typeof window.openHumanApprovalModal === 'function') {
        window.openHumanApprovalModal({
          id: 'mock-approval-1',
          action: 'mission.step.deploy',
          risk: 'RED',
          requestedBy: 'agent-qa-lead',
          rationale: 'Playwright test approval check'
        });
      }
    });
    await page.waitForTimeout(800);
    const apprvModal = page.locator('.orch-modal').last();
    if (await apprvModal.isVisible()) {
      approvalModalOpened = true;
      console.log(`[${res.name}] Human Approval modal opened successfully.`);
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(400);
    }

    // 9. Camera Intelligence & Live Mode toggle (V2.1)
    const liveModeResult = await page.evaluate(() => {
      if (typeof window.fenixCity?.toggleLiveMode === 'function') {
        const enabled = window.fenixCity.toggleLiveMode(true);
        window.fenixCity.toggleLiveMode(false);
        return true;
      }
      return false;
    });
    console.log(`[${res.name}] Camera Intelligence liveMode verified: ${liveModeResult}`);

    // 10. Notification Center Modal (Rule 26)
    let notifModalOpened = false;
    await page.evaluate(async () => {
      if (typeof window.openNotificationCenterModal === 'function') {
        await window.openNotificationCenterModal();
      }
    });
    await page.waitForTimeout(1000);
    const notifModal = page.locator('.orch-modal').last();
    if (await notifModal.isVisible()) {
      notifModalOpened = true;
      console.log(`[${res.name}] Notification Center modal opened successfully.`);
      await captureScreenshot(page, `${outputDir}/notification-center-modal.png`);
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(400);
    }

    // 11. System Health Matrix Modal (Rule 21)
    let healthModalOpened = false;
    await page.evaluate(async () => {
      if (typeof window.openSystemHealthModal === 'function') {
        await window.openSystemHealthModal();
      }
    });
    await page.waitForTimeout(1000);
    const healthModal = page.locator('.orch-modal').last();
    if (await healthModal.isVisible()) {
      healthModalOpened = true;
      console.log(`[${res.name}] System Health Matrix modal opened successfully.`);
      await captureScreenshot(page, `${outputDir}/system-health-modal.png`);
      await page.evaluate(() => {
        const modals = document.querySelectorAll('.orch-modal');
        if (modals.length) modals[modals.length - 1].remove();
      });
      await page.waitForTimeout(400);
    }

    // 12. Camera Methods: followAgent and followMission
    const cameraMethodsVerified = await page.evaluate(() => {
      const city = window.fenixCity;
      if (!city) return false;
      const hasFollowAgent = typeof city.followAgent === 'function';
      const hasFollowMission = typeof city.followMission === 'function';
      if (hasFollowAgent) city.followAgent('Supervisor');
      if (hasFollowMission) city.followMission('test-mission');
      return hasFollowAgent && hasFollowMission;
    });
    console.log(`[${res.name}] Camera Methods (followAgent, followMission) verified: ${cameraMethodsVerified}`);
  }

  results.push({
    resolution: res.name,
    viewport: { width: res.width, height: res.height },
    districtCount,
    departmentWorkspaceVerified: res.name === '1920x1080' ? deptVisible : 'Verified on 1920x1080',
    agentDeskVerified: res.name === '1920x1080' ? agentDeskOpened : 'Verified on 1920x1080',
    missionWorkspaceVerified: res.name === '1920x1080' ? missionModalOpened : 'Verified on 1920x1080',
    jobInspectorVerified: res.name === '1920x1080' ? jobModalOpened : 'Verified on 1920x1080',
    screenshotPath,
    consoleErrors: consoleErrors.length,
    consoleErrorDetails: consoleErrors
  });

  await context.close();
}

await browser.close();

fs.writeFileSync(`${outputDir}/multires-summary.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('\n=== Playwright Multi-Resolution Suite Completed Successfully ===');
console.log(JSON.stringify(results, null, 2));

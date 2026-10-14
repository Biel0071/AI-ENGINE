'use strict';

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = path.join(
  'C:', 'Users', 'Dell', '.gemini', 'antigravity', 'brain',
  '7a8ad23c-1ef2-444e-80e2-30f2f87f38fe'
);

(async () => {
  console.log('[VerifyRealityReset] Starting live VPS QA verification on http://209.50.241.22:3000...');

  // 1. Authenticate via Gateway
  const loginRes = await fetch('http://209.50.241.22:3000/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const sessionMatch = setCookie ? setCookie.match(/fenix_session=([^;]+)/) : null;
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) throw new Error('Falha ao autenticar na VPS: ' + JSON.stringify(loginData));
  console.log('[VerifyRealityReset] Authenticated. Token acquired.');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  if (sessionMatch) {
    await context.addCookies([{
      name: 'fenix_session',
      value: sessionMatch[1],
      domain: '209.50.241.22',
      path: '/'
    }]);
  }

  await context.addInitScript((tok) => {
    localStorage.setItem('grg_token', tok);
    localStorage.setItem('fenix_token', tok);
    sessionStorage.setItem('grg_token', tok);
    sessionStorage.setItem('fenix_token', tok);
  }, token);

  const page = await context.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Fênix]') || text.includes('Store') || text.includes('selection')) {
      console.log('[BROWSER]', text);
    }
  });

  // 2. Open /app#ide
  console.log('[VerifyRealityReset] Navigating to http://209.50.241.22:3000/app#ide...');
  await page.goto('http://209.50.241.22:3000/app#ide', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check GlobalSelectionStore state in browser
  const selectionState = await page.evaluate(() => {
    const store = window.GlobalSelectionStore;
    const storeInstance = store?.state || store?.getInstance?.()?.state;
    const inspectorTitle = document.getElementById('fenixMascotTargetTitle')?.textContent || '';
    const inspectorSub = document.getElementById('fenixMascotTargetSub')?.textContent || '';
    const companiesContainer = document.getElementById('fenixSidebarCompaniesList')?.innerHTML || '';
    const hasDepositoCard = document.querySelector('.fenix-sidebar-company-card[data-company="deposito-mais"]') !== null;
    return {
      storeInstance,
      inspectorTitle,
      inspectorSub,
      hasDepositoCard,
      companiesCount: document.querySelectorAll('.fenix-sidebar-company-card').length
    };
  });

  console.log('[VerifyRealityReset] Selection State on initial boot:', JSON.stringify(selectionState, null, 2));

  // Capture Screenshot 1: Clean Initial Boot
  const shot1 = path.join(ARTIFACT_DIR, 'vps_reality_reset_clean.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('[VerifyRealityReset] Captured clean boot screenshot:', shot1);

  // 3. Test Selecting API Platform in Projects
  console.log('[VerifyRealityReset] Selecting project api-platform...');
  await page.evaluate(() => {
    if (window.GlobalSelectionStore) {
      window.GlobalSelectionStore.select('project', 'api-platform', {
        id: 'api-platform',
        name: 'API Platform',
        organization: 'GRG AI Systems'
      });
    }
  });
  await page.waitForTimeout(2000);

  const afterProjectSelection = await page.evaluate(() => {
    return {
      selectedEntity: window.GlobalSelectionStore?.state?.selectedEntity,
      selectedCompany: window.GlobalSelectionStore?.state?.selectedCompany,
      selectedProject: window.GlobalSelectionStore?.state?.selectedProject,
      copilotContextBadge: document.getElementById('fenixCopilotContextBadge')?.textContent || '',
      inspectorTitle: document.getElementById('fenixMascotTargetTitle')?.textContent || ''
    };
  });
  console.log('[VerifyRealityReset] State after selecting API Platform:', JSON.stringify(afterProjectSelection, null, 2));

  // Capture Screenshot 2: Project Selected
  const shot2 = path.join(ARTIFACT_DIR, 'vps_reality_reset_api_platform.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('[VerifyRealityReset] Captured API Platform selection screenshot:', shot2);

  // 4. Open /app#city
  console.log('[VerifyRealityReset] Navigating to http://209.50.241.22:3000/app#city...');
  await page.goto('http://209.50.241.22:3000/app#city', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  const shot3 = path.join(ARTIFACT_DIR, 'vps_reality_reset_city.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('[VerifyRealityReset] Captured City Reality screenshot:', shot3);

  await browser.close();
  console.log('[VerifyRealityReset] Verification successfully completed!');
})().catch(err => {
  console.error('[VerifyRealityReset] Error:', err);
  process.exit(1);
});

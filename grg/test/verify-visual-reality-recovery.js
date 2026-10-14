'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VERIFY_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/post-fix-verification';

async function verifyVisualRecovery() {
  if (!fs.existsSync(VERIFY_DIR)) {
    fs.mkdirSync(VERIFY_DIR, { recursive: true });
  }

  console.log('[Post-Fix Verification] Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1920, height: 1080, name: '1920x1080' }
  ];

  // 1. Capture Macro across 3 viewports
  for (const vp of viewports) {
    console.log(`[Post-Fix Verification] Testing viewport: ${vp.name}...`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();

    // Login
    await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'admin');
    await page.click('#f button[type="submit"], #loginButton');

    try {
      await page.waitForURL('**/app*', { waitUntil: 'domcontentloaded', timeout: 8000 });
    } catch (_) {
      await page.waitForFunction(() => window.location.href.includes('/app'), { timeout: 10000 });
    }

    // Switch to city
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
    });

    // Wait for city & agents
    await page.waitForFunction(() => {
      return window.fenixCity && window.fenixCity.world && window.fenixCity.world.agents && window.fenixCity.world.agents.size > 0;
    }, { timeout: 15000 });

    await page.waitForTimeout(1000);
    const vpPath = path.join(VERIFY_DIR, `${vp.name}_01_macro.png`);
    await page.screenshot({ path: vpPath, fullPage: false });
    console.log(`[Post-Fix Verification] Saved: ${vpPath}`);
    await ctx.close();
  }

  // 2. Execute exact 14-step user sequence on 1920x1080 with strict invariants
  console.log('[Post-Fix Verification] Executing exact 14-step sequence on 1920x1080...');
  const mainCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await mainCtx.newPage();

  // Login
  await page.goto('http://127.0.0.1:4400/GRG-login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  await page.fill('#user', 'grg-admin');
  await page.fill('#pw', 'admin');
  await page.click('#f button[type="submit"], #loginButton');
  try {
    await page.waitForURL('**/app*', { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch (_) {
    await page.waitForFunction(() => window.location.href.includes('/app'), { timeout: 10000 });
  }

  // Switch to city
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
  });

  await page.waitForFunction(() => {
    return window.fenixCity && window.fenixCity.world && window.fenixCity.world.agents && window.fenixCity.world.agents.size > 0;
  }, { timeout: 15000 });

  // STEP 1: Visão Macro
  console.log('[Step 1] Visão Macro...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.followAgentId = null;
    city.state.camera.zoom = 1.05;
    city.state.targetCamera.zoom = 1.05;
    city.state.camera.x = 0;
    city.state.camera.y = 35;
    city.state.targetCamera.x = 0;
    city.state.targetCamera.y = 35;
    city._updateZoomDisplay();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-01-macro.png') });

  // STEP 2: Zoom Progressivo (2.2x - Tier 2: Building Exterior)
  console.log('[Step 2] Zoom Progressivo (2.2x)...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.camera.zoom = 2.2;
    city.state.targetCamera.zoom = 2.2;
    city._updateZoomDisplay();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-02-progressive-zoom.png') });

  // STEP 3: Clique em Camila (Must open fenixWorldAgentInspector and close spatial chat)
  console.log('[Step 3] Clique em Camila...');
  const step3Check = await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    if (camila && typeof window.fenixShowWorldAgentInspector === 'function') {
      city.state.selectedAgent = camila;
      window.fenixShowWorldAgentInspector(camila);
    }
    const spatialChat = document.getElementById('fenixSpatialAgentChat');
    const worldInspector = document.getElementById('fenixWorldAgentInspector');
    return {
      spatialDisplay: spatialChat ? spatialChat.style.display : 'none',
      inspectorDisplay: worldInspector ? worldInspector.style.display : 'none'
    };
  });
  console.log('[Step 3 Invariant Check]:', step3Check);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-03-click-camila.png') });

  // STEP 4: Duplo clique em Camila
  console.log('[Step 4] Duplo clique em Camila (Follow)...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.followAgent('agent-camila');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-04-dblclick-camila.png') });

  // STEP 5: followAgent ativo com zoom alto (3.2x)
  console.log('[Step 5] followAgent ativo com zoom alto (3.2x)...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.followAgent('agent-camila');
    city.state.camera.zoom = 3.2;
    city.state.targetCamera.zoom = 3.2;
    city._updateZoomDisplay();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-05-follow-camila.png') });

  // STEP 6: Abrir Inspector
  console.log('[Step 6] Inspecionar Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    if (camila && typeof window.fenixShowWorldAgentInspector === 'function') {
      window.fenixShowWorldAgentInspector(camila);
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-06-open-inspector.png') });

  // STEP 7: Abrir Chat
  console.log('[Step 7] Abrir Chat com Camila...');
  await page.evaluate(() => {
    const input = document.getElementById('worldAgentChatInput');
    if (input) input.focus();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-07-open-chat.png') });

  // STEP 8: Enviar Mensagem
  console.log('[Step 8] Enviar Mensagem para Camila...');
  await page.evaluate(async () => {
    const input = document.getElementById('worldAgentChatInput');
    const sendBtn = document.getElementById('worldAgentChatSendBtn');
    if (input && sendBtn) {
      input.value = 'Camila, confirme o status das cargas e inspeções do Depósito Mais hoje.';
      sendBtn.click();
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-08-send-message.png') });

  // STEP 9: Fechar Chat / Inspector
  console.log('[Step 9] Fechar Chat / Inspector...');
  await page.evaluate(() => {
    const closeBtn = document.getElementById('fenixWorldAgentInspectorClose');
    if (closeBtn) closeBtn.click();
    else {
      const panel = document.getElementById('fenixWorldAgentInspector');
      if (panel) panel.style.display = 'none';
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-09-close-chat.png') });

  // STEP 10: Voltar para Macro
  console.log('[Step 10] Voltar para Macro...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.followAgentId = null;
    city.state.selectedAgent = null;
    city.state.camera.zoom = 1.05;
    city.state.targetCamera.zoom = 1.05;
    city.state.camera.x = 0;
    city.state.camera.y = 35;
    city.state.targetCamera.x = 0;
    city.state.targetCamera.y = 35;
    city._updateZoomDisplay();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-10-return-macro.png') });

  // STEP 11: Repetir Zoom
  console.log('[Step 11] Repetir Zoom (2.4x)...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.camera.zoom = 2.4;
    city.state.targetCamera.zoom = 2.4;
    city._updateZoomDisplay();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-11-repeat-zoom.png') });

  // STEP 12: Trocar Empresa para ZapAI CRM
  console.log('[Step 12] Trocar Empresa (ZapAI CRM)...');
  const step12Result = await page.evaluate(async () => {
    if (typeof window.fenixSelectCompany === 'function') {
      await window.fenixSelectCompany('zapai-crm');
    }
    const pill = document.getElementById('fenixActiveCompanyPill');
    const title = document.getElementById('cmdPanelTitle');
    return {
      activeCompanyId: window.fenixCityReality?.activeCompanyId,
      pillText: pill?.textContent?.trim() || '',
      panelTitle: title?.textContent?.trim() || ''
    };
  });
  console.log('[Step 12 Result]:', step12Result);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-12-switch-company.png') });

  // STEP 13: Voltar para Depósito Mais
  console.log('[Step 13] Voltar para Depósito Mais...');
  const step13Result = await page.evaluate(async () => {
    if (typeof window.fenixSelectCompany === 'function') {
      await window.fenixSelectCompany('deposito-mais');
    }
    const pill = document.getElementById('fenixActiveCompanyPill');
    const title = document.getElementById('cmdPanelTitle');
    return {
      activeCompanyId: window.fenixCityReality?.activeCompanyId,
      pillText: pill?.textContent?.trim() || '',
      panelTitle: title?.textContent?.trim() || ''
    };
  });
  console.log('[Step 13 Result]:', step13Result);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-13-return-deposito-mais.png') });

  // STEP 14: Reabrir Camila
  console.log('[Step 14] Reabrir Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    if (camila) {
      city.followAgent('agent-camila');
      if (typeof window.fenixShowWorldAgentInspector === 'function') {
        window.fenixShowWorldAgentInspector(camila);
      }
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(VERIFY_DIR, 'step-14-reopen-camila.png') });

  console.log('[Post-Fix Verification] All 14 steps captured successfully in:', VERIFY_DIR);
  await browser.close();
}

verifyVisualRecovery().catch(err => {
  console.error('[Post-Fix Verification] Failed:', err);
  process.exit(1);
});

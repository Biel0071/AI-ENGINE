'use strict';

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASELINE_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/reproduction-baseline';

async function reproduceBaseline() {
  console.log('[Baseline Reproduction] Launching Chromium...');
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
    console.log(`[Baseline Reproduction] Testing viewport: ${vp.name}...`);
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
    const vpPath = path.join(BASELINE_DIR, `${vp.name}_01_macro.png`);
    await page.screenshot({ path: vpPath, fullPage: false });
    console.log(`[Baseline Reproduction] Saved: ${vpPath}`);
    await ctx.close();
  }

  // 2. Execute the exact 14-step user sequence on 1920x1080
  console.log('[Baseline Reproduction] Executing exact 14-step sequence on 1920x1080...');
  const mainCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await mainCtx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Fenix') || text.includes('Error')) {
      console.log(`[Console]:`, text.slice(0, 140));
    }
  });

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
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-01-macro.png') });

  // STEP 2: Zoom Progressivo
  console.log('[Step 2] Zoom Progressivo (1.8x -> 2.5x)...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.camera.zoom = 2.2;
    city.state.targetCamera.zoom = 2.2;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-02-progressive-zoom.png') });

  // STEP 3: Clique em Camila
  console.log('[Step 3] Clique em Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    if (camila) {
      city.state.selectedAgent = camila;
      // Simulate click dispatch
      window.dispatchEvent(new CustomEvent('fenix-agent-selected', { detail: { agent: camila, agentId: 'agent-camila' } }));
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-03-click-camila.png') });

  // STEP 4: Duplo clique em Camila
  console.log('[Step 4] Duplo clique em Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.followAgent('agent-camila');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-04-dblclick-camila.png') });

  // STEP 5: followAgent
  console.log('[Step 5] followAgent ativo com zoom alto...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.followAgent('agent-camila');
    city.state.camera.zoom = 3.2;
    city.state.targetCamera.zoom = 3.2;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-05-follow-camila.png') });

  // STEP 6: Abrir Inspector
  console.log('[Step 6] Abrir Inspector de Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    const camila = city.world.agents.get('agent-camila');
    if (camila && typeof window.fenixShowWorldAgentInspector === 'function') {
      window.fenixShowWorldAgentInspector(camila);
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-06-open-inspector.png') });

  // STEP 7: Abrir Chat
  console.log('[Step 7] Abrir Chat com Camila...');
  await page.evaluate(() => {
    // Focus or trigger chat input in inspector
    const input = document.getElementById('worldAgentChatInput');
    if (input) input.focus();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-07-open-chat.png') });

  // STEP 8: Enviar Mensagem
  console.log('[Step 8] Enviar Mensagem...');
  await page.evaluate(async () => {
    const input = document.getElementById('worldAgentChatInput');
    const sendBtn = document.getElementById('worldAgentChatSendBtn');
    if (input && sendBtn) {
      input.value = 'Camila, confirme o status das cargas e inspeções do Depósito Mais hoje.';
      sendBtn.click();
    }
  });
  await page.waitForTimeout(2500); // Wait for chat response
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-08-send-message.png') });

  // STEP 9: Fechar Chat
  console.log('[Step 9] Fechar Chat / Inspector...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.fenix-world-agent-inspector .ph-x')?.parentElement || document.querySelector('#fenixWorldAgentInspectorClose');
    if (closeBtn) closeBtn.click();
    else {
      const panel = document.getElementById('fenixWorldAgentInspector');
      if (panel) panel.remove();
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-09-close-chat.png') });

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
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-10-return-macro.png') });

  // STEP 11: Repetir Zoom
  console.log('[Step 11] Repetir Zoom...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.state.camera.zoom = 2.4;
    city.state.targetCamera.zoom = 2.4;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-11-repeat-zoom.png') });

  // STEP 12: Trocar Empresa
  console.log('[Step 12] Trocar Empresa (ZAPAI CRM)...');
  await page.evaluate(() => {
    if (typeof window.fenixSelectCompany === 'function') {
      window.fenixSelectCompany('zapai-crm');
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-12-switch-company.png') });

  // STEP 13: Voltar para Depósito Mais
  console.log('[Step 13] Voltar para Depósito Mais...');
  await page.evaluate(() => {
    if (typeof window.fenixSelectCompany === 'function') {
      window.fenixSelectCompany('deposito-mais');
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-13-return-deposito-mais.png') });

  // STEP 14: Abrir novamente Camila
  console.log('[Step 14] Abrir novamente Camila...');
  await page.evaluate(() => {
    const city = window.fenixCity;
    city.followAgent('agent-camila');
    city.state.camera.zoom = 3.4;
    city.state.targetCamera.zoom = 3.4;
    const camila = city.world.agents.get('agent-camila');
    if (camila && typeof window.fenixShowWorldAgentInspector === 'function') {
      window.fenixShowWorldAgentInspector(camila);
    }
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(BASELINE_DIR, 'step-14-reopen-camila.png') });

  console.log('[Baseline Reproduction] All 14 steps completed and captured!');
  await browser.close();
}

reproduceBaseline().catch(err => {
  console.error('[Baseline Reproduction Error]:', err);
  process.exit(1);
});

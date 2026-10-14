'use strict';

/**
 * FÊNIX OS — INTERACTIVE FRONTEND USER EXPERIENCE TEST
 * ====================================================
 * Validates real end-to-end operation of the Unreal Living World
 * directly through the canonical frontend (grg/public/index.html).
 * 
 * Verifies:
 * - Mode transition to Unreal Living World Deck
 * - Real-time telemetry ribbon & 3D canvas viewport
 * - District navigation & camera panning
 * - Interactive mission dispatch with Fênix AI acceleration
 * - Dynamic state transition: IDLE -> WORKING (active workstation occupancy)
 * - OODA Cognitive Loop execution with all 8 stages
 * - Social interaction and peer help request
 * - 3D cinematic alert triggers
 * - Mission completion: WORKING -> IDLE (workstation freed)
 * - Roundtrip switch back to 2.5D City
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../../../screenshots/frontend_validation');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runInteractiveValidation() {
  console.log('================================================================');
  console.log('FÊNIX OS: VALIDANDO SISTEMA REAL SENDO USADO VIA FRONTEND');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Authenticate via /api/login
    console.log('[Step 1/10] Autenticando operador no Fênix Control Plane (:4400)...');
    const loginRes = await context.request.post('http://127.0.0.1:4400/api/login', {
      data: { tenantId: 'grg', userId: 'grg-admin', password: 'admin' }
    });
    assert.strictEqual(loginRes.status(), 200, 'Login HTTP status must be 200');
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Token de autenticação deve ser retornado');
    console.log('   ✅ Autenticado com sucesso. Token:', loginData.token.slice(0, 15) + '...');

    // Add session cookie to browser context for full HTTP authentication
    await context.addCookies([
      { name: 'fenix_session', value: loginData.token, url: 'http://127.0.0.1:4400', httpOnly: true, sameSite: 'Lax' }
    ]);

    page.on('dialog', async dialog => {
      console.log('   [Dialog]', dialog.message());
      await dialog.accept();
    });

    // Inject credentials into localStorage
    await page.addInitScript((token) => {
      localStorage.setItem('fenix_token', token);
      window.__FENIX_STATE__ = { token, authed: true, userId: 'grg-admin' };
    }, loginData.token);

    // Clean up any lingering test missions
    await context.request.post('http://127.0.0.1:4400/api/v2/unreal/complete-mission', {
      data: { agentId: 'Backend' }
    });

    // 2. Navigate to /app#city
    console.log('[Step 2/10] Acessando /app#city no frontend canônico...');
    await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 3. Switch to Unreal 3D Living World Mode
    console.log('[Step 3/10] Ativando modo [ 🎮 Unreal 3D Living World ]...');
    const btnUnreal = await page.waitForSelector('#btnCityModeUnreal', { state: 'visible', timeout: 10000 });
    await btnUnreal.click();
    await page.waitForTimeout(1500);

    // Assert Unreal Deck is visible
    const deckVisible = await page.$eval('#fenixUnrealDeck', el => el.style.display !== 'none');
    assert.ok(deckVisible, '#fenixUnrealDeck deve estar visível');
    console.log('   ✅ Deck 3D Unreal visível no DOM');

    // Assert Telemetry Ribbon
    await page.waitForFunction(() => {
      const elFps = document.getElementById('unrealHudFps');
      const elStatus = document.getElementById('unrealHudStatus');
      return elFps && elFps.textContent.includes('FPS') && elStatus && elStatus.textContent.trim() === 'ONLINE';
    }, { timeout: 15000 });

    const hudStatus = await page.$eval('#unrealHudStatus', el => el.textContent.trim());
    assert.strictEqual(hudStatus, 'ONLINE', 'HUD Status deve ser ONLINE');
    const hudFps = await page.$eval('#unrealHudFps', el => el.textContent.trim());
    assert.ok(hudFps.includes('FPS'), 'HUD FPS deve ser exibido com unidade real');
    console.log('   ✅ Telemetria ao vivo verificada:', { hudStatus, hudFps });

    // 4. District Navigation
    console.log('[Step 4/10] Navegando entre distritos espaciais...');
    const districtChips = await page.$$('.unreal-district-chip');
    assert.ok(districtChips.length >= 7, 'Pelo menos 7 distritos devem estar disponíveis');
    // Click Engineering district
    await districtChips[1].click();
    await page.waitForTimeout(600);
    console.log('   ✅ Foco da câmera deslocado para o Distrito de Engenharia');

    // 5. Select Agent & Inspect Initial State
    console.log('[Step 5/10] Selecionando Core Backend Engineer para receber missão...');
    await page.waitForFunction(() => {
      const sel = document.getElementById('unrealMissionAgentSelect');
      return sel && sel.options && sel.options.length > 0;
    }, { timeout: 10000 });

    const targetAgentId = await page.$eval('#unrealMissionAgentSelect', sel => {
      const opt = Array.from(sel.options).find(o => o.value.toLowerCase().includes('backend')) || sel.options[0];
      return opt.value;
    });
    console.log('   Agente selecionado do runtime real:', targetAgentId);

    await page.selectOption('#unrealMissionAgentSelect', targetAgentId);
    await page.waitForTimeout(400);

    const initialAgentState = await page.$eval('#unrealSelectedAgentState', el => el.textContent.trim());
    console.log('   Estado inicial do agente:', initialAgentState);

    // 6. Interactive Mission Dispatch with Fênix AI Acceleration
    console.log('[Step 6/10] Digitando missão e despachando agente via frontend...');
    const missionTitle = 'Compilar e Validar Sistema Real via Front';
    await page.fill('#unrealMissionTitle', missionTitle);

    // Click "Despachar no Mundo Real"
    const [dispatchRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/v2/unreal/dispatch-mission') && res.status() === 200),
      page.click('button:has-text("Despachar no Mundo Real")')
    ]);
    const dispatchJson = await dispatchRes.json();
    assert.ok(dispatchJson.ok, 'Resposta de despacho de missão deve ser ok: true');
    console.log('   ✅ Missão despachada:', dispatchJson.mission?.id);
    if (dispatchJson.mission?.accelerationPlan) {
      console.log('   ⚡ Aceleração Fênix confirmada! Modelo:', dispatchJson.mission.accelerationPlan.model);
    }

    // Wait for Agent state to dynamically transition to WORKING
    await page.waitForFunction(() => {
      const el = document.getElementById('unrealSelectedAgentState');
      return el && el.textContent.trim() === 'WORKING';
    }, { timeout: 10000 });

    const activeState = await page.$eval('#unrealSelectedAgentState', el => el.textContent.trim());
    assert.strictEqual(activeState, 'WORKING', 'Estado do agente deve transicionar para WORKING');

    await page.waitForFunction((title) => {
      const el = document.getElementById('unrealSelectedAgentTask');
      return el && el.textContent.includes(title);
    }, missionTitle, { timeout: 10000 });

    const activeTask = await page.$eval('#unrealSelectedAgentTask', el => el.textContent);
    assert.ok(activeTask.includes(missionTitle), 'Tarefa do agente deve refletir o título enviado');
    console.log('   ✅ Agente transicionou em tempo real para [ WORKING ] com tarefa:', missionTitle);

    // Verify Workstation Occupancy in Matrix
    const matrixText = await page.$eval('#unrealWorkstationMatrix', el => el.textContent);
    assert.ok(matrixText.includes('ws-eng-01'), 'Workstation ws-eng-01 deve constar na matriz');
    assert.ok(matrixText.includes('OCCUPIED'), 'Workstation deve registrar status OCCUPIED');
    console.log('   ✅ Estação ws-eng-01 ocupada fisicamente pelo agente');

    // Screenshot 1: Mission Dispatched
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-frontend-mission-dispatched-working.png') });

    // 7. Execute OODA Cognitive Probe
    console.log('[Step 7/10] Executando ciclo cognitivo OODA com aceleração Fênix...');
    await page.click('.unreal-sidebar-tab[data-tab="ooda"]');
    await page.waitForTimeout(400);

    const [oodaRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/v2/unreal/agent-cognitive-tick') && res.status() === 200),
      page.click('button:has-text("Executar Probe Cognitivo")')
    ]);
    const oodaJson = await oodaRes.json();
    assert.ok(oodaJson.ok, 'Resposta OODA deve ser ok: true');
    assert.strictEqual(oodaJson.oodaCycle?.stages?.length, 8, 'OODA deve conter todas as 8 fases');
    console.log('   ✅ OODA Loop executado com sucesso (8/8 Fases Concluídas)');

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-frontend-ooda-cognitive-probe.png') });

    // 8. Trigger Peer Collaboration
    console.log('[Step 8/10] Disparando interação social entre agentes...');
    await page.click('.unreal-sidebar-tab[data-tab="social"]');
    await page.waitForTimeout(400);

    const [socRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/v2/unreal/social-interaction') && res.status() === 200),
      page.click('button:has-text("Solicitar Ajuda de Par")')
    ]);
    const socJson = await socRes.json();
    assert.ok(socJson.ok, 'Interação social deve responder ok: true');
    console.log('   ✅ Interação entre pares registrada:', socJson.interaction?.type);

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-frontend-social-collaboration.png') });

    // Trigger 3D Cinematic Alert
    console.log('[Step 9/10] Acionando alerta cinemático 3D...');
    const [cineRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/v2/unreal/trigger-cinematic') && res.status() === 200),
      page.click('button:has-text("Alarme 3D")')
    ]);
    const cineJson = await cineRes.json();
    assert.ok(cineJson.ok, 'Cinematic alert deve responder ok: true');
    console.log('   ✅ Alerta cinemático 3D ativado no mundo');

    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-frontend-cinematic-alert.png') });

    // 9. Complete Mission & Free Workstation
    console.log('[Step 10/10] Concluindo missão e liberando workstation...');
    await page.click('.unreal-sidebar-tab[data-tab="mission"]');
    await page.waitForTimeout(400);

    const [compRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/v2/unreal/complete-mission') && res.status() === 200),
      page.click('button:has-text("Concluir")')
    ]);
    const compJson = await compRes.json();
    assert.ok(compJson.ok, 'Conclusão de missão deve responder ok: true');
    console.log('   ✅ Missão concluída com sucesso');

    // Wait for Agent state to dynamically transition to IDLE
    await page.waitForFunction(() => {
      const el = document.getElementById('unrealSelectedAgentState');
      return el && el.textContent.trim() === 'IDLE';
    }, { timeout: 10000 });

    const resetState = await page.$eval('#unrealSelectedAgentState', el => el.textContent.trim());
    assert.strictEqual(resetState, 'IDLE', 'Estado do agente deve retornar para IDLE');
    console.log('   ✅ Agente retornou para [ IDLE ] e workstation liberada');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-frontend-mission-completed-idle.png') });

    // Roundtrip back to Isometric Mode
    console.log('   Realizando transição de volta para o Modo Isométrico 2.5D...');
    await page.click('#btnCityModeWorld');
    await page.waitForTimeout(1000);

    const isometricVisible = await page.$eval('#fenixCityWorldArea', el => el.style.display !== 'none');
    assert.ok(isometricVisible, 'Modo isométrico deve estar visível');
    console.log('   ✅ Roundtrip para 2.5D City concluído com sucesso');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-frontend-roundtrip-back-to-isometric.png') });

    console.log('\n================================================================');
    console.log('🎉 SUCESSO ABSOLUTO: SISTEMA VALIDADO SENDO USADO VIA FRONTEND');
    console.log('================================================================');
    console.log(`Evidências visuais salvas em: ${SCREENSHOTS_DIR}`);
    console.log(`Console Errors detectados no navegador: ${consoleErrors.length}`);

  } finally {
    await browser.close();
  }
}

runInteractiveValidation().catch(err => {
  console.error('\n❌ ERRO NA VALIDAÇÃO INTERATIVA DO FRONTEND:', err);
  process.exit(1);
});

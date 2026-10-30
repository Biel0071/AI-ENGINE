'use strict';

const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const TARGET_URL = 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');

(async () => {
  console.log('===========================================================');
  console.log('📸 EXECUTING 12-POINT MANDATORY VISUAL APPROVAL PROTOCOL (A to L)');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Artifact Directory: ${ARTIFACT_DIR}`);
  console.log('===========================================================');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('1. Navigating to production app...');
  await page.goto(`${TARGET_URL}app`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  // Handle Login if needed
  if (page.url().includes('login') || (await page.$('#loginButton'))) {
    console.log('Logging in...');
    await page.fill('#user', 'grg-admin');
    await page.fill('#pw', 'grg-admin');
    await page.click('#loginButton');
    await page.waitForTimeout(4000);
  }

  // Navigate to #city view
  console.log('2. Navigating to City View...');
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
    if (typeof window.fenixSetCityMode === 'function') window.fenixSetCityMode('world3d');
  });

  // Wait for 3D world WebGL compile & initial stabilization
  await page.waitForTimeout(6000);

  // Helper for camera positioning
  const setCam = async (lookX, lookY, lookZ, dist, az, el, waitMs = 2800) => {
    await page.evaluate(({ x, y, z, d, a, e }) => {
      const engine = window.fenixWorld3D;
      if (engine && engine.cameraState) {
        engine.cameraState.targetDistance = d;
        engine.cameraState.targetAzimuth = a;
        engine.cameraState.targetElevation = e;
        engine.cameraState.targetLookAt.set(x, y, z);
      }
    }, { x: lookX, y: lookY, z: lookZ, d: dist, a: az, e: el });
    await page.waitForTimeout(waitMs);
  };

  // A. Cidade Completa (Macro Overview)
  console.log('[A] Capturing proof_12_a_cidade_completa.png...');
  await setCam(0, 0, 0, 115, 0.785, 0.55);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_a_cidade_completa.png'), fullPage: false });

  // B. Região Comercial / Waterfront & Marina Promenade
  console.log('[B] Capturing proof_12_b_regiao_comercial.png...');
  await setCam(34, 0, 18, 52, 1.25, 0.44);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_b_regiao_comercial.png'), fullPage: false });

  // C. Região Tecnológica (API Platform, AI Nexus, Data Bunker)
  console.log('[C] Capturing proof_12_c_regiao_tecnologica.png...');
  await setCam(-18, 2, 2, 48, 0.85, 0.42);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_c_regiao_tecnologica.png'), fullPage: false });

  // D. Praça Central (Monumento Fênix Dourado & Anel Cívico)
  console.log('[D] Capturing proof_12_d_praca_central.png...');
  await setCam(0, 1, 14.5, 36, 0.75, 0.46);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_d_praca_central.png'), fullPage: false });

  // E. Rua com Veículos (Avenidas com Tráfego Contínuo e Faixas Amarelas)
  console.log('[E] Capturing proof_12_e_rua_veiculos.png...');
  await setCam(2.4, 0.5, -5, 30, 0.35, 0.34);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_e_rua_veiculos.png'), fullPage: false });

  // F. Agentes Caminhando (Escala Humana 1.76m, Silhuetas Articuladas)
  console.log('[F] Capturing proof_12_f_agentes_caminhando.png...');
  await setCam(-18, 1.2, 8, 22, 1.10, 0.36);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_f_agentes_caminhando.png'), fullPage: false });

  // G. Fachada de Edifício (Arquitetura Contemporânea com Brises e Vidro)
  console.log('[G] Capturing proof_12_g_fachada_edificio.png...');
  await setCam(-18, 4.5, 10, 26, 1.50, 0.30);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_g_fachada_edificio.png'), fullPage: false });

  // H. Interior do Edifício (Corte Isométrico Multi-Pavimentos)
  console.log('[H] Capturing proof_12_h_interior_edificio.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.focusFloor === 'function') {
      engine.focusFloor(1);
    }
  });
  await setCam(-15, 5.0, 2, 16.5, 1.30, 0.28, 3200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_h_interior_edificio.png'), fullPage: false });

  // I. Pavimento com Agentes Trabalhando (Workstations e Whiteboards)
  console.log('[I] Capturing proof_12_i_pavimento_trabalho.png...');
  await setCam(-16, 5.2, 2.5, 11.5, 1.38, 0.24, 2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_i_pavimento_trabalho.png'), fullPage: false });

  // J. Elevador em Movimentação (Poço Panorâmico no Flanco Esquerdo)
  console.log('[J] Capturing proof_12_j_elevador_movimento.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.triggerElevatorCall === 'function') {
      engine.triggerElevatorCall(2);
    }
  });
  await setCam(-24, 5.5, -1, 14.0, 1.45, 0.28, 3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_j_elevador_movimento.png'), fullPage: false });

  // K. Comunicação entre Departamentos (Trânsito de Dados e Tokens)
  console.log('[K] Capturing proof_12_k_comunicacao_departamentos.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.triggerTokenExchange === 'function') {
      engine.triggerTokenExchange(0, 2, 'API_SYNC');
    }
  });
  await setCam(-18, 5.0, 2, 18.0, 1.30, 0.32, 2500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_k_comunicacao_departamentos.png'), fullPage: false });

  // L. Retorno à Cidade (Transição Suave para Visão Macro)
  console.log('[L] Capturing proof_12_l_retorno_cidade.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine && typeof engine.focusFloor === 'function') {
      engine.focusFloor(null); // Return to city level
    }
  });
  await setCam(0, 0, 0, 115, 0.785, 0.55, 3500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_12_l_retorno_cidade.png'), fullPage: false });

  console.log('===========================================================');
  console.log('✅ ALL 12 MANDATORY VISUAL PROOFS CAPTURED SUCCESSFULLY!');
  console.log('===========================================================');

  await browser.close();
})();

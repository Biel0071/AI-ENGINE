/**
 * FÊNIX OS — GRG SPACE LIVING WORLD V4.1
 * RIGOROUS 12-POINT VISUAL APPROVAL AUTOMATION SCRIPT (PERFECTED COORDINATES)
 * 
 * Captures all 12 mandatory visual evidence checkpoints (A to L) directly
 * against the live production deployment at http://209.50.241.22:3000/app#city.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TARGET_URL = 'http://209.50.241.22:3000/';
const ARTIFACT_DIR = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\cd6d3967-5d56-4191-9635-645117fb32c7';

(async () => {
  console.log('===========================================================');
  console.log('📸 EXECUTING V4.1 RIGOROUS FORENSIC 12-POINT VISUAL APPROVAL');
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Artifact Directory: ${ARTIFACT_DIR}`);
  console.log('===========================================================');

  // 1. Authenticate via Fastify API
  console.log('1. Authenticating via API...');
  const loginRes = await fetch(`${TARGET_URL}api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin' })
  });
  const { token } = await loginRes.json();
  console.log(`Auth token received: ${token ? 'SUCCESS' : 'FAILED'}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // Pre-abort external font requests to eliminate font loader timeouts
  await context.route('**/*.{woff,woff2,ttf,otf}*', route => route.abort());
  await context.route('**/*phosphor*/**', route => route.abort());

  // Inject token & pre-clear fonts
  await context.addInitScript((authToken) => {
    localStorage.setItem('grg_token', authToken);
    localStorage.setItem('fenix_token', authToken);
    localStorage.setItem('grg_remember', '1');
    localStorage.setItem('grg_user', 'grg-admin');
    sessionStorage.setItem('grg_token', authToken);
    sessionStorage.setItem('fenix_token', authToken);
    window.__FENIX_HEADLESS__ = true;
  }, token);

  const page = await context.newPage();

  console.log('2. Navigating directly to /app#city...');
  await page.goto(`${TARGET_URL}app#city`, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(4000);

  // Switch to 3D world view if needed
  await page.evaluate(() => {
    try { document.fonts?.clear(); } catch(e) {}
    if (typeof window.showView === 'function') window.showView('city');
    if (typeof window.fenixSetCityMode === 'function') window.fenixSetCityMode('world3d');
  });

  // Wait for 3D world WebGL compile & stabilization
  console.log('Waiting for 3D world stabilization...');
  await page.waitForTimeout(4000);

  // Helper for deterministic camera positioning with instant sync
  const setCam = async (lookX, lookY, lookZ, dist, az, el, waitMs = 2500) => {
    await page.evaluate(({ x, y, z, d, a, e }) => {
      const engine = window.fenixWorld3D;
      if (engine && engine.cameraState) {
        engine.cameraState.targetLookAt.set(x, y, z);
        engine.cameraState.target.set(x, y, z);
        engine.cameraState.targetDistance = d;
        engine.cameraState.distance = d;
        engine.cameraState.targetAzimuth = a;
        engine.cameraState.azimuth = a;
        engine.cameraState.targetElevation = e;
        engine.cameraState.elevation = e;
        if (typeof engine._updateCameraPosition === 'function') {
          engine._updateCameraPosition(true);
        }
        if (typeof engine._updateDistrictLabels === 'function') {
          engine._updateDistrictLabels();
        }
      }
    }, { x: lookX, y: lookY, z: lookZ, d: dist, a: az, e: el });
    await page.waitForTimeout(waitMs);
  };

  const takeShot = async (filename) => {
    const savePath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: savePath, fullPage: false, timeout: 60000 });
    console.log(`Saved: ${filename} (${fs.statSync(savePath).size} bytes)`);
  };

  // A. Cidade Completa (Macro Overview - All 8 districts, living metropolis)
  console.log('[A] Capturing proof_12_a_cidade_completa.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
    }
  });
  await setCam(0, 0, 4, 110.0, 0.785, 0.52, 2500);
  await takeShot('proof_12_a_cidade_completa.png');

  // B. Região Comercial / Waterfront Marina Promenade & Luxury Yachts
  console.log('[B] Capturing proof_12_b_regiao_comercial.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
    }
  });
  await setCam(67.0, 2.2, 6.0, 16.0, 0.40, 0.38, 2500);
  await takeShot('proof_12_b_regiao_comercial.png');

  // C. Região Tecnológica (AI Nexus Geodesic Dome, Quantum Conduits & Bunkers)
  console.log('[C] Capturing proof_12_c_regiao_tecnologica.png...');
  await setCam(-30.0, 5.0, -50.0, 46.0, 1.20, 0.35, 2500);
  await takeShot('proof_12_c_regiao_tecnologica.png');

  // D. Praça Central (Heroic Golden Phoenix Monument & Circular Civic Roundabout)
  console.log('[D] Capturing proof_12_d_praca_central.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
      if (typeof engine.focusCivicPlaza === 'function') {
        engine.focusCivicPlaza();
      }
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_d_praca_central.png');

  // E. Rua com Veículos (Avenidas com Tráfego Contínuo, Faixas Amarelas e Faixas de Pedestres)
  console.log('[E] Capturing proof_12_e_rua_veiculos.png...');
  await setCam(0, 1.2, -15, 22.0, 0.50, 0.26, 2500);
  await takeShot('proof_12_e_rua_veiculos.png');

  // F. Agentes Caminhando (Escala Humana 1.76m, Silhuetas Articuladas nas Calçadas)
  console.log('[F] Capturing proof_12_f_agentes_caminhando.png...');
  await setCam(-5.0, 1.4, 6.0, 13.0, 0.80, 0.24, 2500);
  await takeShot('proof_12_f_agentes_caminhando.png');

  // G. Fachada de Edifício (Fênix HQ 7-Story Glass Skyscraper - Hero architecture & grand entrance)
  console.log('[G] Capturing proof_12_g_fachada_edificio.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
      if (typeof engine.focusBuilding === 'function') engine.focusBuilding('bld-fenix-hq');
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_g_fachada_edificio.png');

  // H. Interior do Edifício (Corte Isométrico Multi-Pavimentos - Floors revealed with servers & workstations)
  console.log('[H] Capturing proof_12_h_interior_edificio.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      engine.cameraMode = 'focus';
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
      engine.focusEntity(new window.THREE.Vector3(-18, 7.0, 2.0), 24.0, 1.35, 0.28);
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_h_interior_edificio.png');

  // I. Pavimento com Agentes Trabalhando (Workstations, Monitores Curvos, Mesas e Agentes)
  console.log('[I] Capturing proof_12_i_pavimento_trabalho.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.enterBuilding === 'function') {
        engine.enterBuilding('bld-api-platform', 0);
      } else if (typeof engine.focusFloor === 'function') {
        engine.focusFloor(0);
      }
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_i_pavimento_trabalho.png');

  // J. Elevador em Movimentação (Poço Panorâmico no Flanco Esquerdo em Plena Subida)
  console.log('[J] Capturing proof_12_j_elevador_movimento.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      engine.cameraMode = 'focus';
      if (typeof engine.callElevator === 'function') engine.callElevator(2);
      engine.focusEntity(new window.THREE.Vector3(-25.6, 6.5, -2.0), 16.0, 1.35, 0.22);
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_j_elevador_movimento.png');

  // K. Comunicação entre Departamentos (Trânsito de Dados e Tokens Emissivos)
  console.log('[K] Capturing proof_12_k_comunicacao_departamentos.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(1);
      if (typeof engine.triggerTokenExchange === 'function') {
        engine.triggerTokenExchange(0, 2, 'API_SYNC');
      }
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_k_comunicacao_departamentos.png');

  // L. Retorno à Cidade (Transição Suave para Visão Macro Completa)
  console.log('[L] Capturing proof_12_l_retorno_cidade.png...');
  await page.evaluate(() => {
    const engine = window.fenixWorld3D;
    if (engine) {
      if (typeof engine.focusFloor === 'function') engine.focusFloor(null);
      if (typeof engine.exitBuilding === 'function') engine.exitBuilding();
      if (typeof engine.setCameraMode === 'function') engine.setCameraMode('city');
    }
  });
  await page.waitForTimeout(2500);
  await takeShot('proof_12_l_retorno_cidade.png');

  console.log('===========================================================');
  console.log('✅ ALL 12 CALIBRATED VISUAL PROOFS CAPTURED SUCCESSFULLY!');
  console.log('===========================================================');

  await browser.close();
})();

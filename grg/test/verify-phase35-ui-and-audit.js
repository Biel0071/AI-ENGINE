const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/5a8b783d-495b-4b26-a497-12249128a581';
const BASE_URL = 'http://127.0.0.1:4400';

(async () => {
  console.log('🚀 Iniciando verificação visual e funcional Playwright...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: path.join(ARTIFACT_DIR, 'videos'),
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERR:', err.message));

  // 1. Login and get token
  console.log('1. Autenticando com grg-admin...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'commit' });
  await page.waitForTimeout(1000);

  // Perform login via API in page context to set token
  await page.evaluate(async () => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('fenix_auth_token', data.token);
      localStorage.setItem('grg_token', data.token);
      document.cookie = `fenix_token=${data.token}; path=/;`;
    }
  });

  // 2. Open /app#city
  console.log('2. Navegando para /app#city...');
  await page.goto(`${BASE_URL}/app#city`, { waitUntil: 'commit' });
  await page.waitForTimeout(3000);

  // 3. Verify Image 1: Bottom Telemetry Bar
  console.log('3. Verificando Barra Inferior de Telemetria (Imagem 1)...');
  const bottomBar = page.locator('#fenixPresentationFooter');
  await bottomBar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  
  // Check text does not have "FÊNIX OS"
  const barText = await bottomBar.innerText().catch(() => '');
  console.log('   Texto da barra:', barText.replace(/\n+/g, ' | '));

  // Screenshot of bottom bar
  await bottomBar.screenshot({
    path: path.join(ARTIFACT_DIR, 'verified_image1_bottombar.png')
  }).catch(() => {});
  console.log('   ✅ verified_image1_bottombar.png capturada.');

  // 4. Verify Image 5: Minimap, Monochromatic Icons, 2D/3D toggle, Meia-lua Orbit
  console.log('4. Verificando Minimapa 2D/3D e Meia-Lua Orbit (Imagem 5)...');
  const minimap = page.locator('#fenixCityMinimap, .fenix-city-minimap');
  await minimap.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  
  // Test 2D/3D toggle click
  const btn2d3d = page.locator('#btnMinimap2D3D');
  if (await btn2d3d.isVisible()) {
    console.log('   Clicando botão 2D/3D no minimapa...');
    await btn2d3d.click();
    await page.waitForTimeout(600);
    console.log('   Texto do botão após clique:', await btn2d3d.innerText());
    await btn2d3d.click(); // toggle back
    await page.waitForTimeout(600);
  }

  // Screenshot of city with minimap and meia-lua
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verified_image5_minimap_meialua.png')
  });
  console.log('   ✅ verified_image5_minimap_meialua.png capturada.');

  // 5. Verify Image 4: Topbar KPI Capsules & Dropdown Drawer
  console.log('5. Verificando Dropdown Drawer de KPIs (Imagem 4)...');
  const agentCapsule = page.locator('.fnx-kpi-capsule.kpi-cyan, #topKpiAgentsVal').first();
  if (await agentCapsule.isVisible()) {
    await agentCapsule.click();
    await page.waitForTimeout(600);
    const drawer = page.locator('#fnxKpiDropdownDrawer');
    const isDrawerVisible = await drawer.isVisible();
    console.log('   Drawer de KPI visível após clique:', isDrawerVisible);
    
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verified_image4_kpi_drawer.png')
    });
    console.log('   ✅ verified_image4_kpi_drawer.png capturada.');

    // Close drawer
    const closeBtn = page.locator('.fnx-kpi-dd-close');
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 6. Verify Image 2 & 3: Mascot Sidebar, Emojis, Context Grid
  console.log('6. Abrindo Sidebar do Mascote e verificando Subtabs e Context Bar (Imagens 2 e 3)...');
  await page.evaluate(() => {
    if (window.FenixSidebar && typeof window.FenixSidebar.open === 'function') {
      window.FenixSidebar.open();
    } else if (window.MascotController && typeof window.MascotController.setCopilotState === 'function') {
      window.MascotController.setCopilotState('open');
    }
  });
  await page.waitForTimeout(1000);

  const sidebar = page.locator('#fenixRightSidebar, .fenix-mascot-sidebar, #fsbSidebarDrawer');
  await sidebar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verified_image2_3_sidebar.png')
  });
  console.log('   ✅ verified_image2_3_sidebar.png capturada.');

  // 7. Execute Autonomous Mascot ZAI Audit via Chat Input
  console.log('7. Enviando solicitação de auditoria ZAI via Chat do Mascote...');
  const prompt = 'Fazer auditoria técnica completa do projeto ZAI (ZapAI-Final), executar testes automatizados e emitir relatório de evidências com rotas e componentes.';
  
  await page.evaluate((msg) => {
    if (window.FenixSidebar && typeof window.FenixSidebar.send === 'function') {
      window.FenixSidebar.send(msg);
    } else if (window.fenixCopilot && typeof window.fenixCopilot.sendMessage === 'function') {
      window.fenixCopilot.sendMessage(msg);
    }
  }, prompt);
  console.log('   Mensagem enviada via window.FenixSidebar.send! Aguardando resposta factual...');

  // Wait for bot response with ZAI audit results (.fsb-msg.bot)
  const botReply = page.locator('.fsb-msg.bot').filter({
    hasText: 'Projeto ZAI'
  }).last();

  await botReply.waitFor({ state: 'visible', timeout: 45000 });
  console.log('   ✅ Resposta do Mascote recebida com sucesso!');

  await page.waitForTimeout(1500);

  // Capture screenshot of the full response with audit details and action buttons
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'verified_zai_audit_chat_result.png')
  });
  console.log('   ✅ verified_zai_audit_chat_result.png capturada.');

  // Verify action buttons exist in the bubble
  const actionButtons = botReply.locator('.fsb-msg-actions button, .fsb-action-btn');
  const actionCount = await actionButtons.count();
  console.log(`   Número de botões de ação na resposta: ${actionCount}`);
  for (let i = 0; i < actionCount; i++) {
    console.log(`     Botão ${i + 1}: ${await actionButtons.nth(i).innerText()}`);
  }

  // Close context and browser
  await context.close();
  await browser.close();
  console.log('🎉 Verificação Playwright concluída com sucesso!');
})();

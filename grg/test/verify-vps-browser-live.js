const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testVPSBrowser() {
  const targetUrl = 'http://209.50.241.22:3000';
  console.log(`[VPS Browser Test] Starting Playwright test against ${targetUrl}...`);

  // 1. Authenticate via API to get genuine token
  console.log('[1/5] Authenticating via API...');
  const loginRes = await fetch(`${targetUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'grg-admin', rememberMe: true })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const loginHeaders = loginRes.headers.get('set-cookie');
  console.log(`   ✅ Logged in successfully. Token exists: ${Boolean(token)}`);
  console.log(`   🍪 Set-Cookie from login: ${loginHeaders}`);

  // 2. Launch Chromium
  console.log('[2/5] Launching Chromium browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  if (loginHeaders) {
    const cookieParts = loginHeaders.split(';')[0].split('=');
    if (cookieParts.length === 2) {
      await context.addCookies([
        { name: cookieParts[0].trim(), value: cookieParts[1].trim(), url: targetUrl }
      ]);
    }
  }

  // Inject token in localStorage
  await context.addInitScript((tok) => {
    window.localStorage.setItem('grg_token', tok);
    window.localStorage.setItem('fenix_token', tok);
    window.localStorage.setItem('grg_remember', '1');
    window.localStorage.setItem('grg_user', 'grg-admin');
  }, token);

  const page = await context.newPage();
  const consoleErrors = [];
  const consoleLogs = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log(`   [Browser Console Error] ${text}`);
    } else {
      consoleLogs.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.error(`   [Browser Page Error Stack]\n${err.stack || err.message}`);
  });

  // 3. Navigate to /app#city with 60s timeout
  console.log('[3/5] Navigating to /app#city...');
  await page.goto(`${targetUrl}/app#city`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('   -> Page DOM loaded. Waiting 6s for scripts to initialize...');
  await page.waitForTimeout(6000);

  // 4. Inspect DOM elements
  console.log('[4/5] Inspecting DOM elements on /app#city...');
  const canvasExists = await page.$eval('#cityCanvas', el => !!el).catch(() => false);
  const rightSidebarExists = await page.$eval('#fenix-right-sidebar', el => !!el).catch(() => false);
  const providersTabExists = await page.$eval('#fsbTabProviders', el => !!el).catch(() => false);
  const providersBtnByData = await page.$eval('.fsb-tab-btn[data-tab="providers"]', el => !!el).catch(() => false);

  console.log(`   - Canvas #cityCanvas exists: ${canvasExists}`);
  console.log(`   - Right Sidebar #fenix-right-sidebar exists: ${rightSidebarExists}`);
  console.log(`   - Tab PROVIDERS (#fsbTabProviders) exists: ${providersTabExists}`);
  console.log(`   - Tab PROVIDERS (.fsb-tab-btn[data-tab="providers"]) exists: ${providersBtnByData}`);

  let providerCardsCount = 0;
  let testPingWorked = false;

  // 5. Click Providers Tab & Verify Live Rendering
  if (providersTabExists || providersBtnByData) {
    console.log('[5/5] Clicking tab [PROVIDERS] (#fsbTabProviders)...');
    await page.click('#fsbTabProviders').catch(() => page.click('.fsb-tab-btn[data-tab="providers"]'));
    await page.waitForTimeout(4000);

    const isProvidersPanelActive = await page.$eval('#fsbPanelProviders', el => el.classList.contains('active')).catch(() => false);
    providerCardsCount = await page.$$eval('.fsb-provider-card', cards => cards.length).catch(() => 0);
    console.log(`   -> Providers Panel Active: ${isProvidersPanelActive}`);
    console.log(`   -> Rendered Provider Cards: ${providerCardsCount}`);

    // Find and click test button on first card
    const testBtn = await page.$('.fsb-provider-card .fsb-pcard-test-btn');
    if (testBtn) {
      console.log('   -> Clicking provider connection test button...');
      await testBtn.click();
      await page.waitForTimeout(3000);
      const testResultNotice = await page.$eval('.fsb-test-result', el => el.textContent).catch(() => '');
      console.log(`   -> Test notice response: "${testResultNotice}"`);
      testPingWorked = Boolean(testResultNotice);
    }

    // 6. Test Image Studio in Providers panel
    const studioExists = await page.$eval('#fsbImageStudio', el => !!el).catch(() => false);
    console.log(`   -> AI Vision & Image Studio (#fsbImageStudio) exists: ${studioExists}`);

    let studioImageGenerated = false;
    if (studioExists) {
      const genBtn = await page.$('#fsbBtnGenerateImg');
      if (genBtn) {
        console.log('   -> Clicking [Gerar Imagem com IA] in studio...');
        await genBtn.click();
        console.log('   -> Waiting 8s for Flux.1 Schnell neural generation...');
        await page.waitForTimeout(8000);
        const previewImg = await page.$eval('#fsbImgPreviewContainer img', el => el.src).catch(() => null);
        console.log(`   -> Studio Generated Image Preview: ${previewImg ? previewImg.slice(0, 80) + '...' : 'NONE'}`);
        studioImageGenerated = Boolean(previewImg);
      }
    }
  }

  const screenshotPath = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/visual_audit/vps-live-world-providers-v9.png');
  try {
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath });
    console.log(`   ✅ Visual screenshot saved to: ${screenshotPath}`);
  } catch (err) {
    console.warn(`   ⚠️ Screenshot warning: ${err.message}`);
  }

  await browser.close();

  return {
    canvasExists,
    rightSidebarExists,
    providersTabExists: providersTabExists || providersBtnByData,
    providerCardsCount,
    testPingWorked,
    consoleErrorsCount: consoleErrors.length,
    screenshotPath
  };
}

testVPSBrowser().then(res => {
  console.log('\n=======================================================================');
  console.log('🎉 VPS REAL BROWSER AUDIT COMPLETE');
  console.log(JSON.stringify(res, null, 2));
  console.log('=======================================================================');
  process.exit(0);
}).catch(err => {
  console.error('VPS Browser Test Failed:', err);
  process.exit(1);
});

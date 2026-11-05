const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR_STACK:', err.stack));
  page.on('response', async res => {
    if (res.status() >= 400) {
      const text = await res.text().catch(() => '');
      console.log('HTTP_ERR:', res.status(), res.url(), text.slice(0, 200));
    }
  });

  // Perform login via API to get token
  const loginRes = await fetch('http://127.0.0.1:4400/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'admin' })
  });
  const { token } = await loginRes.json();
  console.log('Login token:', token ? 'OK' : 'FAIL');

  await context.addCookies([
    { name: 'fenix_session', value: token, domain: '127.0.0.1', path: '/' },
    { name: 'fenix_token', value: token, domain: '127.0.0.1', path: '/' }
  ]);

  await page.goto('http://127.0.0.1:4400/app#city', { waitUntil: 'domcontentloaded' });
  
  // Set token in localStorage
  await page.evaluate((t) => {
    localStorage.setItem('grg_token', t);
    localStorage.setItem('fenix_token', t);
  }, token);

  console.log('[TEST] Checking window.FenixSidebar...');
  await page.waitForTimeout(2000);

  const res = await page.evaluate(async (prompt) => {
    console.log('[TEST] Checking window.FenixSidebar:', !!window.FenixSidebar);
    console.log('[TEST] Checking input:', !!document.getElementById('fsbChatInput'));
    console.log('[TEST] Calling window.FenixSidebar.send...');
    window.FenixSidebar.send(prompt);
    console.log('[TEST] Sent!');
  }, 'Fazer auditoria técnica completa do projeto ZAI (ZapAI-Final), executar testes automatizados e emitir relatório de evidências com rotas e componentes.');

  // Wait for typing indicator to disappear
  console.log('[TEST] Waiting for typing indicator to detach...');
  await page.locator('.fsb-msg.bot.typing').waitFor({ state: 'detached', timeout: 30000 });
  console.log('[TEST] Typing indicator detached! Reply is rendered.');

  await page.waitForTimeout(1000);

  const path = require('path');
  const ARTIFACT_DIR = 'C:/Users/Dell/.gemini/antigravity/brain/5a8b783d-495b-4b26-a497-12249128a581';
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_zai_audit_chat_result.png') });
  console.log('✅ verified_zai_audit_chat_result.png capturada!');

  const msgs = await page.evaluate(() => {
    const list = document.querySelectorAll('#fsbChatMessages .fsb-msg');
    return Array.from(list).map(el => ({ class: el.className, text: el.innerText.slice(0, 150) }));
  });
  console.log('Messages in chat:', JSON.stringify(msgs, null, 2));

  await browser.close();
})();

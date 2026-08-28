const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.goto('http://localhost:4400/GRG-login');
  await page.fill('input[name="username"]', 'grg-admin').catch(() => page.fill('#user', 'grg-admin'));
  await page.fill('input[name="password"]', 'admin123').catch(() => page.fill('#pass', 'admin123'));
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('#fenix-unified-app', { timeout: 10000 });
  await page.waitForTimeout(3000); // let API populate
  
  // Navigate to agents
  await page.evaluate(() => window.location.hash = '#agents');
  await page.waitForTimeout(1000); // let render trigger
  await page.screenshot({ path: 'C:/Users/Dell/.gemini/antigravity-ide/brain/c6349f87-b559-43a0-9d27-df9507de9bb1/agents_habbos_optimized.png' });
  
  // Navigate to knowledge
  await page.evaluate(() => window.location.hash = '#knowledge');
  await page.waitForTimeout(1000); // let render trigger
  await page.screenshot({ path: 'C:/Users/Dell/.gemini/antigravity-ide/brain/c6349f87-b559-43a0-9d27-df9507de9bb1/knowledge_optimized.png' });
  
  await browser.close();
})();

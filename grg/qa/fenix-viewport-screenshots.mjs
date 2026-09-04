import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const token = process.env.FENIX_QA_TOKEN || (fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '');
const targets = [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [390, 844]];
const outputDir = 'qa-results/playwright';
fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [width, height] of targets) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((value) => {
    localStorage.setItem('grg_token', value);
    localStorage.setItem('fenix_token', value);
  }, token);
  const page = await context.newPage();
  await page.goto(`${baseURL}/app?qa=viewport#command`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outputDir}/command-${width}x${height}.png`, fullPage: false, timeout: 10000 });
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ ok: true, viewports: targets.length, outputDir }));

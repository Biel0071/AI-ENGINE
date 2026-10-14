import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = 'http://127.0.0.1:4400';
const token = fs.readFileSync('.session_token', 'utf8').trim();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.addCookies([ { name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' } ]);
await context.addInitScript((v) => { localStorage.setItem('grg_token', v); localStorage.setItem('fenix_token', v); }, token);
const page = await context.newPage();
await page.goto(baseURL + '/app?qa=playwright#command', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const b = page.locator('[data-nav="agents"]').first();
await b.click();
await page.waitForTimeout(500);
const res = await page.evaluate(() => {
  const vCmd = document.querySelector('#view-command');
  const vAgents = document.querySelector('#view-agents');
  return {
    vCmd: { display: getComputedStyle(vCmd).display, rect: vCmd.getBoundingClientRect() },
    vAgents: { display: getComputedStyle(vAgents).display, rect: vAgents.getBoundingClientRect(), classes: vAgents.className }
  };
});
console.log('RESULT:', JSON.stringify(res, null, 2));
await browser.close();

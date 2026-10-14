import { chromium } from 'playwright';
import fs from 'node:fs';

const baseURL = 'http://127.0.0.1:4400';
const token = fs.existsSync('.session_token') ? fs.readFileSync('.session_token', 'utf8').trim() : '';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({
  executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
await context.addInitScript((val) => {
  localStorage.setItem('grg_token', val);
  localStorage.setItem('fenix_token', val);
}, token);

const page = await context.newPage();
page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));

await page.goto(`${baseURL}/app#command`, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(4000);

const status = await page.evaluate(() => {
  return {
    liveStatus: window.FENIX?.live?.status,
    wsReadyState: window.FENIX?.ws?.readyState,
    missionsCount: window.FENIX?.live?.missions?.length,
    agentsCount: window.FENIX?.live?.agents?.length,
    jobsCount: window.FENIX?.live?.jobs?.length,
    stateMissions: window.state?.missions?.length,
    stateJobs: window.state?.jobs?.length,
  };
});
console.log('EVALUATED_STATUS:', JSON.stringify(status));

await page.screenshot({ path: 'qa-results/playwright/live-1920x1080.png' });
await browser.close();

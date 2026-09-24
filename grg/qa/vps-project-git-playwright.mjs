import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const base = 'http://209.50.241.22:3000';
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login sem sessão');
const apiResponse = execFileSync('curl.exe', ['-sS', '--max-time', '30', '-H', `authorization: Bearer ${session.token}`, '-w', '\nHTTP:%{http_code}', `${base}/api/fenix/projects/api-platform-live/git`], { encoding: 'utf8', timeout: 35000 });
console.log(JSON.stringify({ apiProbe: apiResponse.replace(/\nHTTP:\d+$/, '').slice(0, 400), http: apiResponse.match(/HTTP:(\d+)/)?.[1] }));
const connectionResponse = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', `authorization: Bearer ${session.token}`, `${base}/api/fenix/projects/api-platform-live/git/connection`], { encoding: 'utf8', timeout: 35000 }));
console.log(JSON.stringify({ connection: { supported: connectionResponse.supported, connected: connectionResponse.connected, repository: connectionResponse.repository } }));
const deploymentResponse = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', `authorization: Bearer ${session.token}`, `${base}/api/fenix/projects/api-platform-live/git/deploy`], { encoding: 'utf8', timeout: 35000 }));
console.log(JSON.stringify({ deployment: deploymentResponse.job?.status || 'NONE' }));
const projectProbe = execFileSync('curl.exe', ['-sS', '--max-time', '60', '-H', `authorization: Bearer ${session.token}`, '-w', '\nHTTP:%{http_code} TIME:%{time_total}', `${base}/api/fenix/projects`], { encoding: 'utf8', timeout: 65000 });
console.log(JSON.stringify({ projectProbe: projectProbe.slice(0, 250), timing: projectProbe.match(/HTTP:(\d+) TIME:([\d.]+)/)?.slice(1) }));
const cookieProbe = execFileSync('curl.exe', ['-sS', '--max-time', '30', '-H', `Cookie: fenix_session=${encodeURIComponent(session.token)}`, '-w', '\nHTTP:%{http_code} TIME:%{time_total}', `${base}/api/fenix/projects`], { encoding: 'utf8', timeout: 35000 });
console.log(JSON.stringify({ cookieProbe: cookieProbe.slice(0, 200), timing: cookieProbe.match(/HTTP:(\d+) TIME:([\d.]+)/)?.slice(1) }));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const errors = [];
  const network = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/api/fenix/projects')) network.push(`request ${request.method()} ${new URL(request.url()).pathname}`); });
  page.on('response', (response) => { if (response.url().includes('/api/fenix/projects')) network.push(`response ${response.status()} ${new URL(response.url()).pathname}`); });
  page.on('requestfailed', (request) => { if (request.url().includes('/api/fenix/projects')) network.push(`failed ${request.failure()?.errorText}`); });
  await page.goto(`${base}/app#projects`, { waitUntil: 'commit', timeout: 60000 });
  await page.locator('[data-nav="projects"]').first().click();
  try { await page.waitForFunction(() => document.querySelectorAll('.flp-card').length >= 2, { timeout: 90000 }); }
  catch (error) { console.log(JSON.stringify({ url: page.url(), title: await page.title(), measured: await page.locator('#flpMeasured').textContent().catch(() => null), cards: await page.locator('.flp-card').count(), network, errors })); throw error; }
  await page.locator('.flp-card[data-project-id="api-platform-live"]').click();
  await page.waitForFunction(() => document.querySelector('.flp-git-history') || [...document.querySelectorAll('.flp-panel .flp-empty')].some((node) => node.textContent && !node.textContent.includes('Lendo repositório Git')), { timeout: 70000 });
  const git = await page.evaluate(() => ({
    heading: [...document.querySelectorAll('.flp-panel h3')].some((node) => node.textContent.includes('Git')),
    history: [...document.querySelectorAll('.flp-git-history p')].map((node) => node.textContent),
    facts: [...document.querySelectorAll('.flp-panel .flp-fact')].map((node) => node.textContent),
    error: [...document.querySelectorAll('.flp-panel .flp-empty')].map((node) => node.textContent).find((line) => /falha|erro|indisponível/i.test(line)),
    deployButton: [...document.querySelectorAll('.flp-panel button')].some((node) => node.textContent.includes('Build e deploy da API')),
    dashboardLink: Boolean(document.querySelector('.flp-actions a[href*="8081"]')),
    publicKeyVisible: Boolean(document.querySelector('.flp-git-public-key')),
  }));
  const screenshot = path.resolve('qa-results/playwright/vps-project-git-live.png');
  await fs.mkdir(path.dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true });
  const ok = git.heading && git.history.length > 0 && git.facts.some((line) => line.includes('Remote')) && git.deployButton && git.dashboardLink && git.publicKeyVisible && !git.error && errors.length === 0;
  console.log(JSON.stringify({ ok, ...git, errors, screenshot }));
  if (!ok) process.exitCode = 2;
} finally {
  if (browser) await browser.close();
}

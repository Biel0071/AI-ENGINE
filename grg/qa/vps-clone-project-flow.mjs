import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';

const base = 'http://209.50.241.22:3000';
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login sem sessão');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(session.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, session.token);
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/app#projects`, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.flp-card').length >= 2, null, { timeout: 90000 });
  if (!(await page.locator('.flp-card-title').filter({ hasText: 'API Platform GitHub' }).count())) {
    await page.locator('#flpClone input[name="name"]').fill('API Platform GitHub');
    await page.locator('#flpClone input[name="repository"]').fill('https://github.com/Biel0071/API-PLATAFORM.git');
    await page.locator('#flpClone button').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.flp-card-title')].some((node) => node.textContent === 'API Platform GitHub'), null, { timeout: 200000 });
  }
  const projectId = await page.locator('.flp-card').filter({ hasText: 'API Platform GitHub' }).getAttribute('data-project-id');
  await page.locator(`.flp-card[data-project-id="${projectId}"]`).click();
  await page.getByRole('button', { name: 'Abrir na IDE' }).click();
  await page.waitForFunction((id) => document.getElementById('fenixIdeProject')?.value === id, projectId, { timeout: 60000 });
  console.log(JSON.stringify({ ok: errors.length === 0, projectId, ideProject: await page.locator('#fenixIdeProject').inputValue(), errors }));
  if (errors.length) process.exitCode = 2;
} finally { await browser.close(); }

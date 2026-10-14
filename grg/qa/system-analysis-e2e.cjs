'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const output = path.join(__dirname, '../qa-results/system-analysis');
(async () => {
  const { baseURL, token } = JSON.parse(await fs.readFile(path.join(output, 'session.json'), 'utf8'));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_CHROMIUM_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'fenix_session', value: token, url: baseURL, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript(value => localStorage.setItem('grg_token', value), token);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    assert.equal((await fetch(baseURL + '/api/system-analyses')).status, 401);
    await page.goto(baseURL + '/app#command', { waitUntil: 'domcontentloaded' });
    await page.locator('#systemAnalysisButton').click();
    await page.locator('#systemAnalysisDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[name=tests]').isDisabled(), true);
    await page.locator('[name=mode][value=deep]').check();
    assert.equal(await page.locator('[name=tests]').isEnabled(), true);
    await page.locator('[name=mode][value=general]').check();
    for (const format of ['md', 'html', 'pdf']) await page.locator(`[name=format][value=${format}]`).check();
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mobile.png') });
    const bounds = await page.locator('#systemAnalysisDialog').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const created = page.waitForResponse(r => r.url().endsWith('/api/system-analyses') && r.request().method() === 'POST');
    await page.locator('#analysisForm button[type=submit]').click();
    const response = await created; assert.equal(response.status(), 202); const run = await response.json();
    await page.locator('#analysisClose').click();
    const headers = { authorization: `Bearer ${token}` };
    let status;
    // Capture the real canonical shell, then exercise cancellation and complete all exports.
    for (let i = 0; i < 120; i++) {
      status = await fetch(`${baseURL}/api/system-analyses/${run.id}`, { headers }).then(r => r.json());
      if (status.progress?.completed >= 1 || ['FAILED', 'PARTIAL', 'COMPLETED'].includes(status.status)) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    await page.locator('#systemAnalysisButton').click();
    const cancel = page.getByRole('button', { name: 'Cancelar análise' });
    if (await cancel.isVisible()) await cancel.click();
    for (let i = 0; i < 120; i++) {
      status = await fetch(`${baseURL}/api/system-analyses/${run.id}`, { headers }).then(r => r.json());
      if (['CANCELLED', 'PARTIAL', 'COMPLETED', 'FAILED'].includes(status.status)) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    assert.ok(['CANCELLED', 'PARTIAL', 'COMPLETED'].includes(status.status), JSON.stringify(status.errors));
    for (const name of ['relatorio.md', 'analise.zip', 'relatorio.html', 'relatorio.pdf', 'contexto-ia.md', 'contexto-ia.json']) {
      assert.ok(status.artifacts.some(a => a.name === name), `${name}: ${JSON.stringify(status.errors)}`);
      const download = await fetch(`${baseURL}/api/system-analyses/${run.id}/artifacts/${name}`, { headers }); assert.equal(download.status, 200);
      const bytes = Buffer.from(await download.arrayBuffer()); assert.ok(bytes.length > 30);
      if (name.endsWith('.pdf')) assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
      if (name.endsWith('.zip')) assert.equal(bytes.readUInt32LE(0), 0x04034b50);
      if (name.endsWith('.json')) JSON.parse(bytes);
      await fs.writeFile(path.join(output, name), bytes);
    }
    assert.equal((await fetch(`${baseURL}/api/system-analyses/${run.id}/artifacts/relatorio.pdf`)).status, 401);
    await page.screenshot({ path: path.join(output, 'completed.png') });
    const result = { runId: run.id, status: status.status, progress: status.progress, artifacts: status.artifacts.map(a => a.name), pageErrors: errors, featureErrors: errors.filter(e => /system-analysis/i.test(e)) };
    await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
    assert.equal(result.featureErrors.length, 0); console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });

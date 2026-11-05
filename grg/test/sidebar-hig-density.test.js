'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const path = require('node:path');

test('Fênix sidebar keeps conversation primary and folds secondary tools into accessible disclosures', async (t) => {
  const app = express();
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const conversationPayloads = [];
  await page.addInitScript(() => localStorage.setItem('grg_token', 'local-test-token-123'));
  await page.route('**/api/v2/conversation', async route => {
    conversationPayloads.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lane: 'FAST_LANE', conversationId: 'conversation-test', response: 'Resposta contextual de teste', model: 'test-provider-model' }) });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.FenixSidebar && document.getElementById('fsbCompactBtn')));
  await page.evaluate(() => window.FenixSidebar.open());

  const sidebar = page.locator('#fenix-right-sidebar');
  await page.locator('#fsbContextTools').waitFor();
  await page.locator('#fsbCommandDisclosure').waitFor();
  assert.equal(await page.locator('#fsbContextTools').evaluate(node => node.open), false, 'project/memory tools start collapsed');
  assert.equal(await page.locator('#fsbCommandDisclosure').evaluate(node => node.open), false, 'slash commands start collapsed');
  assert.equal(await page.locator('#fsbChatMessages [data-fsb-welcome]').count(), 1, 'chat opens with a concise welcome state');
  assert.equal(await page.locator('#fsbChatMessages [onclick*="fenixSidebarAction"]').count(), 0, 'the welcome state does not expose unrelated task shortcuts');
  assert.equal(await page.locator('#fsbChatMessages').getByText('Sugestões para hoje').count(), 0, 'the chat does not show empty placeholder suggestions');
  const chipCount = await sidebar.locator('.fsb-chip').count();
  assert.equal(chipCount, 4, `contextual actions remain available inside their disclosure (${await page.locator('#fsbChipsRow').innerText()})`);
  assert.equal(await page.locator('#fsbCommandCount').textContent(), '4', 'the disclosure count reflects the actual contextual actions');
  assert.ok(await page.locator('#fsbChatInput').isVisible(), 'the normal message composer remains available');
  await page.locator('#fsbCommandDisclosure > summary').click();
  assert.equal(await page.locator('#fsbCommandDisclosure').evaluate(node => node.open), true);
  await page.locator('#fsbQuickActionsCustomizeBtn').click();
  await page.locator('#fsbQuickActionsEditor').waitFor({ state: 'visible' });
  await page.locator('#fsbQuickActionsEditor input[name="label"]').fill('Minha ação');
  await page.locator('#fsbQuickActionsEditor input[name="command"]').fill('Resuma o estado deste projeto');
  await page.locator('#fsbQuickActionsEditor button[type="submit"]').click();
  assert.equal(await sidebar.locator('.fsb-chip').count(), 5, 'an operator can add a contextual quick action');
  assert.ok(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('fenix.chat.quickActions.'))), 'quick actions are persisted in this browser');
  await page.locator('#fsbQuickActionsEditor [data-action="remove"]').last().click();
  assert.equal(await sidebar.locator('.fsb-chip').count(), 4, 'an operator can remove a quick action');
  await page.evaluate(() => window.fenixCopilot.sendMessage('boa noite'));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.fenixCopilot.sendMessage('tudo bem?'));
  await page.waitForResponse(response => response.url().includes('/api/v2/conversation'));
  assert.equal(conversationPayloads.length, 1, 'two fast messages produce one provider request');
  assert.equal(conversationPayloads[0].message, 'boa noite\ntudo bem?', 'the provider receives both messages as one contextual turn');
  assert.equal(conversationPayloads[0].conversationId, null, 'the first turn starts the server conversation');
  const secondResponse = page.waitForResponse(response => response.url().includes('/api/v2/conversation'));
  await page.evaluate(() => window.fenixCopilot.sendMessage('e você?'));
  await secondResponse;
  assert.equal(conversationPayloads[1].conversationId, 'conversation-test', 'later turns reuse the server conversation ID');
  if (process.env.FENIX_SIDEBAR_DENSITY_SCREENSHOT) {
    await page.screenshot({ path: process.env.FENIX_SIDEBAR_DENSITY_SCREENSHOT, fullPage: false });
  }

  await page.locator('#fsbContextTools > summary').click();
  assert.equal(await page.locator('#fsbQuickReaBtn').isVisible(), true, 'quick tools remain reachable when expanded');
  await page.locator('.fsb-tab-btn[data-tab="logs"]').click();
  assert.equal(await page.locator('.fsb-tab-btn[data-tab="logs"]').getAttribute('aria-pressed'), 'true', 'selected sidebar tab is announced');
  await page.locator('.fsb-tab-btn[data-tab="chat"]').click();
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await sidebar.evaluate(node => ({ width: node.getBoundingClientRect().width, scroll: node.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, `sidebar overflows at ${width}px: ${JSON.stringify(dimensions)}`);
  }
});

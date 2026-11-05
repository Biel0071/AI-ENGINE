const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '../public');

test('mission responses render as identified missions without fabricated job telemetry', async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let responsePayload = {
    lane: 'MISSION_LANE',
    response: 'Preparei a proposta e aguardo sua confirmação.',
    mission: { id: 'mission-real-42', status: 'AWAITING_APPROVAL', title: 'Revisar login', jobId: null },
    actions: [{ type: 'confirm_mission', missionId: 'mission-real-42', label: 'Confirmar missão' }],
  };
  await page.route('**/api/v2/conversation', (route) => route.request().method() === 'POST'
    ? route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responsePayload),
    })
    : route.continue());
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#city`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.FenixSidebar?.send === 'function', null, { timeout: 15000 });

  const conversationResponse = page.waitForResponse((response) => response.request().method() === 'POST'
    && response.url().includes('/api/v2/conversation'), { timeout: 8000 });
  await page.evaluate(() => window.FenixSidebar.send('Proponha uma revisão do login'));
  await conversationResponse;
  await page.waitForFunction(() => document.getElementById('fsbChatMessages')?.innerText.includes('Preparei a proposta'), null, { timeout: 8000 });

  const rendered = await page.evaluate(() => {
    const container = document.querySelector('#fsbChatMessages');
    if (!container) return { text: '', fullText: 'chat container missing', jobCards: 0, progressBars: 0, tokens: false, action: null };
    const card = container.querySelector('.fsb-mission-card');
    return {
    text: card?.innerText || '',
    fullText: container.innerText,
    jobCards: document.querySelectorAll('.fsb-job-card').length,
    progressBars: card?.querySelectorAll('.fsb-job-progress-section').length || 0,
    tokens: /tokens|FAST_LANE|qwen2\.5:3b/i.test(container.innerText),
    action: container.querySelector('[data-act]')?.getAttribute('data-act') || null,
    };
  });
  assert.match(rendered.text, /mission-real-42/, `mission card missing; chat text: ${JSON.stringify(rendered.fullText)}`);
  assert.match(rendered.text, /AWAITING_APPROVAL/);
  assert.match(rendered.text, /Revisar login/);
  assert.equal(rendered.jobCards, 0, 'a mission must not be presented as a BullMQ job');
  assert.equal(rendered.progressBars, 0, 'mission proposals must not show job progress');
  assert.equal(rendered.tokens, false, 'no provider or token data may be invented for a mission');
  assert.match(rendered.action || '', /confirm_mission/);
  const evidenceDir = path.resolve(__dirname, '../docs/visual-evidence/2026-10-20');
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const card = document.querySelector('.fsb-mission-card');
      const sidebar = document.getElementById('fenix-right-sidebar');
      if (!card || !sidebar) return null;
      const cardRect = card.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      return {
        cardWidth: card.clientWidth,
        contentWidth: card.scrollWidth,
        left: cardRect.left,
        right: cardRect.right,
        sidebarLeft: sidebarRect.left,
        sidebarRight: sidebarRect.right,
      };
    });
    assert.ok(geometry, `mission card or sidebar missing at ${viewport.width}px`);
    assert.ok(geometry.contentWidth <= geometry.cardWidth + 1, `mission content overflows at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.left >= geometry.sidebarLeft && geometry.right <= geometry.sidebarRight, `mission card escapes sidebar at ${viewport.width}px: ${JSON.stringify(geometry)}`);
    await page.screenshot({ path: path.join(evidenceDir, `sidebar-mission-card-${viewport.width}-after.png`), fullPage: false });
  }

  await page.evaluate(() => {
    const conversations = JSON.parse(localStorage.getItem('fenix_chat_conversations') || '[]');
    for (const conversation of conversations) {
      for (const message of conversation.messages || []) {
        if (message.data?.mission) message.type = 'job'; // emulate a conversation saved by the previous renderer
      }
    }
    localStorage.setItem('fenix_chat_conversations', JSON.stringify(conversations));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.fsb-mission-card'), null, { timeout: 15000 });
  assert.equal(await page.locator('.fsb-job-card').count(), 0, 'legacy MISSION_LANE history must not return as a fake job after reload');

  responsePayload = { lane: 'JOB_LANE', response: 'Execução solicitada, mas sem identificador.', job: { status: 'QUEUED' } };
  const missingJobResponse = page.waitForResponse((response) => response.request().method() === 'POST'
    && response.url().includes('/api/v2/conversation'), { timeout: 8000 });
  await page.evaluate(() => window.FenixSidebar.send('Execute o plano'));
  await missingJobResponse;
  await page.waitForFunction(() => document.getElementById('fsbChatMessages')?.innerText.includes('ID de job real'), null, { timeout: 8000 });
  assert.equal(await page.locator('.fsb-job-card').count(), 0, 'JOB_LANE without a real job ID must not produce a card or queue actions');
});

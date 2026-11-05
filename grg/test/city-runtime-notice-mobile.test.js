'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const { chromium } = require('playwright');

test('mobile City runtime failure stays compact and keeps a usable retry', async (t) => {
  const app = express();
  app.get('/notice.html', (_req, res) => res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/fenix-hig-system.css">
    <main id="view-city"><div class="city-runtime-notice" role="status" aria-live="polite">
      <span id="cityRuntimeLoadMessage">Sessão expirada ou sem acesso. Entre novamente e tente carregar a Cidade.</span>
      <button type="button">Tentar novamente</button>
    </div></main>`));
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
  await page.goto(`http://127.0.0.1:${server.address().port}/notice.html`, { waitUntil: 'load' });
  const notice = await page.locator('.city-runtime-notice').evaluate((node) => {
    const message = getComputedStyle(node.querySelector('#cityRuntimeLoadMessage'));
    const button = node.querySelector('button').getBoundingClientRect();
    const box = node.getBoundingClientRect();
    return { height: box.height, width: box.width, left: box.left, right: box.right, messageWhiteSpace: message.whiteSpace, messageOverflow: message.textOverflow, buttonHeight: button.height };
  });
  assert.ok(notice.height <= 58, `mobile runtime notice should not cover the map: ${JSON.stringify(notice)}`);
  assert.equal(notice.messageWhiteSpace, 'nowrap', `message should use a compact single line: ${JSON.stringify(notice)}`);
  assert.equal(notice.messageOverflow, 'ellipsis', `full error remains available while its visual line is compact: ${JSON.stringify(notice)}`);
  assert.ok(notice.left >= 8 && notice.right <= 367, `notice stays within the viewport: ${JSON.stringify(notice)}`);
  assert.ok(notice.buttonHeight >= 40, `retry remains easy to tap: ${JSON.stringify(notice)}`);
});

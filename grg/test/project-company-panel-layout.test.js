'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/project-hub-live.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'public/project-hub-live.css'), 'utf8');
const start = source.indexOf('  function renderCompanyTab');
const end = source.indexOf('\n  function renderApisTab', start);
const renderer = source.slice(start, end);

test('company project panel fits supported viewports and shows unavailable metrics honestly', async (t) => {
  const app = express();
  app.get('/fixture', (_req, res) => res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles}</style></head><body><main class="fenix-live-projects"><section id="company" class="flp-detail"></section></main></body></html>`));
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

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const evidenceDir = path.join(root, 'docs/visual-evidence/2026-10-21');
  fs.mkdirSync(evidenceDir, { recursive: true });

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${server.address().port}/fixture`);
    const result = await page.evaluate(({ rendererSource }) => {
      const element = (tag, className, content) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined) node.textContent = content == null || content === '' ? '—' : String(content);
        return node;
      };
      const text = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);
      const row = (label, value) => {
        const line = element('div', 'flp-fact');
        line.append(element('span', '', label), element('strong', '', value));
        return line;
      };
      const renderCompanyTab = new Function('element', 'row', 'text', 'window', `${rendererSource}; return renderCompanyTab;`)(element, row, text, window);
      renderCompanyTab(document.getElementById('company'), {
        id: 'qa-company', companyId: 'qa-company', name: 'Projeto QA',
        companyName: 'ZAP AI CRM — atendimento e gestão de vendas pelo WhatsApp', status: 'ACTIVE', framework: 'Node.js / React'
      }, { activeAgents: [] });
      const panel = document.querySelector('#company .flp-panel');
      const panelBounds = panel.getBoundingClientRect();
      const rows = [...panel.querySelectorAll('.flp-fact')].map((entry) => ({
        text: entry.innerText,
        right: entry.getBoundingClientRect().right,
        left: entry.getBoundingClientRect().left,
      }));
      return {
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        panelWidth: panelBounds.width,
        buttons: [...panel.querySelectorAll('button')].map((button) => ({ text: button.innerText, width: button.getBoundingClientRect().width })),
        rows,
      };
    }, { rendererSource: renderer });

    assert.equal(result.documentWidth, viewport.width, `horizontal overflow at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.ok(result.panelWidth > 0 && result.panelWidth <= viewport.width, `panel outside viewport at ${viewport.width}px: ${JSON.stringify(result)}`);
    assert.ok(result.rows.some((entry) => entry.text.includes('Não medida')), 'latency must remain explicitly unmeasured');
    assert.ok(result.rows.some((entry) => entry.text.includes('Não informada')), 'autonomy must remain explicitly unavailable');
    assert.ok(result.buttons.every((button) => button.width >= 40), `small action target at ${viewport.width}px: ${JSON.stringify(result.buttons)}`);
    await page.screenshot({ path: path.join(evidenceDir, `project-company-panel-${viewport.width}-after.png`), fullPage: true });
    await page.close();
  }
});

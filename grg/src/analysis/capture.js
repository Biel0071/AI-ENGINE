'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { redact } = require('./evidence');

async function launchBrowser() {
  const { chromium } = require('playwright');
  const executablePath = process.env.FENIX_CHROMIUM_PATH;
  return chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
}
// Only explicit navigation contracts can be clicked. Never crawl arbitrary buttons.
const NAV = '[role="tab"], [data-analysis-nav], [data-agent-id], [data-mission-id], [data-job-id], a[href^="#"]';
async function discover(page) {
  return page.locator(NAV).evaluateAll((nodes) => nodes.filter(n => n.getClientRects().length && !n.closest('#systemAnalysisDialog,nav,header,aside,.sidebar') && !n.closest('[data-analysis-ignore]')).map(n => {
    const attribute = ['data-analysis-nav', 'data-agent-id', 'data-mission-id', 'data-job-id'].find(a => n.hasAttribute(a));
    if (attribute) return { selector: `[${attribute}=${JSON.stringify(n.getAttribute(attribute))}]`, label: (n.textContent || '').trim().slice(0, 180), recordId: n.getAttribute(attribute) };
    if (n.id) return { selector: `[id=${JSON.stringify(n.id)}]`, label: (n.textContent || '').trim().slice(0, 180) };
    if (n.getAttribute('href')) return { selector: `a[href=${JSON.stringify(n.getAttribute('href'))}]`, label: (n.textContent || '').trim().slice(0, 180) };
    return null;
  }).filter(Boolean));
}
async function mask(page) {
  const secrets = Object.entries(process.env).filter(([k, v]) => /password|secret|token|credential|api.?key/i.test(k) && v.length >= 8).map(([, v]) => v);
  await page.evaluate((knownSecrets) => {
    const sensitive = /password|secret|token|credential|api.?key|authorization|cookie|senha|segredo|chave/i;
    for (const n of document.querySelectorAll('input,textarea,[data-secret],[data-sensitive],pre,code')) {
      if (n.matches('input,textarea,pre,code,[data-secret],[data-sensitive]') || sensitive.test([n.id, n.name, n.getAttribute('aria-label')].join(' '))) {
        n.style.setProperty('visibility', 'hidden', 'important');
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.parentElement?.closest('script,style')) continue;
      n.textContent = n.textContent.replace(/\b(?:sk-[\w-]{10,}|gh[pousr]_[\w]{15,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[REMOVIDO]').replace(/((?:password|secret|token|api[_-]?key|senha)\s*[=:]\s*)[^\s,;]+/gi, '$1[REMOVIDO]');
      for (const secret of knownSecrets) n.textContent = n.textContent.split(secret).join('[REMOVIDO]');
      if (sensitive.test(n.textContent) && n.parentElement?.nextElementSibling) n.parentElement.nextElementSibling.style.setProperty('visibility', 'hidden', 'important');
    }
  }, secrets);
}
function targetId(target) { return crypto.createHash('sha256').update(JSON.stringify([target.projectId, target.route, target.actions || []])).digest('hex').slice(0, 24); }
async function capture({ app, run, target, baseURL, directory, browserFactory = launchBrowser, source = null }) {
  const browser = await browserFactory();
  let token;
  const errors = [];
  try {
    if (source && source.readOnly !== true) throw new Error('Projeto exige contrato de captura somente leitura.');
    token = source ? (process.env[source.bearerEnv] || '') : await app.auth.createAnalysisSession(run.tenantId, run.createdBy, run.id);
    if (source?.bearerEnv && !token) throw new Error('Credencial de leitura do projeto indisponível.');
    if (source) baseURL = source.baseURL;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', acceptDownloads: false });
    const origin = new URL(baseURL).origin;
    await context.route('**/*', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      if (url.origin !== origin || !['GET', 'HEAD'].includes(request.method()) || /(?:logout|terminal|\/source|\/asset|\/fs|\/exec|\/download)/i.test(url.pathname)) return route.abort();
      return route.continue({ headers: { ...request.headers(), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    });
    if (!source) {
      await context.addCookies([{ name: 'fenix_session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }]);
      await context.addInitScript(value => { localStorage.setItem('grg_token', value); localStorage.setItem('fenix_token', value); window.WebSocket = class { close() {} addEventListener() {} }; }, token);
    }
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(redact(e.message)));
    await page.goto(new URL(target.route, baseURL).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (/login/i.test(new URL(page.url()).pathname)) throw new Error('Sessão de captura não alcançou a tela autenticada.');
    const view = target.view ? page.locator(`#view-${target.view}`) : null;
    if (view && await view.count()) await view.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    for (const selector of target.actions || []) {
      const element = page.locator(selector).first();
      await element.waitFor({ state: 'visible', timeout: 8000 });
      await element.click({ timeout: 8000 });
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    }
    const discovered = await discover(page);
    // Explicit pagination is discovered before masking. Replaying its action chain is deterministic.
    for (const selector of ['[data-analysis-next]:not([disabled])', 'button[aria-label="Próxima página"]:not([disabled])', 'button[aria-label="Next page"]:not([disabled])']) {
      if (await page.locator(selector).first().isVisible().catch(() => false)) discovered.push({ selector, label: 'Próxima página', pagination: true });
    }
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(discovered.filter(x => x.recordId).map(x => x.recordId).sort())).digest('hex');
    await mask(page);
    await fs.mkdir(path.join(directory, 'images'), { recursive: true });
    const images = [];
    const save = async suffix => { const name = `images/${target.id}${suffix}.png`; await page.screenshot({ path: path.join(directory, name), fullPage: true, timeout: 30000 }); images.push(name); };
    await save('');
    const panels = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(n => n.getClientRects().length && n.clientHeight > 100 && n.scrollHeight > n.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(n).overflowY)).map((n, i) => { n.setAttribute('data-analysis-scroll', String(i)); return { id: i, height: n.clientHeight, total: n.scrollHeight }; }));
    for (const panel of panels) {
      for (let top = panel.height; top < panel.total; top += panel.height) {
        await page.locator(`[data-analysis-scroll="${panel.id}"]`).evaluate((n, y) => { n.scrollTop = y; }, top);
        await save(`-panel-${panel.id}-${top}`);
      }
      await page.locator(`[data-analysis-scroll="${panel.id}"]`).evaluate(n => { n.scrollTop = 0; });
    }
    return { status: 'capturado', capturedAt: new Date().toISOString(), images, discovered, fingerprint, errors, url: redact(page.url()) };
  } finally { await browser.close(); if (token && !source) await app.auth.logoutAsync(token); }
}
module.exports = { capture, targetId, launchBrowser, mask };

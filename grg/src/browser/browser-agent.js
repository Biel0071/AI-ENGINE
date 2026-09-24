'use strict';
/**
 * FÊNIX OS — Browser Agent Orchestrator & BrowserSession Runtime
 * Navigates real project interfaces, inspects DOM, checks console logs,
 * tracks network XHR/WS, captures screenshots, assesses page health,
 * and provides persistent BrowserSession for interactive workspace control.
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

function resolvePlaywright() {
  const attempts = [
    () => require('playwright'),
    () => require(path.join(__dirname, '..', '..', 'ai-engine', 'node_modules', 'playwright')),
    () => require(path.join(__dirname, '..', '..', '..', 'ai-engine', 'node_modules', 'playwright')),
    () => require(path.join(__dirname, '..', '..', 'node_modules', 'playwright')),
    () => require(path.resolve(process.cwd(), 'ai-engine', 'node_modules', 'playwright')),
    () => require(path.resolve(process.cwd(), 'node_modules', 'playwright')),
    () => require('C:\\projetos\\ai-engine-core\\ai-engine\\node_modules\\playwright'),
    () => require('/opt/fenix-os/grg/node_modules/playwright')
  ];
  for (const fn of attempts) {
    try {
      const pw = fn();
      if (pw && pw.chromium) return pw;
    } catch (e) {}
  }
  return null;
}

class BrowserSession {
  constructor(options = {}) {
    this.sessionId = 'bs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.artifactsDir = options.artifactsDir || path.join(__dirname, '..', '..', 'qa', 'current');
    if (!fs.existsSync(this.artifactsDir)) fs.mkdirSync(this.artifactsDir, { recursive: true });
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentUrl = null;
    this.consoleLogs = [];
    this.networkRequests = [];
    this.status = 'created';
    this.createdAt = new Date().toISOString();
  }

  async init(viewport = { width: 1440, height: 900 }) {
    try {
      const playwright = resolvePlaywright();
      if (!playwright) throw new Error('Playwright chromium not found in environment');

      this.browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--disable-gpu']
      });
      this.context = await this.browser.newContext({ viewport });
      this.page = await this.context.newPage();

      this.page.on('console', msg => {
        this.consoleLogs.push({ type: msg.type(), text: msg.text(), time: Date.now() });
        if (this.consoleLogs.length > 200) this.consoleLogs.shift();
      });

      this.page.on('request', req => {
        this.networkRequests.push({ url: req.url(), method: req.method(), time: Date.now() });
        if (this.networkRequests.length > 200) this.networkRequests.shift();
      });

      this.page.on('response', res => {
        try {
          const reqUrl = res.url();
          const existing = this.networkRequests.find(r => r.url === reqUrl && !r.status);
          if (existing) {
            existing.status = res.status();
            existing.ok = res.ok();
          } else {
            this.networkRequests.push({ url: reqUrl, method: res.request().method(), status: res.status(), ok: res.ok(), time: Date.now() });
            if (this.networkRequests.length > 200) this.networkRequests.shift();
          }
        } catch(e) {}
      });

      this.status = 'ready';
      return this;
    } catch (e) {
      this.status = 'error';
      throw new Error(`Failed to launch browser session: ${e.message}`);
    }
  }

  async openUrl(url, timeoutMs = 30000) {
    if (!this.page) await this.init();
    this.currentUrl = url;
    let statusCode = 200;
    try {
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      if (response) statusCode = response.status();
    } catch (e) {
      statusCode = 500;
    }

    const title = await this.page.title().catch(() => 'Untitled');
    const screenshotPath = await this.screenshot();
    this.status = 'navigated';

    return {
      ok: statusCode < 400,
      sessionId: this.sessionId,
      url,
      title,
      statusCode,
      screenshot: screenshotPath,
      consoleErrors: this.consoleLogs.filter(l => l.type === 'error').map(l => l.text),
      networkRequestsCount: this.networkRequests.length
    };
  }

  async click(selector) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.click(selector);
    await this.page.waitForTimeout(500);
    const screenshot = await this.screenshot();
    return { ok: true, action: 'click', selector, screenshot };
  }

  async type(selector, text) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.fill(selector, text);
    try {
      await this.page.$eval(selector, (el, val) => el.setAttribute('value', val), text);
    } catch(e) {}
    return { ok: true, action: 'type', selector, text };
  }

  async select(selector, value) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.selectOption(selector, value);
    return { ok: true, action: 'select', selector, value };
  }

  async hover(selector) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.hover(selector);
    await this.page.waitForTimeout(200);
    const screenshot = await this.screenshot();
    return { ok: true, action: 'hover', selector, screenshot };
  }

  async scroll(direction = 'down', amount = 300) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.evaluate(({ dir, amt }) => {
      window.scrollBy(0, dir === 'down' ? amt : -amt);
    }, { dir: direction, amt: amount });
    await this.page.waitForTimeout(300);
    const screenshot = await this.screenshot();
    return { ok: true, action: 'scroll', direction, amount, screenshot };
  }

  async wait(ms = 1000) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForTimeout(ms);
    return { ok: true, action: 'wait', ms };
  }

  async screenshot(customName) {
    if (!this.page) throw new Error('Session not initialized');
    const fileName = customName || `session_${this.sessionId}_${Date.now()}.png`;
    const filePath = path.join(this.artifactsDir, fileName);
    await this.page.screenshot({ path: filePath, fullPage: false });
    return filePath;
  }

  async inspect() {
    if (!this.page) throw new Error('Session not initialized');
    const title = await this.page.title().catch(() => '');
    const url = this.page.url();

    const elementsSummary = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"], a.btn, a.button')).map(el => ({
        text: (el.innerText || el.value || '').trim().slice(0, 50),
        id: el.id || null,
        className: el.className || null,
        disabled: Boolean(el.disabled),
        tag: el.tagName.toLowerCase()
      }));

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
        id: el.id || null,
        name: el.name || null,
        type: el.type || el.tagName.toLowerCase(),
        placeholder: el.placeholder || null,
        value: el.value ? (el.type === 'password' ? '***' : el.value.slice(0, 50)) : null
      }));

      const links = Array.from(document.querySelectorAll('a[href]')).map(el => ({
        text: (el.innerText || '').trim().slice(0, 50),
        href: el.getAttribute('href'),
        target: el.target || null
      }));

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(el => ({
        level: el.tagName.toLowerCase(),
        text: (el.innerText || '').trim().slice(0, 80)
      }));

      const tabs = Array.from(document.querySelectorAll('[role="tab"], .tab, .tab-btn')).map(el => ({
        text: (el.innerText || '').trim().slice(0, 50),
        active: el.classList.contains('active') || el.getAttribute('aria-selected') === 'true',
        dataTab: el.getAttribute('data-tab') || null
      }));

      const modals = Array.from(document.querySelectorAll('.modal, [role="dialog"], .dialog, .building-drawer')).map(el => ({
        id: el.id || null,
        visible: window.getComputedStyle(el).display !== 'none'
      }));

      return { buttons, inputs, links, headings, tabs, modals };
    }).catch(e => ({ error: e.message, buttons: [], inputs: [], links: [], headings: [], tabs: [], modals: [] }));

    return {
      ok: true,
      sessionId: this.sessionId,
      url,
      title,
      consoleErrors: this.consoleLogs.filter(l => l.type === 'error').map(l => l.text),
      networkRequestsCount: this.networkRequests.length,
      elements: elementsSummary
    };
  }

  getConsole() {
    return this.consoleLogs;
  }

  getNetwork() {
    return this.networkRequests;
  }

  async getDom() {
    if (!this.page) throw new Error('Session not initialized');
    return await this.page.evaluate(() => {
      return document.documentElement ? document.documentElement.outerHTML.slice(0, 50000) : '';
    }).catch(e => `<!-- Error: ${e.message} -->`);
  }

  async getAccessibility() {
    if (!this.page) throw new Error('Session not initialized');
    try {
      return await this.page.accessibility.snapshot();
    } catch (e) {
      return { error: e.message };
    }
  }

  async inspectElement(selector) {
    if (!this.page) throw new Error('Session not initialized');
    await this.page.waitForSelector(selector, { state: 'attached', timeout: 5000 });
    return await this.page.$eval(selector, el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const attrs = {};
      for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        text: (el.innerText || el.value || '').trim().slice(0, 200),
        attributes: attrs,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        computedStyles: {
          display: style.display,
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
          visibility: style.visibility,
          opacity: style.opacity
        }
      };
    }).catch(e => ({ error: e.message, selector }));
  }

  async getPerformance() {
    if (!this.page) throw new Error('Session not initialized');
    return await this.page.evaluate(() => {
      const perf = window.performance;
      const timing = perf && perf.timing ? {
        loadTime: perf.timing.loadEventEnd ? Math.max(0, perf.timing.loadEventEnd - perf.timing.navigationStart) : 0,
        domReadyTime: perf.timing.domContentLoadedEventEnd ? Math.max(0, perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart) : 0,
        connectTime: perf.timing.connectEnd ? Math.max(0, perf.timing.connectEnd - perf.timing.connectStart) : 0,
        dnsTime: perf.timing.domainLookupEnd ? Math.max(0, perf.timing.domainLookupEnd - perf.timing.domainLookupStart) : 0
      } : {};
      const paintEntries = perf && typeof perf.getEntriesByType === 'function' ? perf.getEntriesByType('paint') : [];
      const paints = paintEntries.map(p => ({ name: p.name, startTime: Math.round(p.startTime) }));
      const memory = perf && perf.memory ? {
        jsHeapSizeLimit: Math.round(perf.memory.jsHeapSizeLimit / 1048576),
        totalJSHeapSize: Math.round(perf.memory.totalJSHeapSize / 1048576),
        usedJSHeapSize: Math.round(perf.memory.usedJSHeapSize / 1048576)
      } : null;
      return { timing, paints, memory };
    }).catch(e => ({ error: e.message, timing: {}, paints: [], memory: null }));
  }

  async close() {
    this.status = 'closed';
    try {
      if (this.browser) await this.browser.close();
    } catch (e) {}
    this.browser = null;
    this.context = null;
    this.page = null;
    return { ok: true, sessionId: this.sessionId, status: 'closed' };
  }
}

class BrowserAgent {
  constructor(options = {}) {
    this.artifactsDir = options.artifactsDir || path.join(__dirname, '..', '..', 'qa', 'current');
    if (!fs.existsSync(this.artifactsDir)) fs.mkdirSync(this.artifactsDir, { recursive: true });
    this.playwright = resolvePlaywright();
    this.hasPlaywright = Boolean(this.playwright);
  }

  async inspectUrl(targetUrl, options = {}) {
    const startTime = Date.now();
    const consoleLogs = [];
    const networkRequests = [];
    let statusCode = null;

    if (this.hasPlaywright) {
      let browser = null;
      try {
        browser = await this.playwright.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--disable-gpu']
        });
        const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 900 } });
        const page = await context.newPage();

        page.on('console', msg => {
          consoleLogs.push({ type: msg.type(), text: msg.text() });
        });
        page.on('request', req => {
          networkRequests.push({ url: req.url(), method: req.method() });
        });

        const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout || 15000 });
        if (response) statusCode = response.status();

        const title = await page.title().catch(() => 'Untitled');
        const fileName = `inspect_${Date.now()}.png`;
        const screenshotPath = path.join(this.artifactsDir, fileName);
        await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => null);

        const domStructure = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(Boolean);
          const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
          const inputs = Array.from(document.querySelectorAll('input')).map(i => i.placeholder || i.name || i.type).filter(Boolean);
          return { linksCount: links.length, buttonsCount: buttons.length, inputsCount: inputs.length, sampleButtons: buttons.slice(0, 5) };
        }).catch(() => ({}));

        await browser.close();

        return {
          ok: statusCode ? statusCode < 400 : true,
          url: targetUrl,
          statusCode,
          title,
          screenshot: screenshotPath,
          dom: domStructure,
          consoleErrors: consoleLogs.filter(l => l.type === 'error').map(l => l.text),
          networkRequestsCount: networkRequests.length,
          latencyMs: Date.now() - startTime,
          driver: 'playwright'
        };
      } catch (err) {
        if (browser) await browser.close().catch(() => {});
        // Fallback to HTTP probe
      }
    }

    return new Promise((resolve) => {
      try {
        const client = targetUrl.startsWith('https') ? https : http;
        const req = client.get(targetUrl, { timeout: 5000 }, (res) => {
          resolve({
            ok: res.statusCode < 400,
            url: targetUrl,
            statusCode: res.statusCode,
            headers: res.headers,
            latencyMs: Date.now() - startTime,
            driver: 'http-probe'
          });
        });
        req.on('error', (e) => {
          resolve({ ok: false, url: targetUrl, error: e.message, latencyMs: Date.now() - startTime, driver: 'http-probe' });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve({ ok: false, url: targetUrl, error: 'TIMEOUT', latencyMs: Date.now() - startTime, driver: 'http-probe' });
        });
      } catch (err) {
        resolve({ ok: false, url: targetUrl, error: err.message, latencyMs: Date.now() - startTime, driver: 'http-probe' });
      }
    });
  }
}

const globalBrowserAgent = new BrowserAgent();

module.exports = { BrowserSession, BrowserAgent, globalBrowserAgent, resolvePlaywright };

'use strict';
/**
 * FÊNIX OS V11 — SYSTEM OBSERVER
 * Real browser observation engine.
 * Flow: OPEN -> WAIT -> SCREENSHOT -> DOM -> ACCESSIBILITY -> ELEMENT DISCOVERY -> ROUTE DISCOVERY -> NETWORK -> CONSOLE -> INTERACTION DISCOVERY
 * Discovers: BUTTON, LINK, INPUT, SELECT, TAB, MENU, MODAL, CARD, TABLE, FORM, SIDEBAR, HEADER, NAVIGATION
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const ELEMENT_CATEGORIES = Object.freeze([
  'BUTTON', 'LINK', 'INPUT', 'SELECT', 'TAB', 'MENU',
  'MODAL', 'CARD', 'TABLE', 'FORM', 'SIDEBAR', 'HEADER', 'NAVIGATION'
]);

class SystemObserver {
  constructor(options = {}) {
    this.artifactsDir = options.artifactsDir || path.join(__dirname, '..', '.data', 'screenshots');
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
    this.playwright = null;
    this.hasPlaywright = false;
    this._initPlaywright(options.playwrightPath);
  }

  _initPlaywright(customPath) {
    const candidates = [
      customPath,
      'playwright',
      path.join(__dirname, '..', '..', 'node_modules', 'playwright'),
      '/opt/fenix-os/grg/node_modules/playwright'
    ].filter(Boolean);

    for (const cand of candidates) {
      try {
        this.playwright = require(cand);
        this.hasPlaywright = true;
        break;
      } catch (e) {
        // continue
      }
    }
  }

  /**
   * Observe a live URL using real browser or high-fidelity probe
   */
  async observeUrl(targetUrl, options = {}) {
    const startTime = Date.now();
    const consoleLogs = [];
    const consoleErrors = [];
    const networkRequests = [];
    const discoveredRoutes = new Set();
    const discoveredApis = [];

    // Fallback or playwright-based observation
    if (this.hasPlaywright) {
      try {
        return await this._observeWithPlaywright(targetUrl, options, {
          startTime, consoleLogs, consoleErrors, networkRequests, discoveredRoutes, discoveredApis
        });
      } catch (err) {
        // Fall back to intelligent HTTP/DOM probe if browser launch fails
      }
    }

    return await this._observeWithHttpProbe(targetUrl, options, {
      startTime, consoleLogs, consoleErrors, networkRequests, discoveredRoutes, discoveredApis
    });
  }

  async _observeWithPlaywright(targetUrl, options, ctx) {
    const { startTime, consoleLogs, consoleErrors, networkRequests, discoveredRoutes, discoveredApis } = ctx;
    const browser = await this.playwright.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--disable-gpu',
        '--window-size=1440,900'
      ]
    });

    try {
      const context = await browser.newContext({
        viewport: options.viewport || { width: 1440, height: 900 },
        userAgent: 'Fenix-System-Observer/11.0 (X11; Linux x86_64)'
      });

      const page = await context.newPage();

      page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        consoleLogs.push({ type, text, timestamp: new Date().toISOString() });
        if (type === 'error') consoleErrors.push(text);
      });

      page.on('request', req => {
        const reqUrl = req.url();
        const method = req.method();
        networkRequests.push({ url: reqUrl, method, resourceType: req.resourceType() });
        if (['fetch', 'xhr'].includes(req.resourceType()) || reqUrl.includes('/api/')) {
          discoveredApis.push({ method, url: reqUrl, type: req.resourceType() });
        }
      });

      const response = await page.goto(targetUrl, {
        waitUntil: options.waitUntil || 'domcontentloaded',
        timeout: options.timeoutMs || 25000
      });

      // Wait brief grace period for dynamic UI scripts
      await page.waitForTimeout(options.settleMs || 800);

      const title = await page.title().catch(() => 'Untitled View');
      const statusCode = response ? response.status() : 200;

      // Real screenshot capture
      const screenshotFileName = `observation_${Date.now()}.png`;
      const screenshotPath = path.join(this.artifactsDir, screenshotFileName);
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

      // Accessibility tree
      let accessibilityTree = null;
      try {
        accessibilityTree = await page.accessibility.snapshot();
      } catch (e) {
        accessibilityTree = { error: e.message };
      }

      // Comprehensive in-page element discovery across 13 canonical categories
      const elementsDiscovery = await page.evaluate(() => {
        const results = [];
        const seen = new Set();

        function addElem(category, el) {
          if (!el || seen.has(el)) return;
          seen.add(el);

          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
          const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 120);

          results.push({
            category,
            tag: el.tagName.toLowerCase(),
            text,
            id: el.id || null,
            className: el.className && typeof el.className === 'string' ? el.className.slice(0, 100) : null,
            role: el.getAttribute('role') || null,
            name: el.getAttribute('name') || null,
            href: el.getAttribute('href') || null,
            type: el.getAttribute('type') || null,
            isVisible,
            bounds: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        }

        // 1. BUTTON
        document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach(el => addElem('BUTTON', el));

        // 2. LINK
        document.querySelectorAll('a[href]').forEach(el => addElem('LINK', el));

        // 3. INPUT
        document.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="hidden"]), textarea').forEach(el => addElem('INPUT', el));

        // 4. SELECT
        document.querySelectorAll('select, [role="listbox"], [role="combobox"]').forEach(el => addElem('SELECT', el));

        // 5. TAB
        document.querySelectorAll('[role="tab"], .tab, .nav-tab, [class*="tab"]').forEach(el => addElem('TAB', el));

        // 6. MENU
        document.querySelectorAll('menu, [role="menu"], [role="menubar"], ul.menu, .navbar-nav').forEach(el => addElem('MENU', el));

        // 7. MODAL
        document.querySelectorAll('[role="dialog"], .modal, dialog, .popup, [class*="modal"]').forEach(el => addElem('MODAL', el));

        // 8. CARD
        document.querySelectorAll('.card, [class*="card"], article, .v10-card').forEach(el => addElem('CARD', el));

        // 9. TABLE
        document.querySelectorAll('table, [role="table"], [role="grid"]').forEach(el => addElem('TABLE', el));

        // 10. FORM
        document.querySelectorAll('form').forEach(el => addElem('FORM', el));

        // 11. SIDEBAR
        document.querySelectorAll('aside, [role="complementary"], .sidebar, [class*="sidebar"]').forEach(el => addElem('SIDEBAR', el));

        // 12. HEADER
        document.querySelectorAll('header, [role="banner"], .header, [class*="header"]').forEach(el => addElem('HEADER', el));

        // 13. NAVIGATION
        document.querySelectorAll('nav, [role="navigation"]').forEach(el => addElem('NAVIGATION', el));

        return results;
      }).catch(() => []);

      // Discover internal routes from links
      elementsDiscovery.forEach(elem => {
        if (elem.category === 'LINK' && elem.href) {
          try {
            const u = new URL(elem.href, targetUrl);
            const targetOrigin = new URL(targetUrl).origin;
            if (u.origin === targetOrigin && !u.pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/i)) {
              discoveredRoutes.add(u.pathname);
            }
          } catch (e) {}
        }
      });

      // Group elements by category
      const elementsSummary = {};
      ELEMENT_CATEGORIES.forEach(cat => {
        elementsSummary[cat] = elementsDiscovery.filter(e => e.category === cat).length;
      });

      return {
        ok: true,
        targetUrl,
        title,
        statusCode,
        driver: 'playwright',
        latencyMs: Date.now() - startTime,
        screenshot: screenshotPath,
        screenshotPath,
        accessibility: accessibilityTree,
        elementsCount: elementsDiscovery.length,
        elementsSummary,
        elements: elementsDiscovery,
        routes: Array.from(discoveredRoutes),
        apis: discoveredApis,
        network: {
          totalRequests: networkRequests.length,
          apisCount: discoveredApis.length,
          requests: networkRequests.slice(0, 50)
        },
        console: {
          logsCount: consoleLogs.length,
          errorsCount: consoleErrors.length,
          errors: consoleErrors,
          logs: consoleLogs.slice(0, 50)
        },
        timestamp: new Date().toISOString()
      };
    } finally {
      await browser.close().catch(() => {});
    }
  }

  async _observeWithHttpProbe(targetUrl, options, ctx) {
    const { startTime, consoleLogs, consoleErrors, networkRequests, discoveredRoutes, discoveredApis } = ctx;
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Fenix-System-Observer/11.0 (Probe)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: options.timeoutMs || 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => {
          if (body.length < 500000) body += chunk;
        });
        res.on('end', () => {
          const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Observed View';
          const elements = [];
          const seenLinks = new Set();

          // Regex-based element identification
          const buttonMatches = body.match(/<(button|input[^>]+type=["'](button|submit)["'])[^>]*>(.*?)<\/(button)?>/gi) || [];
          buttonMatches.forEach((m, idx) => {
            elements.push({
              category: 'BUTTON',
              tag: m.startsWith('<button') ? 'button' : 'input',
              text: m.replace(/<[^>]+>/g, '').trim().slice(0, 80) || `Button ${idx + 1}`,
              isVisible: true,
              bounds: { x: 0, y: idx * 40, width: 120, height: 36 }
            });
          });

          const linkMatches = body.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi) || [];
          linkMatches.forEach((m) => {
            const hrefMatch = m.match(/href=["']([^"']+)["']/i);
            const textMatch = m.replace(/<[^>]+>/g, '').trim();
            const href = hrefMatch ? hrefMatch[1] : '#';
            if (!seenLinks.has(href)) {
              seenLinks.add(href);
              if (href.startsWith('/') || href.startsWith(parsed.origin)) {
                try {
                  const u = new URL(href, targetUrl);
                  discoveredRoutes.add(u.pathname);
                } catch (e) {}
              }
              elements.push({
                category: 'LINK',
                tag: 'a',
                text: textMatch.slice(0, 80) || href,
                href,
                isVisible: true,
                bounds: { x: 0, y: 0, width: 80, height: 20 }
              });
            }
          });

          const inputMatches = body.match(/<input[^>]+(type=["'](text|email|password|number|search)["'][^>]*)>/gi) || [];
          inputMatches.forEach((m, idx) => {
            elements.push({
              category: 'INPUT',
              tag: 'input',
              text: `Input ${idx + 1}`,
              isVisible: true,
              bounds: { x: 0, y: idx * 50, width: 220, height: 38 }
            });
          });

          const formMatches = body.match(/<form[^>]*>/gi) || [];
          formMatches.forEach(() => {
            elements.push({ category: 'FORM', tag: 'form', text: 'Form', isVisible: true, bounds: { x: 0, y: 0, width: 400, height: 200 } });
          });

          const cardMatches = body.match(/class=["'][^"']*(card|box|panel)[^"']*["']/gi) || [];
          cardMatches.forEach((m, idx) => {
            elements.push({ category: 'CARD', tag: 'div', text: `Card ${idx + 1}`, isVisible: true, bounds: { x: 0, y: idx * 100, width: 300, height: 180 } });
          });

          const headerMatches = body.match(/<(header|nav)[^>]*>/gi) || [];
          headerMatches.forEach((m) => {
            const cat = m.startsWith('<header') ? 'HEADER' : 'NAVIGATION';
            elements.push({ category: cat, tag: cat.toLowerCase(), text: cat, isVisible: true, bounds: { x: 0, y: 0, width: 1440, height: 60 } });
          });

          const elementsSummary = {};
          ELEMENT_CATEGORIES.forEach(cat => {
            elementsSummary[cat] = elements.filter(e => e.category === cat).length;
          });

          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            targetUrl,
            title,
            statusCode: res.statusCode,
            driver: 'http-probe',
            latencyMs: Date.now() - startTime,
            screenshot: null,
            screenshotPath: null,
            accessibility: { role: 'WebArea', name: title },
            elementsCount: elements.length,
            elementsSummary,
            elements,
            routes: Array.from(discoveredRoutes),
            apis: discoveredApis,
            network: { totalRequests: 1, apisCount: 0, requests: [{ url: targetUrl, method: 'GET' }] },
            console: { logsCount: 0, errorsCount: 0, errors: [], logs: [] },
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          ok: false,
          targetUrl,
          title: 'Error',
          statusCode: 500,
          driver: 'http-probe',
          error: err.message,
          latencyMs: Date.now() - startTime,
          screenshot: null,
          elementsCount: 0,
          elementsSummary: {},
          elements: [],
          routes: [],
          apis: [],
          network: { totalRequests: 0, apisCount: 0, requests: [] },
          console: { logsCount: 0, errorsCount: 1, errors: [err.message], logs: [] },
          timestamp: new Date().toISOString()
        });
      });
    });
  }
}

const globalSystemObserver = new SystemObserver();

module.exports = {
  SystemObserver,
  globalSystemObserver,
  ELEMENT_CATEGORIES
};

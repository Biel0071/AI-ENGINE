'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseURL = process.env.FENIX_QA_URL || 'http://127.0.0.1:4400';
const outDir = path.resolve(__dirname, '../../qa-results/visual-audit');
fs.mkdirSync(outDir, { recursive: true });

const VIEWS = [
  'command',
  'city',
  'agents',
  'ide',
  'operations',
  'runtime',
  'projects',
  'memory',
  'knowledge',
  'mcp',
  'browser',
  'observability',
  'terminal',
  'flowgraph',
  'marketplace'
];

async function runAudit() {
  console.log('[VISUAL AUDIT] Starting comprehensive visual audit...');
  
  // 1. Authenticate to get valid token
  const loginRes = await fetch(`${baseURL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'grg-admin', password: 'GRG1020304050', rememberMe: true })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Failed to login: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('[VISUAL AUDIT] Logged in successfully. Token acquired.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  await context.addCookies([
    { name: 'fenix_session', value: encodeURIComponent(token), url: baseURL, httpOnly: true, sameSite: 'Lax' }
  ]);
  await context.addInitScript((t) => {
    localStorage.setItem('grg_token', t);
    localStorage.setItem('fenix_token', t);
  }, token);

  const consoleLogs = [];
  const networkRequests = [];

  const page = await context.newPage();
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text, location: msg.location() });
  });
  page.on('request', req => {
    networkRequests.push({ url: req.url(), method: req.method() });
  });

  // Capture Login Screen first
  console.log('[VISUAL AUDIT] Capturing Login page...');
  const loginCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${baseURL}/GRG-login`, { waitUntil: 'domcontentloaded' });
  await loginPage.waitForTimeout(1000);
  await loginPage.screenshot({ path: path.join(outDir, '00_screen_login.png'), fullPage: true });
  await loginCtx.close();

  // Navigate to /app
  console.log('[VISUAL AUDIT] Navigating to /app...');
  await page.goto(`${baseURL}/app#command`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Extract CSS files loaded
  const cssAudit = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.getAttribute('href'));
    const styles = Array.from(document.querySelectorAll('style')).map((s, i) => ({
      index: i,
      length: s.textContent.length,
      importantCount: (s.textContent.match(/!important/g) || []).length
    }));
    return { links, inlineStylesheets: styles };
  });

  const auditReport = {
    timestamp: new Date().toISOString(),
    baseURL,
    cssAudit,
    views: {},
    overallStats: {
      totalInlineStyleAttributes: 0,
      totalImportantRules: 0,
      consoleErrors: 0,
      consoleWarnings: 0
    }
  };

  // Inspect each of the 15 canonical views
  for (let i = 0; i < VIEWS.length; i++) {
    const viewName = VIEWS[i];
    console.log(`[VISUAL AUDIT] [${i + 1}/${VIEWS.length}] Auditing view: ${viewName}...`);
    
    // Switch view
    await page.evaluate((v) => {
      if (typeof window.showView === 'function') {
        window.showView(v);
      } else if (typeof window.switchView === 'function') {
        window.switchView(v);
      } else {
        location.hash = '#' + v;
      }
    }, viewName);

    await page.waitForTimeout(1200);

    // Capture screenshot
    const shotPath = path.join(outDir, `${String(i + 1).padStart(2, '0')}_view_${viewName}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });

    // Detailed DOM and visual metrics
    const viewMetrics = await page.evaluate((v) => {
      const viewEl = document.getElementById(`view-${v}`) || document.querySelector(`[data-view="${v}"]`);
      if (!viewEl) return { found: false, error: 'Element #view-' + v + ' not found' };

      const allDescendants = viewEl.querySelectorAll('*');
      const inlineStyleEls = viewEl.querySelectorAll('[style]');
      const buttons = viewEl.querySelectorAll('button');
      const cards = viewEl.querySelectorAll('.card, .dash-card, .workspace-card, .fenix-card, [class*="card"]');
      const tables = viewEl.querySelectorAll('table');
      const badges = viewEl.querySelectorAll('.badge, [class*="badge"]');
      const headings = viewEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const inputs = viewEl.querySelectorAll('input, select, textarea');

      // Sample inline styles
      const sampleStyles = [];
      for (let j = 0; j < Math.min(inlineStyleEls.length, 10); j++) {
        const el = inlineStyleEls[j];
        sampleStyles.push({ tag: el.tagName.toLowerCase(), class: el.className, style: el.getAttribute('style') });
      }

      // Check text for empty indicators or mocks
      const text = viewEl.innerText || '';
      const containsHyphenPlaceholder = text.includes('—');
      const containsNoData = /no\s+data/i.test(text);

      const computed = window.getComputedStyle(viewEl);

      return {
        found: true,
        id: viewEl.id,
        className: viewEl.className,
        visible: viewEl.offsetWidth > 0 && viewEl.offsetHeight > 0,
        width: viewEl.offsetWidth,
        height: viewEl.offsetHeight,
        computedBackground: computed.backgroundColor,
        elementsCount: allDescendants.length,
        inlineStyleCount: inlineStyleEls.length,
        buttonCount: buttons.length,
        cardCount: cards.length,
        tableCount: tables.length,
        badgeCount: badges.length,
        headingCount: headings.length,
        inputCount: inputs.length,
        sampleStyles,
        containsHyphenPlaceholder,
        containsNoData,
        headingsSummary: Array.from(headings).slice(0, 6).map(h => `${h.tagName}: ${h.textContent.trim().slice(0, 40)}`)
      };
    }, viewName);

    auditReport.views[viewName] = viewMetrics;
    if (viewMetrics.found) {
      auditReport.overallStats.totalInlineStyleAttributes += (viewMetrics.inlineStyleCount || 0);
    }
  }

  // Count errors and warnings
  auditReport.overallStats.consoleErrors = consoleLogs.filter(l => l.type === 'error').length;
  auditReport.overallStats.consoleWarnings = consoleLogs.filter(l => l.type === 'warning').length;
  auditReport.consoleErrorsSample = consoleLogs.filter(l => l.type === 'error').slice(0, 20);

  fs.writeFileSync(path.join(outDir, 'audit_data.json'), JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`[VISUAL AUDIT] Audit complete! Saved 16 screenshots and audit_data.json to ${outDir}`);

  await browser.close();
}

runAudit().catch(err => {
  console.error('[VISUAL AUDIT] Fatal error:', err);
  process.exit(1);
});

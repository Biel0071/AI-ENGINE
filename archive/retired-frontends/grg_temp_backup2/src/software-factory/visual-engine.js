const { chromium } = require('playwright');

class VisualEngine {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async start() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext();
    }
  }

  async captureState(url, projectPath) {
    await this.start();
    const page = await this.context.newPage();
    const state = { url, timestamp: new Date().toISOString(), console: [], network: [] };
    
    page.on('console', msg => state.console.push({ type: msg.type(), text: msg.text() }));
    page.on('requestfailed', request => state.network.push({ url: request.url(), error: request.failure().errorText }));

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      state.title = await page.title();
      
      const screenshotPath = \\/.fenix/visual-state-\.png\;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      state.screenshot = screenshotPath;

      // Extract DOM and computed styles
      state.elements = await page.evaluate(() => {
        const elements = [];
        document.querySelectorAll('*').forEach((el) => {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'META') return;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          
          elements.push({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            text: el.innerText ? el.innerText.slice(0, 50) : '',
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
            source: el.getAttribute('data-fenix-source') || 'SOURCE_UNRESOLVED'
          });
        });
        return elements;
      });

      state.domSnapshot = await page.content();
    } catch (e) {
      state.error = e.message;
    } finally {
      await page.close();
    }
    
    return state;
  }

  async visualDiff(beforeState, afterState) {
    const report = {
      status: 'NEUTRAL',
      layoutChanges: 0,
      newErrors: 0,
      missingElements: []
    };
    
    // Simple DOM and console error heuristic
    const beforeErrs = beforeState.console.filter(c => c.type === 'error').length;
    const afterErrs = afterState.console.filter(c => c.type === 'error').length;
    if (afterErrs > beforeErrs) {
      report.status = 'REGRESSION';
      report.newErrors = afterErrs - beforeErrs;
    }
    
    if (beforeState.elements && afterState.elements) {
      report.layoutChanges = Math.abs(afterState.elements.length - beforeState.elements.length);
      if (report.layoutChanges > 0 && report.status !== 'REGRESSION') {
        report.status = 'IMPROVEMENT';
      }
    }
    
    return report;
  }
}

module.exports = { VisualEngine };

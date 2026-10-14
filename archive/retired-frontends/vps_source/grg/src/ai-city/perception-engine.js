const { uuid } = require('../kernel/ids');
const { NotFoundError } = require('../kernel/errors');

class PerceptionEngine {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
  }

  async captureVisualMemory(tenantId, actorId, options = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    
    const memoryId = uuid();
    const url = options.url || 'http://localhost:4400/app';
    const payload = {
      id: memoryId,
      tenantId,
      url,
      status: 'PROCESSING',
      timestamp: new Date().toISOString()
    };
    
    // Fire and forget observation task using Playwright
    this._runBrowserObservation(url, memoryId).catch(console.error);

    await this.bus.emit('perception.capture.requested', payload);
    return payload;
  }

  async _runBrowserObservation(url, memoryId) {
    let browser = null;
    try {
      // Dynamic import to avoid crash if playwright is not installed in the current environment
      const { chromium } = require('playwright');
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });
      
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Attempt generic login if it redirects
      if (page.url().includes('login')) {
        await page.fill('#tenantId', 'grg');
        await page.fill('#userId', 'grg-admin');
        await page.fill('#password', 'grg-admin');
        await page.click('#loginBtn');
        await page.waitForNavigation({ waitUntil: 'networkidle' });
      }

      // Allow animations / map to render
      await page.waitForTimeout(3000);
      
      const screenshotBuffer = await page.screenshot();
      
      // Persist to store/bus as a completed memory
      await this.bus.emit('perception.capture.completed', {
        id: memoryId,
        status: 'SUCCEEDED',
        imageSize: screenshotBuffer.length
      });

    } catch (err) {
      await this.bus.emit('perception.capture.failed', {
        id: memoryId,
        status: 'FAILED',
        error: err.message
      });
    } finally {
      if (browser) await browser.close();
    }
  }

  async runVisualDiff(tenantId, actorId, beforeId, afterId) {
    // Structural stub for comparing two visual memory buffers
    return {
      status: 'MOCKED',
      diffPercentage: 0,
      matches: true,
      message: 'Diff engine requires image comparison library (e.g. pixelmatch).'
    };
  }
}

module.exports = { PerceptionEngine };

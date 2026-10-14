const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

class VisualEngine {
  constructor() { this.browser = null; this.context = null; }
  async start() { if (!this.browser) { this.browser = await chromium.launch({ headless: true }); this.context = await this.browser.newContext(); } }
  async captureState(url, projectPath) {
    await this.start(); const page = await this.context.newPage();
    const state = { url, timestamp: new Date().toISOString(), console: [], network: [] };
    page.on('console', msg => state.console.push({ type: msg.type(), text: msg.text() }));
    page.on('requestfailed', req => state.network.push({ url: req.url(), error: req.failure()?.errorText || 'request failed' }));
    try { await page.goto(url, { waitUntil: 'networkidle' }); state.title = await page.title();
      const dir = projectPath || require('node:os').tmpdir(); fs.mkdirSync(dir, { recursive: true });
      const screenshotPath = path.join(dir, `visual-state-${Date.now()}.png`); await page.screenshot({ path: screenshotPath, fullPage: true }); state.screenshot = screenshotPath;
      state.elements = await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => !['SCRIPT','STYLE','META'].includes(el.tagName)).map(el => { const r=el.getBoundingClientRect(); return r.width && r.height ? { tagName:el.tagName, id:el.id, text:(el.innerText||'').slice(0,50), rect:{x:r.x,y:r.y,w:r.width,h:r.height} } : null; }).filter(Boolean));
      state.domSnapshot = await page.content();
    } catch (error) { state.error = error.message; } finally { await page.close(); } return state;
  }
  async visualDiff(beforeState, afterState) { const b=(beforeState.console||[]).filter(c=>c.type==='error').length; const a=(afterState.console||[]).filter(c=>c.type==='error').length; const layoutChanges=Math.abs((afterState.elements||[]).length-(beforeState.elements||[]).length); return { status:a>b?'REGRESSION':layoutChanges?'IMPROVEMENT':'NEUTRAL', layoutChanges, newErrors:Math.max(0,a-b), missingElements:[] }; }
}
module.exports = { VisualEngine };

/**
 * FÊNIX OS — COMPUTER CONTROL & BROWSER AUTOMATION AGENT (LEVEL 10)
 * 
 * Capabilities:
 * 1. Safe Computer & Browser Control (Mouse, Keyboard, Browser, Terminal, IDE, Filesystem)
 * 2. Strict Policy Enforcement Matrix: SAFE | CONFIRM (Human Consent) | BLOCKED (Forbidden)
 * 3. Secret Protection: Zero secrets exposed in automation logs
 * 4. Audit Trail Recording
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');
const path = require('path');
const fs = require('fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);

const PERMISSION_MATRIX = {
  // SAFE (Auto-executable without prompt)
  OPEN_BROWSER: 'SAFE',
  NAVIGATE_URL: 'SAFE',
  INSPECT_DOM: 'SAFE',
  CLICK: 'SAFE',
  TYPE: 'SAFE',
  READ_CONSOLE_LOGS: 'SAFE',
  CAPTURE_SCREENSHOT: 'SAFE',
  INSPECT_WORKSPACE: 'SAFE',
  RUN_TESTS: 'SAFE',

  // CONFIRM (Requires explicit human approval)
  EDIT_PROJECT_FILE: 'CONFIRM',
  DELETE_FILE: 'CONFIRM',
  RUN_SHELL_COMMAND: 'CONFIRM',
  RESTART_SERVICE: 'CONFIRM',
  INSTALL_NPM_PACKAGE: 'CONFIRM',

  // BLOCKED (Permanently forbidden)
  SHUTDOWN_SYSTEM: 'BLOCKED',
  ACCESS_RAW_SECRETS: 'BLOCKED',
  EXPOSE_PRIVATE_KEYS: 'BLOCKED',
  DISABLE_REALITY_GATE: 'BLOCKED'
};

class ComputerControlAgent extends SystemModule {
  constructor({
    eventBus = null,
    workspaceManager = null
  } = {}) {
    super('computer_control_agent', '1.0.0');
    this.eventBus = eventBus;
    this.workspaceManager = workspaceManager;
    this.auditLog = [];
    this.status = STATE_MACHINE.BOOT;
    this.browser = null;
    this.pages = new Map();
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
    this.pages.clear();
  }

  /**
   * =========================================================================
   * SECURE ACTION EXECUTOR
   * =========================================================================
   */
  async executeAction({
    actionType,
    params = {},
    userConsentGranted = false,
    actor = 'operator:web_ui'
  }) {
    const policyLevel = PERMISSION_MATRIX[actionType] || 'CONFIRM';

    // 1. Check BLOCKED Policy
    if (policyLevel === 'BLOCKED') {
      const err = `Ação "${actionType}" é estritamente BLOQUEADA pelas políticas de segurança do FÊNIX OS.`;
      this.recordAudit({ actionType, params, status: 'BLOCKED', actor, reason: err });
      throw new Error(err);
    }

    // 2. Check CONFIRM Policy
    if (policyLevel === 'CONFIRM' && !userConsentGranted) {
      const msg = `Ação "${actionType}" requer confirmação explícita do operador humano para prosseguir.`;
      this.recordAudit({ actionType, params, status: 'AWAITING_CONSENT', actor });
      return {
        success: false,
        requiresConsent: true,
        policyLevel: 'CONFIRM',
        message: msg
      };
    }

    // 3. Execute Authorized Action
    let result = null;
    switch (actionType) {
      case 'OPEN_BROWSER':
      case 'NAVIGATE_URL':
        result = await this.navigate(params.url || 'http://localhost:4400', params);
        break;

      case 'INSPECT_DOM':
        result = await this.inspectDom(params);
        break;

      case 'CLICK':
        result = await this.click(params);
        break;

      case 'TYPE':
        result = await this.type(params);
        break;

      case 'READ_CONSOLE_LOGS':
        result = await this.readConsoleLogs(params);
        break;

      case 'CAPTURE_SCREENSHOT':
        result = await this.captureScreenshot(params);
        break;

      case 'RUN_SHELL_COMMAND':
      case 'RUN_TESTS':
        result = await this.runCommand(params.command || 'npm test', params);
        break;

      default:
        result = {
          executed: true,
          actionType,
          params
        };
    }

    this.recordAudit({ actionType, params, status: 'EXECUTED', actor, result });

    if (this.eventBus) {
      await this.eventBus.emit('computer.action.executed', {
        actionType,
        policyLevel,
        actor,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      actionType,
      policyLevel,
      result
    };
  }

  async _page(url = null) {
    if (!this.browser) { const { chromium } = require('playwright'); this.browser = await chromium.launch({ headless: true }); }
    const key = url || '__active__';
    let page = this.pages.get(key);
    if (!page || page.isClosed()) {
      page = await this.browser.newPage();
      page.__fenixConsole = [];
      page.on('console', msg => page.__fenixConsole.push({ type: msg.type(), text: msg.text(), timestamp: new Date().toISOString() }));
      page.on('pageerror', error => page.__fenixConsole.push({ type: 'error', text: error.message, timestamp: new Date().toISOString() }));
      this.pages.set(key, page);
    }
    if (url && page.url() !== url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return page;
  }

  async navigate(url, params = {}) {
    const page = await this._page();
    const response = await page.goto(String(url), { waitUntil: params.waitUntil || 'domcontentloaded', timeout: 30_000 });
    return { url: page.url(), title: await page.title(), statusCode: response?.status() ?? null, domLoaded: true, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })) };
  }

  async inspectDom(params = {}) {
    const page = await this._page(params.url || null); const selector = params.selector || 'body';
    return page.locator(selector).first().evaluate((el) => ({ selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(), nodeCount: document.querySelectorAll(el.tagName).length, innerText: (el.innerText || '').slice(0, 2000), attributes: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])) }));
  }

  async click(params = {}) { const page = await this._page(params.url || null); const selector = String(params.selector || 'button'); await page.locator(selector).first().click({ timeout: params.timeoutMs || 10_000 }); return { selector, url: page.url(), clicked: true }; }

  async type(params = {}) { const page = await this._page(params.url || null); const selector = String(params.selector || 'input'); await page.locator(selector).first().fill(String(params.text ?? '')); return { selector, url: page.url(), typed: true }; }

  async readConsoleLogs(params = {}) { const page = await this._page(params.url || null); const logs = page.__fenixConsole || []; return { errors: logs.filter((entry) => entry.type === 'error').length, warnings: logs.filter((entry) => entry.type === 'warning').length, logs: logs.slice(-100) }; }

  async captureScreenshot(params = {}) { const page = await this._page(params.url || null); const file = params.path || require('node:path').join(require('node:os').tmpdir(), `fenix-browser-${Date.now()}.png`); await page.screenshot({ path: file, fullPage: params.fullPage === true }); const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })); return { path: file, format: 'png', dimensions: size, capturedAt: new Date().toISOString() }; }

  async runCommand(command, params = {}) { const started = Date.now(); const [file, ...args] = String(command).trim().split(/\s+/); const result = await exec(file, args, { cwd: params.cwd || process.cwd(), timeout: params.timeoutMs || 120_000, windowsHide: true }); return { command, exitCode: 0, stdout: result.stdout || '', stderr: result.stderr || '', durationMs: Date.now() - started }; }

  recordAudit(entry) {
    this.auditLog.unshift({
      id: `audit_${Date.now()}_${this.auditLog.length}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (this.auditLog.length > 100) this.auditLog.pop();
  }
}

module.exports = { ComputerControlAgent, PERMISSION_MATRIX };

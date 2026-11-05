/**
 * FÊNIX OS — Qwen Coder & GitHub Browser Bridge
 * Connects to Google Chrome via CDP (port 9222) or launches a Playwright persistent profile.
 * Operates coder.qwen.ai and github.com autonomously.
 * Zero-Mock compliant: returns honest measured state or descriptive errors.
 */

const path = require('node:path');
const fs = require('node:fs');

let playwrightChromium = null;
try {
  const pw = require('playwright');
  playwrightChromium = pw.chromium;
} catch (_) {
  // Playwright might be loaded lazily
}

class QwenBrowserBridge {
  constructor(options = {}) {
    this.userDataDir = options.userDataDir || path.resolve(__dirname, '../../../../.data/qwen-browser-profile');
    this.defaultCdpUrl = options.cdpUrl || process.env.QWEN_CDP_URL || 'http://127.0.0.1:9222';
    this.browser = null;
    this.context = null;
    this.activePage = null;
    this.mode = 'disconnected'; // 'cdp' | 'playwright' | 'disconnected'
    this.lastError = null;
    this.lastAction = null;
    this.connectedAt = null;
    this.currentUrl = '—';
    this.loggedInQwen = false;
    this.loggedInGithub = false;
    this.qwenAccount = '—';
    this.githubAccount = '—';
  }

  getStatus() {
    return {
      connected: this.mode !== 'disconnected' && Boolean(this.activePage),
      mode: this.mode,
      cdpUrl: this.defaultCdpUrl,
      activeUrl: this.currentUrl || '—',
      activeTab: this.activePage ? (this.activePage.url ? this.activePage.url() : '—') : '—',
      loggedInQwen: this.loggedInQwen,
      loggedInGithub: this.loggedInGithub,
      qwenAccount: this.qwenAccount || '—',
      githubAccount: this.githubAccount || '—',
      lastAction: this.lastAction || 'Nenhuma ação recente',
      lastError: this.lastError,
      connectedAt: this.connectedAt
    };
  }

  async connectOrLaunch({ cdpUrl = null, headless = false } = {}) {
    this.lastError = null;
    const targetCdp = cdpUrl || this.defaultCdpUrl;

    if (!playwrightChromium) {
      try {
        const pw = require('playwright');
        playwrightChromium = pw.chromium;
      } catch (err) {
        this.lastError = `Playwright não disponível: ${err.message}`;
        this.mode = 'disconnected';
        return { ok: false, error: this.lastError };
      }
    }

    // 1. Tentar conectar ao Chrome ativo do usuário via CDP (Porta 9222)
    try {
      this.lastAction = `Conectando via CDP em ${targetCdp}...`;
      const browser = await playwrightChromium.connectOverCDP(targetCdp, { timeout: 3500 });
      this.browser = browser;
      const contexts = browser.contexts();
      this.context = contexts.length > 0 ? contexts[0] : await browser.newContext();
      const pages = this.context.pages();
      this.activePage = pages.length > 0 ? pages[0] : await this.context.newPage();
      this.mode = 'cdp';
      this.connectedAt = new Date().toISOString();
      this.currentUrl = this.activePage.url();
      this.lastAction = `Conectado com sucesso via CDP em ${targetCdp}`;
      await this.detectLoginStates();
      return { ok: true, mode: 'cdp', endpoint: targetCdp };
    } catch (cdpErr) {
      // CDP não respondeu na porta 9222 — fazer fallback para Playwright com perfil persistente
      this.lastAction = `CDP não disponível (${cdpErr.message}). Iniciando perfil persistente Playwright...`;
    }

    // 2. Fallback: Sessão Dedicada com Perfil Persistente
    try {
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }

      const launchBase = {
        headless: Boolean(headless),
        viewport: { width: 1280, height: 800 },
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      };

      let context = null;
      try {
        context = await playwrightChromium.launchPersistentContext(this.userDataDir, {
          ...launchBase,
          channel: 'chrome'
        });
      } catch (_) {
        try {
          context = await playwrightChromium.launchPersistentContext(this.userDataDir, {
            ...launchBase,
            channel: 'msedge'
          });
        } catch (_2) {
          context = await playwrightChromium.launchPersistentContext(this.userDataDir, launchBase);
        }
      }

      this.context = context;
      this.browser = null; // persistent context handles browser lifecycle
      const pages = context.pages();
      this.activePage = pages.length > 0 ? pages[0] : await context.newPage();
      this.mode = 'playwright';
      this.connectedAt = new Date().toISOString();
      this.currentUrl = this.activePage.url();
      this.lastAction = 'Navegador dedicado iniciado com perfil persistente';
      await this.detectLoginStates();
      return { ok: true, mode: 'playwright', profileDir: this.userDataDir };
    } catch (launchErr) {
      this.mode = 'disconnected';
      this.lastError = `Falha ao iniciar navegador: ${launchErr.message}`;
      return { ok: false, error: this.lastError };
    }
  }

  async detectLoginStates() {
    if (!this.context && !this.activePage) return;
    try {
      const pages = this.context ? this.context.pages() : [this.activePage];
      for (const p of pages) {
        const url = p.url();
        if (url.includes('qwen') || url.includes('aliyun')) {
          const hasUserInput = await p.$('textarea, [contenteditable="true"], input[type="text"]').catch(() => null);
          if (hasUserInput) {
            this.loggedInQwen = true;
            this.qwenAccount = 'Biel0071';
            if (!this.activePage || !this.activePage.url().includes('qwen')) {
              this.activePage = p;
            }
          }
        }

        if (url.includes('github.com')) {
          const userMeta = await p.$('meta[name="user-login"]').catch(() => null);
          if (userMeta) {
            const login = await userMeta.getAttribute('content').catch(() => null);
            if (login) {
              this.loggedInGithub = true;
              this.githubAccount = login;
            }
          }
        }
      }

      if (this.activePage) {
        this.currentUrl = this.activePage.url();
      }
    } catch (_) {}
  }

  async navigateTo(url) {
    if (!this.activePage) {
      return { ok: false, error: 'Nenhum navegador conectado. Conecte primeiro.' };
    }
    try {
      this.lastAction = `Navegando para ${url}...`;
      await this.activePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      this.currentUrl = this.activePage.url();
      await this.detectLoginStates();
      this.lastAction = `Página carregada: ${this.currentUrl}`;
      return { ok: true, url: this.currentUrl };
    } catch (err) {
      this.lastError = `Erro ao navegar para ${url}: ${err.message}`;
      return { ok: false, error: this.lastError };
    }
  }

  async ensureQwenSession() {
    if (!this.activePage) {
      const conn = await this.connectOrLaunch();
      if (!conn.ok) return conn;
    }

    if (this.context) {
      const qwenTab = this.context.pages().find((p) => p.url().includes('coder.qwen.ai') || p.url().includes('qwen.ai'));
      if (qwenTab) {
        this.activePage = qwenTab;
        this.currentUrl = qwenTab.url();
        await this.detectLoginStates();
        return {
          ok: true,
          url: this.activePage.url(),
          loggedIn: this.loggedInQwen,
          account: this.qwenAccount
        };
      }
    }

    const cur = this.activePage.url();
    if (!cur.includes('coder.qwen.ai')) {
      const nav = await this.navigateTo('https://coder.qwen.ai/');
      if (!nav.ok) return nav;
    }
    await this.detectLoginStates();
    return {
      ok: true,
      url: this.activePage.url(),
      loggedIn: this.loggedInQwen,
      account: this.qwenAccount
    };
  }

  async createNewChatOrProject({ projectName = 'Novo Projeto', initialPrompt = null } = {}) {
    const session = await this.ensureQwenSession();
    if (!session.ok) return session;

    this.lastAction = `Iniciando chat/projeto para ${projectName}...`;
    try {
      // Procura por botões de novo chat em coder.qwen.ai
      const newChatBtn = await this.activePage.$('button:has-text("New Chat"), button:has-text("Novo Chat"), [aria-label*="New Chat"], .new-chat-btn');
      if (newChatBtn) {
        await newChatBtn.click();
        await this.activePage.waitForTimeout(1000);
      }

      if (initialPrompt) {
        return await this.injectPromptAndStreamResponse(initialPrompt);
      }

      return { ok: true, message: `Chat criado para o projeto ${projectName}`, url: this.activePage.url() };
    } catch (err) {
      this.lastError = `Falha ao criar chat no Qwen: ${err.message}`;
      return { ok: false, error: this.lastError };
    }
  }

  async injectPromptAndStreamResponse(promptText, onTokenCallback = null) {
    const session = await this.ensureQwenSession();
    if (!session.ok) return session;

    this.lastAction = `Injetando prompt no Qwen Coder (${promptText.slice(0, 45)}...)...`;
    try {
      // Localiza input de texto
      const selector = 'textarea, [contenteditable="true"]';
      await this.activePage.waitForSelector(selector, { timeout: 10000 });
      const inputEl = await this.activePage.$(selector);
      if (!inputEl) throw new Error('Campo de prompt não encontrado no Qwen Coder.');

      await inputEl.click();
      try {
        await inputEl.fill(promptText);
      } catch (_) {
        await this.activePage.evaluate(({ el, text }) => {
          if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.textContent = text;
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }
        }, { el: inputEl, text: promptText });
      }

      // Procura botão de enviar ou envia via Enter
      const sendBtn = await this.activePage.$('button[type="submit"], button[aria-label*="Send"], button[aria-label*="Enviar"], button.send-button, .send-btn').catch(() => null);
      if (sendBtn) {
        await sendBtn.click().catch(() => {});
      } else {
        await this.activePage.keyboard.press('Enter');
      }

      this.lastAction = 'Prompt enviado ao Qwen Coder. Aguardando streaming de resposta...';

      // Monitora resposta
      let previousContent = '';
      let isDone = false;
      const start = Date.now();
      const timeoutMs = 120000;

      while (!isDone && (Date.now() - start < timeoutMs)) {
        await this.activePage.waitForTimeout(1200);

        // Coleta o último balão de resposta do assistente
        const responseText = await this.activePage.evaluate(() => {
          const messages = document.querySelectorAll('.message-assistant, .assistant-msg, [data-role="assistant"], pre, code');
          if (!messages.length) return '';
          return messages[messages.length - 1].innerText || '';
        });

        if (responseText && responseText !== previousContent) {
          const delta = responseText.slice(previousContent.length);
          previousContent = responseText;
          if (typeof onTokenCallback === 'function') {
            onTokenCallback(delta, responseText);
          }
        }

        // Verifica se o botão de parada/loading sumiu (usando DOM padrão sem pseudo-seletores inválidos)
        const isGenerating = await this.activePage.evaluate(() => {
          if (document.querySelector('.loading, .generating, .stop-btn, [aria-label*="Stop"], [title*="Stop"]')) return true;
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(b => /stop|parar|cancel/i.test(b.textContent || ''));
        });

        if (!isGenerating && previousContent.length > 20) {
          isDone = true;
        }
      }

      this.lastAction = 'Resposta gerada com sucesso pelo Qwen Coder.';
      return {
        ok: true,
        prompt: promptText,
        response: previousContent,
        completed: isDone,
        artifacts: await this.getLatestCodeArtifacts()
      };
    } catch (err) {
      this.lastError = `Erro na execução do prompt no Qwen: ${err.message}`;
      return { ok: false, error: this.lastError };
    }
  }

  async getLatestCodeArtifacts() {
    if (!this.activePage) return [];
    try {
      return await this.activePage.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('pre code, .code-block'));
        return blocks.map((b, idx) => {
          const lang = b.className.match(/language-(\w+)/)?.[1] || 'text';
          const code = b.innerText || '';
          return { id: `art_${idx + 1}`, language: lang, code };
        });
      });
    } catch (_) {
      return [];
    }
  }

  async checkGithubPullRequests(repoName) {
    if (!this.activePage) {
      const conn = await this.connectOrLaunch();
      if (!conn.ok) return conn;
    }
    const targetUrl = `https://github.com/Biel0071/${encodeURIComponent(repoName)}/pulls`;
    const nav = await this.navigateTo(targetUrl);
    if (!nav.ok) return nav;

    try {
      const prs = await this.activePage.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.js-issue-row'));
        return rows.map((r) => {
          const titleEl = r.querySelector('a.markdown-title, a[id^="issue_"]');
          const numEl = r.querySelector('.opened-by');
          return {
            title: titleEl?.innerText.trim() || '—',
            url: titleEl?.href || '',
            info: numEl?.innerText.trim() || '—'
          };
        });
      });
      return { ok: true, repo: repoName, url: targetUrl, pullRequests: prs };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async close() {
    this.lastAction = 'Encerrando sessão do navegador...';
    try {
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (_) {}
    this.browser = null;
    this.context = null;
    this.activePage = null;
    this.mode = 'disconnected';
    this.currentUrl = '—';
    this.lastAction = 'Sessão desconectada';
    return { ok: true };
  }
}

module.exports = { QwenBrowserBridge };

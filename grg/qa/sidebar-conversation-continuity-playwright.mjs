import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { start } = require('../src/server');
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-chat-continuity-'));
const dataFile = path.join(os.tmpdir(), `fenix-chat-continuity-${crypto.randomUUID()}.json`);
const admin = { tenantId: 'grg', userId: 'chat-continuity-admin', password: crypto.randomBytes(24).toString('base64url') };
let server;
let browser;

try {
  server = await start(0, {
    dataFile,
    llm: false,
    providers: {},
    bootstrapAdmin: { ...admin, tenantName: 'Chat Continuity QA', name: 'Chat Continuity Admin', role: 'master_admin' },
    operationalActivation: false,
    localRuntimeWorker: false,
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(admin),
  }).then((response) => response.json());
  if (!login.token) throw new Error('Local QA login did not return a session token');

  await server.app.projectKernel.create('grg', admin.userId, {
    id: 'chat-continuity-project', name: 'Projeto de Continuidade', workspace: root,
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await context.addCookies([{ name: 'fenix_session', value: encodeURIComponent(login.token), url: base, httpOnly: true, sameSite: 'Lax' }]);
  await context.addInitScript((token) => {
    localStorage.setItem('grg_token', token);
    localStorage.setItem('fenix_token', token);
    if (!sessionStorage.getItem('fenix-chat-continuity-qa-initialized')) {
      localStorage.removeItem('fenix_chat_conversations');
      localStorage.removeItem('fenix_active_conv_id');
      sessionStorage.setItem('fenix-chat-continuity-qa-initialized', '1');
    }
  }, login.token);

  const page = await context.newPage();
  const requestBodies = [];
  const apiTraffic = [];
  const browserErrors = [];
  page.on('requestfailed', (request) => apiTraffic.push({ url: request.url(), failure: request.failure()?.errorText }));
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiTraffic.push({ method: request.method(), url: request.url() });
    if (request.url().endsWith('/api/v2/conversation') && request.method() === 'POST') {
      try { requestBodies.push(request.postDataJSON()); } catch {}
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.route(`${base}/__qa/chat-harness`, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="stylesheet" href="${base}/fenix-v11-phase6.css">
      <link rel="stylesheet" href="${base}/fenix-mascot-sidebar.css">
      <style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b1220}.fenix-os-layout{height:100vh;display:flex;flex-direction:column}.global-topbar{height:50px;flex:none}.main-body{height:calc(100vh - 50px);min-height:0;display:flex;overflow:hidden}</style>
      </head><body class="dark-theme"><div class="fenix-os-layout"><header class="global-topbar"></header><main class="main-body" id="fenixMainBody"></main></div>
      <footer class="fenix-presentation-footer" id="fenixPresentationFooter"></footer>
      <script src="${base}/fenix-mascot-sidebar.js"></script></body></html>`,
  }));
  await page.goto(`${base}/__qa/chat-harness`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('#fsbChatInput').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => window.fenixCopilot.updateContext({
    contextType: 'PROJECT', contextId: 'chat-continuity-project', project: 'Projeto de Continuidade',
  }));

  const chatControlGeometry = await page.evaluate(() => {
    const button = document.getElementById('fsbSendBtn');
    const footer = document.getElementById('fenixPresentationFooter');
    const buttonRect = button?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    if (!buttonRect || !footerRect) return { button: Boolean(buttonRect), footer: Boolean(footerRect) };
    const x = buttonRect.left + buttonRect.width / 2;
    const y = buttonRect.top + buttonRect.height / 2;
    return {
      button: { top: buttonRect.top, bottom: buttonRect.bottom },
      footer: { top: footerRect.top, bottom: footerRect.bottom },
      clickTarget: document.elementFromPoint(x, y)?.id || document.elementFromPoint(x, y)?.closest('#fenixPresentationFooter')?.id || null,
    };
  });
  if (!chatControlGeometry.button || !chatControlGeometry.footer) {
    throw new Error('Chat send button or telemetry footer is missing');
  }
  if (chatControlGeometry.button.bottom > chatControlGeometry.footer.top || chatControlGeometry.clickTarget === 'fenixPresentationFooter') {
    throw new Error(`Chat send control is covered by the fixed footer: ${JSON.stringify(chatControlGeometry)}`);
  }

  async function sendMessage(text) {
    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/api/v2/conversation') && response.request().method() === 'POST',
      { timeout: 30000 },
    ).then((response) => ({ response }), (error) => ({ error }));
    await page.locator('#fsbChatInput').fill(text);
    await page.locator('#fsbSendBtn').click();
    const result = await responsePromise;
    if (result.error) {
      const error = result.error;
      const state = await page.evaluate(() => ({
        input: document.getElementById('fsbChatInput')?.value,
        buttonDisabled: document.getElementById('fsbSendBtn')?.disabled,
        messageCount: document.getElementById('fsbChatMessages')?.children.length,
        messages: [...(document.getElementById('fsbChatMessages')?.children || [])].map((node) => node.innerText.slice(0, 120)),
        localConversations: (() => { try { return JSON.parse(localStorage.getItem('fenix_chat_conversations') || '[]').map((item) => ({ id: item.id, serverConversationId: item.serverConversationId, projectId: item.projectId, messageCount: item.messages?.length })); } catch { return null; } })(),
        sidebar: window.FenixSidebar ? Object.keys(window.FenixSidebar) : null,
      }));
      const relevantTraffic = apiTraffic.filter((item) => item.url.includes('/api/v2/conversation') || item.url.includes('/api/events'));
      throw new Error(`${error.message}; UI=${JSON.stringify(state)}; API=${JSON.stringify(relevantTraffic)}; errors=${JSON.stringify(browserErrors.slice(-6))}`);
    }
    const response = result.response;
    return { status: response.status(), body: await response.json() };
  }

  const first = await sendMessage('Responda somente: primeiro turno de continuidade.');
  const firstRequest = requestBodies.at(-1);
  const conversationId = first.body.conversationId;
  if (!conversationId) throw new Error(`First turn was not associated with a persisted conversation (HTTP ${first.status})`);
  function assertProviderOutcome(result, turn) {
    if (result.status === 503 && result.body.error === 'AI_PROVIDER_UNAVAILABLE') return;
    if (result.status === 200 && result.body.usedAI === true && result.body.provider && result.body.model) return;
    throw new Error(`${turn} returned no verified provider response or explicit provider error: HTTP ${result.status}, ${JSON.stringify({ error: result.body.error, lane: result.body.lane, usedAI: result.body.usedAI, provider: result.body.provider, model: result.body.model })}`);
  }
  assertProviderOutcome(first, 'First turn');
  if (firstRequest.projectId !== 'chat-continuity-project') throw new Error('First turn lost the selected project context');
  const firstHistory = await server.app.conversations.history('grg', conversationId, { actorId: admin.userId });
  if (!firstHistory.some((message) => message.role === 'user' && message.content.includes('primeiro turno'))) {
    throw new Error('First user turn was not persisted by ConversationStore');
  }
  await page.waitForFunction((id) => {
    try {
      return JSON.parse(localStorage.getItem('fenix_chat_conversations') || '[]')
        .some((item) => item.serverConversationId === id);
    } catch { return false; }
  }, conversationId, { timeout: 10000 });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#fsbChatInput').waitFor({ state: 'visible', timeout: 15000 });
  const restoredContext = await page.evaluate(() => window.fenixCopilot.getContext());
  if (restoredContext.projectId !== 'chat-continuity-project') throw new Error('Reload lost the selected project context');
  const second = await sendMessage('Qual foi a decisão que pedi para registrar?');
  const secondRequest = requestBodies.at(-1);
  if (secondRequest.conversationId !== conversationId) {
    throw new Error(`Reload started a different server conversation: expected ${conversationId}, got ${secondRequest.conversationId || 'no conversationId'}`);
  }
  if (secondRequest.projectId !== 'chat-continuity-project') throw new Error('Second turn lost the selected project context');
  assertProviderOutcome(second, 'Second turn');

  const history = await server.app.conversations.history('grg', conversationId, { actorId: admin.userId });
  const userTurns = history.filter((message) => message.role === 'user');
  if (userTurns.length !== 2) throw new Error(`Expected two persisted user turns in one conversation, found ${userTurns.length}`);
  if (browserErrors.length) throw new Error(`Browser JavaScript errors: ${browserErrors.join(' | ')}`);

  console.log(JSON.stringify({
    ok: true,
    conversationId,
    firstStatus: first.status,
    secondStatus: second.status,
    persistedUserTurns: userTurns.length,
    projectId: secondRequest.projectId,
    provider: second.body.provider || null,
    model: second.body.model || null,
    browserErrors,
  }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(dataFile, { force: true });
}
process.exit(process.exitCode || 0);

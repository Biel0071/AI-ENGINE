# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fenix-os.spec.js >> FÊNIX OS - Master Agentic IDE >> Gate 1 & 2: API Online and Workspace Loaded
- Location: tests\e2e\fenix-os.spec.js:21:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#fsList .fs-item').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('#fsList .fs-item').first()

```

```yaml
- complementary "Navegacao principal":
  - link "FENIX OS":
    - /url: "#command"
    - text: F FENIX OS Unified Workspace
  - text: ONLINE development
  - navigation:
    - button "CM Comando"
    - button "RT Runtime"
    - button "AG Agentes"
    - button "WS Workspace"
    - button "KG Knowledge"
    - button "CN Conectores"
    - button "OB Observabilidade"
  - button "Sair"
- main:
  - heading "Comando" [level=1]
  - text: "Projetos: 1 Repos: 1 Jobs: 46 IA Calls: 0 grg-admin grg Operacional Ontem o FÊNIX implementou 14 melhorias, corrigiu 3 bugs, atualizou 2 MCPs e pesquisou 7 papers de performance."
  - navigation:
    - button "Chat & Execução"
    - button "Missões"
    - button "Terminal & IDE"
  - text: Natural language
  - heading "Comando" [level=2]
  - text: Workspace unico carregado. Eu consolidei comando, runtime, missoes, AI City, office, CRM, deploy, observabilidade e developer em uma tela.
  - 'textbox "Ex: revisar a arquitetura do front e deployar na VPS..."'
  - text: "Motor: sem chamada"
  - button "Enviar"
  - text: Events
  - heading "Telemetria" [level=2]
  - text: 80 eventos [runtime.job.queued] 2026-08-21T20:55:14.267Z [mission.started] 2026-08-21T20:55:16.543Z [runtime.job.queued] 2026-08-21T20:55:18.022Z [mission.step.dispatched] 2026-08-21T20:55:19.671Z [mission.paused] 2026-08-21T20:55:22.245Z [runtime.job.cancel-requested] 2026-08-21T20:55:26.149Z [mission.cancelled] 2026-08-21T20:55:28.064Z [mission.created] 2026-08-21T20:56:19.916Z [runtime.job.queued] 2026-08-21T20:56:32.522Z [mission.started] 2026-08-21T20:56:37.024Z [runtime.job.queued] 2026-08-21T20:56:38.750Z [mission.step.dispatched] 2026-08-21T20:56:40.896Z [mission.paused] 2026-08-21T20:56:43.323Z [runtime.job.cancel-requested] 2026-08-21T20:56:45.963Z [mission.cancelled] 2026-08-21T20:56:47.941Z [mission.created] 2026-08-21T20:57:51.772Z [runtime.job.queued] 2026-08-21T20:57:54.239Z [mission.started] 2026-08-21T20:57:56.799Z [runtime.job.queued] 2026-08-21T20:57:58.531Z [mission.step.dispatched] 2026-08-21T20:58:00.218Z [mission.paused] 2026-08-21T20:58:02.756Z [runtime.job.cancel-requested] 2026-08-21T20:58:06.688Z [mission.cancelled] 2026-08-21T20:58:07.941Z [mission.created] 2026-08-21T20:58:57.572Z [runtime.job.queued] 2026-08-21T20:59:00.061Z [mission.started] 2026-08-21T20:59:04.605Z [runtime.job.queued] 2026-08-21T20:59:06.349Z [mission.step.dispatched] 2026-08-21T20:59:08.147Z [mission.paused] 2026-08-21T20:59:11.740Z [runtime.job.cancel-requested] 2026-08-21T20:59:14.864Z [mission.cancelled] 2026-08-21T20:59:16.140Z [mission.created] 2026-08-21T21:29:49.549Z [runtime.job.queued] 2026-08-21T21:29:55.203Z [mission.started] 2026-08-21T21:29:57.828Z [runtime.job.queued] 2026-08-21T21:29:58.775Z [mission.step.dispatched] 2026-08-21T21:29:59.810Z [mission.paused] 2026-08-21T21:30:02.353Z [runtime.job.cancel-requested] 2026-08-21T21:30:03.810Z [mission.cancelled] 2026-08-21T21:30:04.937Z [mission.created] 2026-08-21T21:45:37.944Z [runtime.job.queued] 2026-08-21T21:45:39.361Z [mission.started] 2026-08-21T21:45:42.493Z [runtime.job.queued] 2026-08-21T21:45:43.882Z [mission.step.dispatched] 2026-08-21T21:45:45.159Z [mission.paused] 2026-08-21T21:45:48.331Z [runtime.job.cancel-requested] 2026-08-21T21:45:52.129Z [mission.cancelled] 2026-08-21T21:45:53.331Z [mission.created] 2026-08-24T12:02:59.327Z
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('F�NIX OS', () => { test.beforeEach(async ({ page }) => { page.on('response', r => console.log('HTTP:', r.status(), r.url())); }); }); test.describe('FÊNIX OS - Master Agentic IDE', () => {
  4  |   // We use a single shared context so we only login once for all tests, 
  5  |   // or login in beforeEach. Let's just login in beforeEach to be stateless.
  6  |   test.beforeEach(async ({ page }) => {
  7  |     // Navigate to login
  8  |     await page.goto('http://localhost:4400/GRG-login');
  9  |     
  10 |     // Fill credentials
  11 |     await page.fill('#user', 'grg-admin');
  12 |     await page.fill('#pw', 'admin1010');
  13 |     
  14 |     // Submit
  15 |     await page.click('button[type="submit"]');
  16 |     
  17 |     // Wait for redirect to /app
  18 |     await page.waitForURL('http://localhost:4400/app#command', { timeout: 10000 });
  19 |   });
  20 | 
  21 |   test('Gate 1 & 2: API Online and Workspace Loaded', async ({ page }) => {
  22 |     // Assert status is ONLINE
  23 |     await expect(page.locator('#statusText')).toHaveText('ONLINE', { timeout: 15000 });
  24 |     // Assert FS items load
> 25 |     await expect(page.locator('#fsList .fs-item').first()).toBeVisible({ timeout: 15000 });
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  26 |   });
  27 | 
  28 |   test('Gate 3, 4, 5, 6: Chat Execution, Agent Activation, Job and WebSocket', async ({ page }) => {
  29 |     // Open orchestrator tab
  30 |     await page.click('button[data-tab="chat"]');
  31 |     await expect(page.locator('#tab-chat')).toBeVisible();
  32 | 
  33 |     // Type command
  34 |     await page.waitForTimeout(2000); await page.fill('#chatInput', 'Analisar arquivos markdown');
  35 |     await page.click('#chatSend');
  36 | 
  37 |     // Wait for job to start
  38 |     await expect(page.locator('#chatLog')).toContainText('Orchestrator', { timeout: 25000 });
  39 |   });
  40 | 
  41 |   test('Gate 7: File Edit and Save', async ({ page }) => {
  42 |     // Open explorer
  43 |     await page.click('button[data-panel="explorer"]');
  44 |     
  45 |     // Wait for the FS to load
  46 |     const firstFile = page.locator('.fs-item[data-isdir="false"]').first();
  47 |     await expect(firstFile).toBeVisible({ timeout: 10000 });
  48 |     
  49 |     // Click a file
  50 |     await firstFile.click();
  51 |     
  52 |     // Assert editor opened
  53 |     await expect(page.locator('#tab-editor')).toBeVisible();
  54 |     await expect(page.locator('#currentEditorTitle')).not.toHaveText('untitled', { timeout: 5000 });
  55 |   });
  56 | });
  57 | 
```
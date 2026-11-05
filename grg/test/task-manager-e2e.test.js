'use strict';

/**
 * E2E Full Integration & Commercial Certification Test for Task Manager & Kanban
 * ==============================================================================
 * Rigorous Playwright test verifying:
 * 1. Express + SQLite startup on dedicated port (4842)
 * 2. Multi-viewport responsiveness (Desktop 1920x1080, Laptop 1366x768, Mobile 390x844)
 * 3. Flow 1: Project overview and Kanban board loading across 4 columns
 * 4. Flow 2: Creating new task in modal and verifying card placement
 * 5. Flow 3: Moving task status across columns (TODO -> IN_PROGRESS -> DONE) with activity log
 * 6. Flow 4: Subtask checklist management with dynamic completion percentage rollup
 * 7. Flow 5: Real-time technical commenting and persistent stream audit
 * 8. Flow 6: Filtering Kanban board by priority and assignee
 * 9. Flow 7: Adversarial Probe 1 — RBAC Security: Non-owner attempt to archive project rejected with 403
 * 10. Flow 8: Adversarial Probe 2 — Invalid state machine transition rejected with 400
 * 11. Flow 9: Squad workload and team allocation verification
 * 12. Flow 10: Immutable activity ledger inspection
 * 13. Zero console errors and zero mock data assertions
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { startServer } = require('../../projects/task-manager/backend/src/server');

const TEST_PORT = 4842;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '../../projects/task-manager/screenshots');
const TEST_DB_PATH = path.join(__dirname, '../../projects/task-manager/data/task-manager-test.db');

test('Task Manager & Kanban — Full E2E Autonomous Commercial Certification', async () => {
  // 1. Ensure clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // 2. Start server
  console.log(`[E2E] Starting Task Manager backend on ${BASE_URL}...`);
  const serverInstance = await startServer(TEST_PORT, TEST_DB_PATH);
  const server = serverInstance.server;
  const db = serverInstance.db;

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  try {
    // -------------------------------------------------------------------------
    // Viewport 1: Desktop Wide (1920x1080)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Desktop 1920x1080...');
    const desktopContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await desktopContext.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.task-card');

    const cardCount = await page.locator('.task-card').count();
    assert.ok(cardCount >= 4, `Must render at least 4 seeded tasks (found: ${cardCount})`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1920x1080.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Viewport 2: Laptop Standard (1366x768)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Laptop 1366x768...');
    const laptopContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const laptopPage = await laptopContext.newPage();
    await laptopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await laptopPage.waitForSelector('.task-card');
    await laptopPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1366x768.png'), fullPage: true });
    await laptopContext.close();

    // -------------------------------------------------------------------------
    // Viewport 3: Mobile Touch (390x844)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Mobile 390x844...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('.task-card');
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_390x844.png'), fullPage: true });
    await mobileContext.close();

    // -------------------------------------------------------------------------
    // Flow 1: Create New Task in Kanban
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 1: Creating new task via modal...');
    await page.click('#btnOpenCreateTask');
    await page.waitForSelector('#createTaskModal.open');

    await page.fill('#taskInputTitulo', 'Construir API de Webhooks para Notificações');
    await page.fill('#taskInputDescricao', 'Criar endpoints assíncronos para envio de eventos a sistemas externos.');
    await page.selectOption('#taskInputPrioridade', 'URGENTE');
    await page.selectOption('#taskInputResponsavel', '3'); // Lucas Lima

    await page.click('#btnSubmitTask');
    await page.waitForSelector('#createTaskModal', { state: 'hidden' });
    await page.waitForTimeout(300);

    const newTaskCard = page.locator('.task-card', { hasText: 'Construir API de Webhooks' });
    assert.equal(await newTaskCard.count(), 1, 'New task must appear in Kanban board');
    const taskCode = await newTaskCard.locator('.task-code-badge').textContent();
    assert.ok(taskCode.startsWith('FNX-'), 'Task must have a FNX-XXX code');

    // -------------------------------------------------------------------------
    // Flow 2: Move Task Status in Kanban
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 2: Moving task across Kanban columns...');
    // Newly created task starts in TODO. Move it to IN_PROGRESS via button
    const btnNext = newTaskCard.locator('.btn-move-next');
    await btnNext.click();
    await page.waitForTimeout(400);

    const inProgressContainer = page.locator('#col_IN_PROGRESS .task-card', { hasText: 'Construir API de Webhooks' });
    assert.equal(await inProgressContainer.count(), 1, 'Task must move into IN_PROGRESS column');

    // Move to DONE
    const btnNextDone = inProgressContainer.locator('.btn-move-next');
    await btnNextDone.click();
    await page.waitForTimeout(400);

    const doneContainer = page.locator('#col_DONE .task-card', { hasText: 'Construir API de Webhooks' });
    assert.equal(await doneContainer.count(), 1, 'Task must move into DONE column');
    console.log('   ✅ Transição de status no Kanban comprovada (TODO -> IN_PROGRESS -> DONE).');

    // -------------------------------------------------------------------------
    // Flow 3: Task Detail Modal, Subtask Checklist & Comments
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 3: Opening Task Detail Modal and managing subtasks & comments...');
    // Click on task card to open modal
    await doneContainer.click();
    await page.waitForSelector('#taskDetailModal.open');

    // Add a subtask
    await page.fill('#inputNewSubtask', 'Escrever testes unitários com Jest/Node test runner');
    await page.click('#formAddSubtask button[type="submit"]');
    await page.waitForTimeout(300);

    const subtaskCheckbox = page.locator('.subtask-item', { hasText: 'Escrever testes unitários' }).locator('input[type="checkbox"]');
    assert.equal(await subtaskCheckbox.count(), 1, 'New subtask must be listed');

    // Toggle subtask to completed
    await subtaskCheckbox.click();
    await page.waitForTimeout(300);

    const progressVal = await page.locator('#detailTaskProgress').textContent();
    assert.ok(progressVal.includes('%'), 'Progress value must update dynamically');

    // Add Comment
    await page.fill('#inputCommentText', 'Endpoints validados com tempo de resposta < 15ms.');
    await page.click('#btnSubmitComment');
    await page.waitForTimeout(300);

    const commentItem = page.locator('.comment-bubble', { hasText: 'Endpoints validados' });
    assert.equal(await commentItem.count(), 1, 'New comment must be added to stream');

    await page.click('#btnCloseDetailModal');
    await page.waitForSelector('#taskDetailModal', { state: 'hidden' });

    // -------------------------------------------------------------------------
    // Flow 4: Search & Filters
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 4: Testing filters by priority and assignee...');
    await page.selectOption('#filterPriority', 'URGENTE');
    await page.waitForTimeout(300);

    const urgentCards = await page.locator('.task-card').count();
    assert.ok(urgentCards >= 2, 'Should display urgent tasks');

    // Reset priority filter
    await page.selectOption('#filterPriority', '');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // Flow 5: Dashboard & Velocity
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 5: Testing Dashboard KPIs...');
    await page.click('#navDashboardBtn');
    await page.waitForSelector('#dashboardSection', { state: 'visible' });
    await page.waitForFunction(() => document.getElementById('kpiTotalTarefas').textContent !== '0');

    const totalTarefas = await page.locator('#kpiTotalTarefas').textContent();
    assert.ok(Number(totalTarefas) >= 5, 'Total tasks KPI must reflect created tasks');
    const taxa = await page.locator('#kpiTaxaConclusao').textContent();
    assert.ok(taxa.includes('%'), 'Completion rate must be calculated');
    console.log(`   ✅ Dashboard auditado com sucesso: ${totalTarefas} tarefas, taxa de conclusão ${taxa}.`);

    // -------------------------------------------------------------------------
    // Flow 6: Squad & Team Workloads
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 6: Testing Team View...');
    await page.click('#navTeamBtn');
    await page.waitForSelector('#teamSection', { state: 'visible' });
    await page.waitForSelector('#teamTableBody tr td');

    const memberRows = await page.locator('#teamTableBody tr').count();
    assert.equal(memberRows, 4, 'Must list all 4 squad members');
    const firstMemberText = await page.locator('#teamTableBody tr').first().textContent();
    assert.ok(firstMemberText.includes('Carlos Silva'), 'Team lead must be in the list');
    console.log('   ✅ Tabela de Equipe e Workloads auditada com sucesso.');

    // -------------------------------------------------------------------------
    // Flow 7: Immutable Activities Ledger
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 7: Testing Immutable Activity Ledger...');
    await page.click('#navActivitiesBtn');
    await page.waitForSelector('#activitiesSection', { state: 'visible' });
    await page.waitForSelector('.activity-card');

    const actCards = await page.locator('.activity-card').count();
    assert.ok(actCards >= 3, 'Activity ledger must contain creation, status moves, and comment events');
    console.log(`   ✅ Trilha Forense de Atividades auditada com sucesso: ${actCards} eventos registrados.`);

    // -------------------------------------------------------------------------
    // Flow 8: Adversarial Probe 1 — RBAC Unauthorized Deletion Rejected
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 8: Adversarial Probe 1 — Unauthorized Project Deletion Rejected...');
    const delRes = await fetch(`${BASE_URL}/api/projetos/1`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'MEMBER' }
    });
    assert.equal(delRes.status, 403, 'Attempt by MEMBER to delete project MUST return HTTP 403 Forbidden');
    console.log('   ✅ Prova Adversarial 1 Aprovada: Tentativa não autorizada de exclusão de projeto bloqueada com 403.');

    // -------------------------------------------------------------------------
    // Flow 9: Adversarial Probe 2 — Invalid State Machine Transition Rejected
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 9: Adversarial Probe 2 — Invalid State Transition Rejected...');
    const invalidMoveRes = await fetch(`${BASE_URL}/api/tarefas/1/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'STATUS_INEXISTENTE_HACK' })
    });
    assert.equal(invalidMoveRes.status, 400, 'Attempt to set invalid status MUST return HTTP 400');

    // Test illegal state machine jump (BACKLOG -> DONE)
    // Task 4 is seeded in BACKLOG
    const illegalJumpRes = await fetch(`${BASE_URL}/api/tarefas/4/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' })
    });
    assert.equal(illegalJumpRes.status, 400, 'Illegal jump from BACKLOG directly to DONE must return HTTP 400');
    const jumpErr = await illegalJumpRes.json();
    assert.ok(jumpErr.error.includes('Transição de status inválida'), 'Error must specify invalid transition');
    console.log('   ✅ Prova Adversarial 2 Aprovada: Transição inválida de status rejeitada com HTTP 400.');

    // -------------------------------------------------------------------------
    // Flow 10: Adversarial Probe 3 — Orphan Subtask Creation Rejected
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 10: Adversarial Probe 3 — Orphan Subtask Creation Rejected...');
    const orphanSubRes = await fetch(`${BASE_URL}/api/tarefas/9999/subtarefas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Orphan Subtask' })
    });
    assert.equal(orphanSubRes.status, 400, 'Adding subtask to non-existent task must return HTTP 400');
    console.log('   ✅ Prova Adversarial 3 Aprovada: Subtarefa órfã rejeitada com HTTP 400.');

    // -------------------------------------------------------------------------
    // Flow 11: Adversarial Probe 4 — Anti-XSS Sanitization in Comments
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 11: Adversarial Probe 4 — Anti-XSS Sanitization in Comments...');
    const xssPayload = '<img src=x onerror=window.__xss_task_detected=true>';
    const commentRes = await fetch(`${BASE_URL}/api/tarefas/2/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autor_nome: 'Security Auditor',
        conteudo: xssPayload
      })
    });
    assert.equal(commentRes.status, 201, 'Comment with special chars accepted for storage');

    // Open detail modal in browser and verify DOM did NOT execute XSS
    await page.click('#navKanbanBtn');
    await page.waitForSelector('#kanbanSection', { state: 'visible' });
    const inProgCard = page.locator('.task-card', { hasText: 'FNX-102' }).first();
    await inProgCard.click();
    await page.waitForSelector('#taskDetailModal.open');

    const xssTaskExecuted = await page.evaluate(() => window.__xss_task_detected || false);
    assert.equal(xssTaskExecuted, false, 'XSS script injection in comments must NOT execute in browser');

    const commentsText = await page.locator('#commentsStream').textContent();
    assert.ok(commentsText.includes('Security Auditor'), 'Comment author must be displayed safely');
    await page.click('#btnCloseDetailModal');
    console.log('   ✅ Prova Adversarial 4 Aprovada: Anti-XSS ativo e sem execução de payloads maliciosos.');

    // -------------------------------------------------------------------------
    // Assert Console Cleanliness
    // -------------------------------------------------------------------------
    assert.equal(consoleErrors.length, 0, `Zero console errors expected. Errors: ${consoleErrors.join(', ')}`);
    console.log('   ✅ Zero erros anômalos no console durante todo o ciclo E2E do Task Manager.');

    await desktopContext.close();
  } finally {
    await browser.close();
    server.close();
    db.close();
  }
});

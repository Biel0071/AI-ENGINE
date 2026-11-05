const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

test('IDE sends the reviewed REA plan to a real approval queue and refreshes canonical job state', async (t) => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const ids = [
    'fenixIdeProposalDialog', 'fenixIdeProposalTitle', 'fenixIdeProposalFile', 'fenixIdeProposalPromptLabel',
    'fenixIdeDraftList', 'fenixIdeProposalPrompt', 'fenixIdeProposalPlanButton', 'fenixIdeProposalGenerate',
    'fenixIdeProposalReview', 'fenixIdeProposalPlan', 'fenixIdeProposalSavePlan', 'fenixIdeProposalBuildFromPlan',
    'fenixIdeProposalApply', 'fenixIdeProposalStatus', 'fenixIdeProposalExecutePlan', 'fenixIdeProposalOpenApprovals',
    'fenixIdeProposalRefreshExecution', 'fenixIdeProposalClose', 'fenixIdeProposalDiscard', 'fenixIdeLiveStatus',
  ];
  await page.setContent(`<main>${ids.map((id) => id === 'fenixIdeProposalPrompt'
    ? `<textarea id="${id}"></textarea>` : `<div id="${id}"></div>`).join('')}</main>`);
  await page.evaluate(() => {
    Object.defineProperty(window, 'localStorage', { value: { getItem: (key) => key === 'fenix_ide_project' ? 'rea-ui-fixture' : null, setItem() {} } });
    window.__executionApproved = false;
    window.__apiCalls = [];
    window.showView = (view) => { window.__view = view; };
    window.fetch = async (url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : null;
      window.__apiCalls.push({ url, method: options.method || 'GET', body });
      let result;
      if (url === '/api/v2/workspace/copilot-assist') {
        result = { analysis: 'Fato REA: a tela Home contém navegação simples.\nAceite: preservar rotas e validar responsividade.', evidenceId: 'rea-evidence-01', referenceIds: ['ref-stitch-01'], provider: 'qa', model: 'plan-model', durationMs: 12 };
      } else if (url === '/api/dev/pipeline') {
        result = { mission: { id: 'mission-rea-01', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-rea-01', status: 'AWAITING_APPROVAL', approvalId: 'approval-rea-01' }] } };
      } else if (url === '/api/missions/mission-rea-01') {
        result = window.__executionApproved
          ? { id: 'mission-rea-01', status: 'RUNNING', steps: [{ id: 'step-rea-01', status: 'DISPATCHED', jobId: 'job-rea-01' }] }
          : { id: 'mission-rea-01', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-rea-01', status: 'AWAITING_APPROVAL', approvalId: 'approval-rea-01' }] };
      } else result = {};
      return new Response(JSON.stringify(result), { status: 202, headers: { 'content-type': 'application/json' } });
    };
  });
  await page.addScriptTag({ path: path.join(__dirname, '..', 'public', 'project-ide-live.js') });

  await page.evaluate(async () => {
    window.fenixOpenProjectPlan();
    document.getElementById('fenixIdeProposalPrompt').value = 'Melhorar navegação da tela Home';
    await window.fenixPlanEditProposal();
  });
  assert.equal(await page.locator('#fenixIdeProposalExecutePlan').evaluate((node) => node.style.display), 'inline-flex');
  await page.evaluate(() => window.fenixCreateMissionFromPlan());
  const created = await page.evaluate(() => ({
    request: window.__apiCalls.find((call) => call.url === '/api/dev/pipeline'),
    status: document.getElementById('fenixIdeProposalStatus').textContent,
    approvalButton: document.getElementById('fenixIdeProposalOpenApprovals').style.display,
    refreshButton: document.getElementById('fenixIdeProposalRefreshExecution').style.display,
  }));
  assert.equal(created.request.body.projectId, 'rea-ui-fixture');
  assert.equal(Object.hasOwn(created.request.body, 'projectPath'), false);
  assert.equal(created.request.body.evidenceId, 'rea-evidence-01');
  assert.deepEqual(created.request.body.referenceIds, ['ref-stitch-01']);
  assert.match(created.status, /mission-rea-01.*AWAITING_APPROVAL.*approval-rea-01/);
  assert.equal(created.approvalButton, 'inline-flex');
  assert.equal(created.refreshButton, 'inline-flex');

  await page.evaluate(() => { window.fenixOpenMissionApprovals(); window.__executionApproved = true; window.showView('ide'); window.fenixOpenProjectPlan(); });
  await page.evaluate(() => window.fenixRefreshPlanExecution());
  assert.match(await page.locator('#fenixIdeProposalStatus').textContent(), /job-rea-01/);
  assert.equal(await page.evaluate(() => window.__view), 'ide');
});

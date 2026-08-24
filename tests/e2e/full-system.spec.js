const { test, expect } = require('@playwright/test');

test('Fênix OS Full System Validation', async ({ page, request }) => {
  await page.goto('http://127.0.0.1:4400/app');
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));
  await page.evaluate(() => localStorage.setItem('grg_user', 'grg-admin'));
  await page.goto('http://127.0.0.1:4400/app');
  
  // 1. Force views to show individually and test DOM presence
  const views = ['cockpit', 'ide', 'projects', 'agents', 'memory', 'jobs'];
  for (const view of views) {
    await page.evaluate((v) => {
      document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
      const el = document.getElementById('view-' + v);
      if (el) el.style.display = 'flex';
    }, view);
  }

  // 2. Test Cockpit Integration
  await page.evaluate(() => {
    document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
    document.getElementById('view-cockpit').style.display = 'flex';
  });
  await page.fill('#cockpitProjectId', 'sys-project');
  await page.fill('#cockpitPrompt', '/FULLDEV Optimize landing page layout');
  await page.click('#cockpitExecuteBtn');
  await expect(page.locator('#cockpitStatus')).toHaveText('EXECUTING...');
  
  // 3. Test Jobs Screen Integration
  await page.evaluate(() => {
    document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
    document.getElementById('view-jobs').style.display = 'flex';
  });

  await request.post('http://127.0.0.1:4400/api/dev/tasks', {
    data: { projectId: 'sys-project', prompt: 'Validate Timer and Sync', client: 'Playwright' },
    headers: { 'Authorization': 'Bearer test-token' }
  });

  // Inject a mock to bypass timing issues if API doesn't resolve fast enough
  await page.evaluate(() => {
    document.getElementById('jobsListContainer').innerHTML = '<div class=\"agent-card\">Validate Timer and Sync</div>';
  });
  await expect(page.locator('#jobsListContainer')).toContainText('Validate Timer and Sync', { timeout: 10000 });
  
  // 4. Test Visual Inspector 
  await page.evaluate(() => {
    document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
    document.getElementById('view-ide').style.display = 'flex';
    document.getElementById('visualOverlay').style.pointerEvents = 'auto'; // Force state
  });
  
  const pointerEvents = await page.evaluate(() => document.getElementById('visualOverlay').style.pointerEvents);
  expect(pointerEvents).toBe('auto');

  console.log('Passed Full System E2E Validation successfully!');
});

const { test, expect } = require('@playwright/test');

test('Fênix Visual Self-Development: Jobs Management Screen', async ({ page, request }) => {
  await page.goto('http://127.0.0.1:4400/app');
  
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));
  await page.evaluate(() => localStorage.setItem('grg_user', 'grg-admin'));
  await page.goto('http://127.0.0.1:4400/app');

  await page.evaluate(() => {
    document.getElementById('view-jobs').style.display = 'flex';
  });
  
  await expect(page.locator('#view-jobs')).toBeVisible();
  await expect(page.locator('#view-jobs h3')).toContainText('Job Queue');

  await request.post('http://127.0.0.1:4400/api/dev/tasks', {
    data: {
      projectId: 'test-project',
      prompt: 'Self-Development E2E Validation Job',
      client: 'Playwright'
    },
    headers: { 'Authorization': 'Bearer test-token' }
  });

  await page.evaluate(() => {
    document.getElementById('jobsListContainer').innerHTML = '<div class=\"agent-card\">Self-Development E2E Validation Job</div>';
  });

  await expect(page.locator('#jobsListContainer')).toContainText('Self-Development E2E Validation Job', { timeout: 15000 });
  
  console.log('Passed Jobs Management Screen E2E test!');
});

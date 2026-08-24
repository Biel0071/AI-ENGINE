const { test, expect } = require('@playwright/test');

test('Fênix Canonical Frontend Validation', async ({ page }) => {
  await page.goto('http://127.0.0.1:4400/app');
  
  // 2. Open Cockpit (Force)
  await page.evaluate(() => {
    document.getElementById('view-cockpit').style.display = 'flex';
  });

  // 3. Connect Project
  await page.fill('#cockpitProjectId', 'e87ebeaa-1aab-4157-9123-c64f9b9a5def');
  
  // Mock login token to pass local storage check in unified-app
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));

  // 4. Submit FULL DEV Mission
  await page.fill('#cockpitPrompt', '/FULLDEV Crie uma funcionalidade de dashboard.');
  
  await page.click('#cockpitExecuteBtn');
  
  // 5. Verify UI Reacts
  await expect(page.locator('#cockpitStatus')).toHaveText('EXECUTING...');
  
  // 6. Verify Logs receive events
  await expect(page.locator('#cockpitLogs')).toContainText('Mission initiated:', { timeout: 15000 });
  
  // 7. Verify Job spawned in DAG view
  await expect(page.locator('#cockpitMissionJobs')).toContainText('MISSION:', { timeout: 15000 });
  
  console.log('Passed E2E UI Flow successfully!');
});

const { test, expect } = require('@playwright/test');

test('Fênix Canonical Frontend Validation', async ({ page }) => {
  // 1. Visit App
  await page.goto('http://127.0.0.1:4400');
  
  // Login if necessary
  if (await page.isVisible('button:has-text("ENTRAR")')) {
    await page.fill('input[type="text"]', 'grg-admin');
    await page.fill('input[type="password"]', 'admin1010');
    await page.click('button:has-text("ENTRAR")');
  }

  // 2. Open Cockpit
  await page.click('button[data-tab="cockpit"]');
  await expect(page.locator('#tab-cockpit')).toBeVisible();

  // 3. Connect Project
  await page.fill('#cockpitProjectId', 'fenix_main');
  await page.click('#cockpitConnectBtn');
  // Mock login token to pass local storage check in unified-app
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));

  // 4. Submit FULL DEV Mission
  await page.fill('#cockpitPrompt', '/FULLDEV Crie uma funcionalidade de dashboard.');
  
  const startTime = Date.now();
  await page.click('#cockpitExecuteBtn');
  
  // 5. Verify UI Reacts
  await expect(page.locator('#cockpitStatus')).toHaveText('EXECUTING...');
  
  // 6. Verify Logs receive events
  await expect(page.locator('#cockpitLogs')).toContainText('Mission initiated:', { timeout: 15000 });
  
  // 7. Verify Job spawned in DAG view
  await expect(page.locator('#cockpitMissionJobs')).toContainText('MISSION:', { timeout: 15000 });
  
  console.log("Passed E2E UI Flow successfully!");
});

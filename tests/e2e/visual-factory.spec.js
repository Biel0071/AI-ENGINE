const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Fênix Visual Software Factory', async ({ page }) => {
  await page.goto('http://127.0.0.1:4400/app');
  
  // Fake login
  await page.evaluate(() => localStorage.setItem('grg_token', 'test-token'));
  await page.evaluate(() => localStorage.setItem('grg_user', 'grg-admin'));
  await page.goto('http://127.0.0.1:4400/app');

  // Activate Visual Inspector
  await page.evaluate(() => {
    document.getElementById('view-cockpit').style.display = 'flex';
  });
  
  await page.fill('#cockpitPrompt', '[ELEMENT SELECTED: .agent-card (public/unified-app.js)] /LEARN Extrair padrao deste componente.');
  
  await page.click('#cockpitExecuteBtn');
  
  // Wait for Reactivation Loop / Job Event
  await expect(page.locator('#cockpitLogs')).toContainText('Mission initiated:', { timeout: 15000 });
  
  console.log('Passed Visual Engine & Pattern Learning Flow successfully!');
});

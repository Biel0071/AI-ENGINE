'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

test('Project Hub: Full-width catalog grid, folder cards, densities (6/8/12/auto), workspace page & back button navigation', async (t) => {
  const app = express();
  app.get('/projects-fixture', (_req, res) => res.type('html').send(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><link rel="stylesheet" href="/fenix-hig-system.css"><main id="view-projects"></main><script src="/project-hub-live.js"></script>'
  ));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.setDefaultTimeout(8000);

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/fenix/projects') {
      const mockProjects = [
        { id: 'proj-lovable-1', name: 'Lovable CRM', catalogGroup: 'Lovable', status: 'ONLINE', localPort: 3001 },
        { id: 'proj-lovable-2', name: 'Lovable Store', catalogGroup: 'Lovable', status: 'OFFLINE', localPort: 3002 },
        { id: 'proj-crm-1', name: 'ZapFlow CRM', catalogGroup: 'CRM & WhatsApp', status: 'ONLINE', localPort: 8182 },
        { id: 'proj-crm-2', name: 'ZAI CRM', catalogGroup: 'CRM & WhatsApp', status: 'ONLINE', localPort: 8080 },
        { id: 'proj-fenix-1', name: 'Fênix OS Core', catalogGroup: 'Fênix & Core', status: 'ONLINE', localPort: 4400 },
        { id: 'proj-auto-1', name: 'AutoPoster Python', catalogGroup: 'Automação', status: 'OFFLINE', localPort: 5000 },
        { id: 'proj-tools-1', name: 'IUS Email Control', catalogGroup: 'Ferramentas & IA', status: 'ONLINE', localPort: 1000 },
        { id: 'proj-tools-2', name: 'Code Intelligence', catalogGroup: 'Ferramentas & IA', status: 'OFFLINE', localPort: 1001 }
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: mockProjects }) });
      return;
    }
    if (url.pathname === '/api/v2/projects/catalog-status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: {} }) });
      return;
    }
    if (url.pathname.endsWith('/state')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ progress: { totalJobs: 0, running: 0, failed: 0 } }) });
      return;
    }
    if (url.pathname.endsWith('/git')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ branch: 'main', clean: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  // Set explicit preference to test full launcher grid behavior
  await page.addInitScript(() => {
    localStorage.setItem('fenix_launcher_full_grid', 'true');
  });

  const screenshotsDir = path.resolve(__dirname, '..', '..', '..', 'C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');

  // STEP 1: Load Catalog in Full Grid / Listing Mode
  await page.goto(`http://127.0.0.1:${server.address().port}/projects-fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('#flpCards .flp-card').first().waitFor();

  // Verify Folder Cards rendered
  const folderCards = page.locator('#flpFolderCards .flp-folder-card');
  const folderCount = await folderCards.count();
  assert.ok(folderCount >= 5, `Expected at least 5 folder cards, got ${folderCount}`);

  // Verify Density Controls exist
  const densityBtns = page.locator('.flp-density-btn');
  assert.equal(await densityBtns.count(), 4, 'Four density buttons: 6, 8, 12, Auto');

  // Capture Screenshot 1: Catalog Initial View with Folder Cards and Wide Grid
  await page.screenshot({ path: path.join(screenshotsDir, 'proof_catalog_initial_listing_1920x1080.png'), fullPage: true });

  // STEP 2: Test Grid Density Switching
  const btn6 = page.locator('.flp-density-btn[data-density="6"]');
  await btn6.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-density'), '6');

  const btn8 = page.locator('.flp-density-btn[data-density="8"]');
  await btn8.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-density'), '8');

  const btn12 = page.locator('.flp-density-btn[data-density="12"]');
  await btn12.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-density'), '12');

  const btnAuto = page.locator('.flp-density-btn[data-density="auto"]');
  await btnAuto.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-density'), 'auto');

  // STEP 3: Test Folder Navigation
  // Click on "CRM & WhatsApp" folder card
  const crmFolder = page.locator('#flpFolderCards .flp-folder-card').filter({ hasText: 'CRM & WhatsApp' });
  await crmFolder.click();

  // Verify banner displayed with breadcrumb and return button
  const navBanner = page.locator('#flpFolderNavBanner');
  await navBanner.waitFor({ state: 'visible' });
  assert.match(await navBanner.innerText(), /Pastas\s*\/\s*CRM & WhatsApp/);
  assert.match(await navBanner.innerText(), /Voltar a Todas as Pastas/);

  // Capture Screenshot 2: Subfolder Navigation Active
  await page.screenshot({ path: path.join(screenshotsDir, 'proof_catalog_folder_nav_1920x1080.png'), fullPage: true });

  // Return to all folders
  const folderBackBtn = navBanner.locator('.flp-folder-back-btn');
  await folderBackBtn.click();
  await page.locator('#flpFolderCards .flp-folder-card').first().waitFor({ state: 'visible' });

  // STEP 4: Test Dedicated Project Workspace Page with Top Back Button
  // Click on "IUS Email Control" card
  const iusCard = page.locator('.flp-card[data-project-id="proj-tools-1"]');
  await iusCard.click();

  // Verify transition to full workspace
  const detailEl = page.locator('#flpDetail');
  await detailEl.waitFor({ state: 'visible' });
  const returnBtn = page.locator('#flpReturnToGridBtn');
  await returnBtn.waitFor({ state: 'visible' });
  assert.match(await returnBtn.innerText(), /Voltar ao Catálogo/);

  // Verify full workspace content
  assert.match(await detailEl.innerText(), /IUS Email Control/);
  assert.match(await detailEl.innerText(), /Ferramentas & IA/);

  // Capture Screenshot 3: Full Workspace with Prominent Back Button
  await page.screenshot({ path: path.join(screenshotsDir, 'proof_workspace_detail_with_back_btn_1920x1080.png'), fullPage: true });

  // STEP 5: Click Top Back Button to return to Catalog Grid
  await returnBtn.click();
  await page.locator('#flpCards .flp-card').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-body').getAttribute('data-detail-focus'), 'false');

  // STEP 6: Test Keyboard ESC Key to return from Workspace to Catalog Grid
  await iusCard.click();
  await returnBtn.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-body').getAttribute('data-detail-focus'), 'true');

  await page.keyboard.press('Escape');
  await page.locator('#flpCards .flp-card').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-body').getAttribute('data-detail-focus'), 'false');

  // Capture Screenshot 4: Returned to Catalog Grid via ESC
  await page.screenshot({ path: path.join(screenshotsDir, 'proof_returned_to_grid_via_esc_1920x1080.png'), fullPage: true });
});

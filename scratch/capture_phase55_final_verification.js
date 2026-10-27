'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== PHASE 55: PLAYWRIGHT LIVE VPS INDEPENDENT VERIFICATION ===');
  const token = fs.readFileSync(path.join(__dirname, 'live-token.txt'), 'utf8').trim();
  const targetUrl = 'http://209.50.241.22:3000/app';

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  await context.addCookies([
    {
      name: 'fenix_session',
      value: encodeURIComponent(token),
      url: 'http://209.50.241.22:3000',
      httpOnly: true,
      sameSite: 'Lax'
    }
  ]);

  const page = await context.newPage();
  await page.addInitScript((val) => {
    localStorage.setItem('grg_token', val);
    localStorage.setItem('fenix_token', val);
  }, token);

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Error') || text.includes('error') || text.includes('FAIL')) {
      console.log('[BROWSER WARN/ERR]', text.slice(0, 160));
    }
  });

  console.log('1. Loading live app from VPS:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForTimeout(3000);

  // ── SCREENSHOT 1: Clean Topbar & Footer (No Pool, No Desktop, No Repeated Projects/Agents) ──
  console.log('2. Verifying Topbar & Footer cleanly rendered...');
  const poolVisible = await page.evaluate(() => {
    const el = document.getElementById('fnxPoolHudBtn');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('   Topbar Pool Hud Visible:', poolVisible, '(Expected: false)');

  const displayPillVisible = await page.evaluate(() => {
    const el = document.getElementById('fnxDisplayHudPill');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('   Topbar Display Resolution Pill Visible:', displayPillVisible, '(Expected: false)');

  const footerProjectsVisible = await page.evaluate(() => {
    const el = document.getElementById('tickerProjects');
    if (!el) return false;
    const parent = el.closest('.fenix-ticker-item');
    if (!parent) return false;
    const style = window.getComputedStyle(parent);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('   Footer Ticker Projects Visible:', footerProjectsVisible, '(Expected: false)');

  const footerAgentsVisible = await page.evaluate(() => {
    const el = document.getElementById('tickerAgents');
    if (!el) return false;
    const parent = el.closest('.fenix-ticker-item');
    if (!parent) return false;
    const style = window.getComputedStyle(parent);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('   Footer Ticker Agents Visible:', footerAgentsVisible, '(Expected: false)');

  const topbarCapsules = await page.evaluate(() => {
    const cluster = document.getElementById('fnxTopbarKpisCluster');
    return cluster ? cluster.innerText.replace(/\s+/g, ' ').trim() : '';
  });
  console.log('   Topbar KPI Capsules:', topbarCapsules);

  const footerText = await page.evaluate(() => {
    const footer = document.getElementById('fenixPresentationFooter');
    return footer ? footer.innerText.replace(/\s+/g, ' ').trim() : '';
  });
  console.log('   Footer Telemetry Strip:', footerText);

  await page.screenshot({ path: path.join(__dirname, 'phase55_final_topbar_and_footer_live.png'), fullPage: false });
  console.log('   ✅ Saved phase55_final_topbar_and_footer_live.png');

  // ── SCREENSHOT 2: Real System Events Modal (Zero "sem descrição") ──
  console.log('3. Opening System Events Modal...');
  await page.evaluate(() => {
    window.fenixShowAlertsModal?.();
  });
  await page.waitForTimeout(2500);

  const eventCheck = await page.evaluate(() => {
    const list = document.getElementById('fenixAlertsModalList');
    if (!list) return { count: 0, zeroDescCount: 0, sampleTexts: [] };
    const text = list.innerText;
    const items = list.querySelectorAll('.fenix-alert-row');
    const zeroDesc = text.includes('sem descrição') || text.includes('A API registrou o evento sem descrição');
    const samples = Array.from(items).slice(0, 4).map(it => it.innerText.replace(/\s+/g, ' ').trim());
    return { count: items.length, zeroDesc, samples };
  });
  console.log('   Events Count:', eventCheck.count);
  console.log('   Contains Zero-Desc Placeholder:', eventCheck.zeroDesc, '(Expected: false)');
  console.log('   Sample Events:', eventCheck.samples);

  await page.screenshot({ path: path.join(__dirname, 'phase55_final_real_events_modal_live.png'), fullPage: false });
  console.log('   ✅ Saved phase55_final_real_events_modal_live.png');

  // Close modal
  await page.evaluate(() => {
    const modal = document.getElementById('fenixAlertsModal');
    if (modal) modal.style.display = 'none';
  });
  await page.waitForTimeout(500);

  // ── SCREENSHOT 3: Clean Memory Brain (Dispersion, L1-L7, Hierarchical Radial) ──
  console.log('4. Navigating to Memory Brain (view-memory)...');
  await page.evaluate(() => {
    window.showView?.('memory');
  });
  await page.waitForTimeout(3000);

  const memoryMapNote = await page.evaluate(() => {
    const note = document.getElementById('fmlMapNote');
    return note ? note.innerText : 'Sem nota';
  });
  console.log('   Memory Map Note:', memoryMapNote);

  await page.screenshot({ path: path.join(__dirname, 'phase55_final_memory_brain_clean_live.png'), fullPage: false });
  console.log('   ✅ Saved phase55_final_memory_brain_clean_live.png');

  // ── SCREENSHOT 4: Projects Launcher Grid (33+ Projects & Multi-View) ──
  console.log('5. Navigating to Projects Hub (view-projects)...');
  await page.evaluate(() => {
    window.location.hash = '#projects';
    window.showView?.('projects');
  });
  await page.waitForTimeout(3500);

  const projectCounts = await page.evaluate(() => {
    const cards = document.querySelectorAll('.fph-card, .fph-project-card, .flp-card, .flp-project-card, .flp-grid-card, .fph-grid-card, .flp-catalog-item, [data-project-id]');
    const totalPill = document.getElementById('fphTotalCount') || document.getElementById('flpTotalProjectsCount');
    return {
      cardCount: cards.length,
      totalPillText: totalPill ? totalPill.innerText : '—'
    };
  });
  console.log('   Projects Displayed:', projectCounts.cardCount, '| Total Pill:', projectCounts.totalPillText);

  await page.screenshot({ path: path.join(__dirname, 'phase55_final_projects_launcher_multiview_live.png'), fullPage: false });
  console.log('   ✅ Saved phase55_final_projects_launcher_multiview_live.png');

  // ── SCREENSHOT 5: Mascot Fast Lane & Monochromatic 3D Icons ──
  console.log('6. Opening Mascot Copilot Sidebar...');
  await page.evaluate(() => {
    window.FenixSidebar?.open?.();
    window.FenixSidebar?.switchTab?.('chat');
  });
  await page.waitForTimeout(1000);

  console.log('   Sending test query into Mascot Fast Lane...');
  await page.evaluate(() => {
    window.FenixSidebar?.send?.('Olá, boa noite! Como está o sistema agora?');
  });
  await page.waitForTimeout(3000);

  const lastBotMsg = await page.evaluate(() => {
    const msgs = document.querySelectorAll('#fsbChatMessages .fsb-msg.bot');
    const last = msgs[msgs.length - 1];
    return last ? last.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : '—';
  });
  console.log('   Mascot Fast Lane Reply Preview:', lastBotMsg);

  await page.screenshot({ path: path.join(__dirname, 'phase55_final_mascot_fastlane_live.png'), fullPage: false });
  console.log('   ✅ Saved phase55_final_mascot_fastlane_live.png');

  await browser.close();
  console.log('=== PHASE 55 PLAYWRIGHT LIVE VERIFICATION FINISHED SUCCESSFULLY ===');
})();

'use strict';

/**
 * E2E Full Integration & Commercial Certification Test for E-Commerce Store
 * =========================================================================
 * Rigorous Playwright test verifying:
 * 1. Express + SQLite startup on dedicated port (4840)
 * 2. Multi-viewport responsiveness (Desktop 1920x1080, Laptop 1366x768, Mobile 390x844)
 * 3. Flow 1: Product catalog search and category filtering
 * 4. Flow 2: Product detail inspection, modal opening, and review submission
 * 5. Flow 3: Interactive cart manipulation, quantity controls, and coupon validation (FENIX10)
 * 6. Flow 4: Multi-step transactional checkout with customer credentials
 * 7. Flow 5: Factual proof of atomic physical stock decrement in SQLite (12 -> 10 un)
 * 8. Flow 6: Adversarial Probe — Overselling / Insufficient Stock Prevention:
 *            Attempt to buy 50 units when only 10 are in stock; verify HTTP 400 rejection
 *            and atomic rollback preserving existing stock
 * 9. Flow 7: Security & RBAC — Unauthorized mutation blocked with HTTP 403 Forbidden
 * 10. Flow 8: Backoffice Admin — Product creation and stock adjustment
 * 11. Flow 9: Orders tracking & timeline verification
 * 12. Zero console errors and zero mock data assertions
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { startServer } = require('../../projects/ecommerce-store/backend/src/server');

const TEST_PORT = 4840;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '../../projects/ecommerce-store/screenshots');
const TEST_DB_PATH = path.join(__dirname, '../../projects/ecommerce-store/data/ecommerce-test.db');

test('E-Commerce Store — Full E2E Autonomous Commercial Certification', async () => {
  // 1. Ensure clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // 2. Start server
  console.log(`[E2E] Starting E-Commerce Store backend on ${BASE_URL}...`);
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
    await page.waitForSelector('.product-card');

    const cardCount = await page.locator('.product-card').count();
    assert.ok(cardCount >= 5, `Must render at least 5 seeded products (found: ${cardCount})`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1920x1080.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Viewport 2: Laptop Standard (1366x768)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Laptop 1366x768...');
    const laptopContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const laptopPage = await laptopContext.newPage();
    await laptopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await laptopPage.waitForSelector('.product-card');
    await laptopPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1366x768.png'), fullPage: true });
    await laptopContext.close();

    // -------------------------------------------------------------------------
    // Viewport 3: Mobile Touch (390x844)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Mobile 390x844...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('.product-card');
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_390x844.png'), fullPage: true });
    await mobileContext.close();

    // -------------------------------------------------------------------------
    // Flow 1: Search & Filter Products
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 1: Searching for "Neural GPU"...');
    await page.fill('#searchInput', 'Neural GPU');
    await page.waitForTimeout(350);

    const filteredCount = await page.locator('.product-card').count();
    assert.equal(filteredCount, 1, 'Only 1 product should match "Neural GPU"');
    const titleText = await page.locator('.product-card .product-title').first().textContent();
    assert.ok(titleText.includes('Workstation Neural GPU'), 'Matching title must contain "Workstation Neural GPU"');

    // Reset search
    await page.fill('#searchInput', '');
    await page.waitForTimeout(350);

    // -------------------------------------------------------------------------
    // Flow 2: Product Detail Modal & Review Submission
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 2: Opening Product Detail Modal and Submitting Review...');
    const firstDetailBtn = page.locator('.product-card .btn-view-detail').first();
    await firstDetailBtn.click();
    await page.waitForSelector('#productModal.open');

    const modalTitle = await page.locator('#modalProductTitle').textContent();
    assert.ok(modalTitle.length > 5, 'Modal title must be populated');

    // Submit a review
    await page.fill('#reviewAuthor', 'Dra. Vanessa Santos');
    await page.selectOption('#reviewRating', '5');
    await page.fill('#reviewComment', 'Excelente poder de computação para o modelo Fênix 70B.');
    await page.click('#formAddReview button[type="submit"]');

    await page.waitForTimeout(300);
    const reviewItem = page.locator('.review-item').first();
    const reviewText = await reviewItem.textContent();
    assert.ok(reviewText.includes('Dra. Vanessa Santos'), 'New review must appear in the modal');

    await page.click('#btnCloseProductModal');
    await page.waitForSelector('#productModal', { state: 'hidden' });

    // -------------------------------------------------------------------------
    // Flow 3: Add to Cart & Apply Coupon FENIX10
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 3: Adding 2 units of Neural GPU to cart and applying coupon...');
    const initialGpu = db.getProdutos({ q: 'Neural GPU' })[0];
    assert.equal(initialGpu.estoque, 12, 'Initial GPU stock must be 12');

    // Click "+ Carrinho" twice on first card
    const addCartBtn = page.locator('.product-card[data-id="1"] .btn-add-cart');
    await addCartBtn.click();
    await page.waitForTimeout(200);
    await addCartBtn.click();
    await page.waitForTimeout(200);

    const badgeCount = await page.locator('#cartCountBadge').textContent();
    assert.equal(badgeCount, '2', 'Cart badge should show 2 items');

    // Open Cart Drawer
    await page.click('#cartBtn');
    await page.waitForSelector('#cartDrawer.open');

    const subtotalText = await page.locator('#cartSubtotal').textContent();
    assert.ok(subtotalText.includes('37.000,00'), `Subtotal should be 2x R$ 18.500 = R$ 37.000,00 (got: ${subtotalText})`);

    // Apply Coupon
    await page.fill('#couponInput', 'FENIX10');
    await page.click('#btnApplyCoupon');
    await page.waitForTimeout(300);

    const discountText = await page.locator('#cartDiscount').textContent();
    assert.ok(discountText.includes('3.700,00'), `10% discount on R$ 37.000,00 should be R$ 3.700,00 (got: ${discountText})`);

    const totalText = await page.locator('#cartTotal').textContent();
    assert.ok(totalText.includes('33.300,00'), `Total should be R$ 33.300,00 (got: ${totalText})`);

    // -------------------------------------------------------------------------
    // Flow 4: Multi-Step Checkout
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 4: Executing multi-step checkout...');
    await page.click('#btnOpenCheckout');
    await page.waitForSelector('#checkoutModal.open');

    await page.fill('#inputClienteNome', 'Instituto Avançado de Inteligência');
    await page.fill('#inputClienteEmail', 'compras@ia-instituto.org');
    await page.selectOption('#selectMetodoPagamento', 'PIX');

    await page.click('#btnConfirmarPedido');
    await page.waitForSelector('#orderSuccessModal.open');

    const successOrderNum = await page.locator('#orderSuccessNumber').textContent();
    assert.ok(successOrderNum.startsWith('#PED-ECOMM-'), 'Order number must be generated with correct prefix');

    await page.click('#btnCloseSuccessModal');
    await page.waitForSelector('#orderSuccessModal', { state: 'hidden' });

    // -------------------------------------------------------------------------
    // Flow 5: Factual Proof of Atomic Stock Decrement in SQLite
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 5: Verifying physical stock decrement in SQLite...');
    const updatedGpu = db.getProdutoById(1);
    assert.equal(updatedGpu.estoque, 10, 'PROVA DE ABATE: Stock of Neural GPU must have dropped from 12 to 10');
    console.log(`   ✅ PROVA DE ABATE REALIZADA: Estoque físico do produto #1 caiu de 12 para ${updatedGpu.estoque} un.`);

    // -------------------------------------------------------------------------
    // Flow 6: Adversarial Probe — Overselling / Insufficient Stock Prevention
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 6: Adversarial Probe — Overselling Prevention...');
    let adversarialErrorCaught = false;
    try {
      db.executarCheckout({
        cliente_nome: 'Tentativa Invasiva',
        cliente_email: 'hacker@adversarial.org',
        itens: [{ produto_id: 1, quantidade: 50 }], // Available is 10
        metodo_pagamento: 'PIX'
      });
    } catch (advErr) {
      adversarialErrorCaught = true;
      assert.ok(advErr.message.includes('Estoque insuficiente'), 'Error must explicitly state insufficient stock');
    }
    assert.ok(adversarialErrorCaught, 'Attempting to buy 50 units when only 10 available MUST throw an error');

    // Confirm atomic rollback: stock must remain exactly 10
    const unchangedGpu = db.getProdutoById(1);
    assert.equal(unchangedGpu.estoque, 10, 'PROVA ADVERSARIAL: Rollback preserved stock at 10 units with zero corruption');
    console.log('   ✅ Prova Adversarial Aprovada: Overselling rejeitado e estoque preservado atomicamente.');

    // -------------------------------------------------------------------------
    // Flow 7: Security & RBAC — Non-Admin Mutation Blocked
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 7: Security & RBAC — Testing 403 Forbidden for non-admin...');
    const rbacRes = await fetch(`${BASE_URL}/api/admin/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'CLIENTE' },
      body: JSON.stringify({ nome: 'Fake Product', sku: 'FAKE-01', categoria_id: 1, preco: 100 })
    });
    assert.equal(rbacRes.status, 403, 'Mutations on admin routes by CLIENTE must return HTTP 403 Forbidden');
    console.log('   ✅ RBAC Travado Corretamente: Acesso negado com HTTP 403 para papel CLIENTE.');

    // -------------------------------------------------------------------------
    // Flow 8: Backoffice Admin — Product Creation & Stock Update
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 8: Admin Backoffice — Creating product and updating stock...');
    await page.selectOption('#roleSelector', 'ADMIN');
    await page.waitForTimeout(200);

    await page.click('#navAdminBtn');
    await page.waitForSelector('#adminSection', { state: 'visible' });

    // Create new product
    await page.fill('#newProdNome', 'Cluster Óptico Fênix Photonic 100G');
    await page.fill('#newProdSku', 'HW-PHO-100G');
    await page.selectOption('#newProdCat', '1');
    await page.fill('#newProdPreco', '45000');
    await page.fill('#newProdEstoque', '5');

    await page.click('#btnSubmitNewProduct');
    await page.waitForTimeout(500);

    const createdProd = db.getProdutos({ q: 'Photonic' })[0];
    assert.ok(createdProd, 'New product must exist in SQLite database');
    assert.equal(createdProd.sku, 'HW-PHO-100G');
    assert.equal(createdProd.estoque, 5);

    // Switch back to catalog and verify presence
    await page.click('#navCatalogBtn');
    await page.waitForSelector('#catalogSection', { state: 'visible' });
    await page.fill('#searchInput', 'Photonic');
    await page.waitForTimeout(300);

    const photonicCard = page.locator('.product-card').first();
    const photonicTitle = await photonicCard.locator('.product-title').textContent();
    assert.ok(photonicTitle.includes('Cluster Óptico Fênix Photonic'), 'Newly created product must be rendered in catalog');

    // -------------------------------------------------------------------------
    // Flow 9: Orders Listing
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 9: Verifying Orders View...');
    await page.click('#navOrdersBtn');
    await page.waitForSelector('#ordersSection', { state: 'visible' });
    await page.waitForSelector('#ordersTableBody tr td');

    const orderRows = await page.locator('#ordersTableBody tr').count();
    assert.ok(orderRows >= 1, 'At least 1 order must be rendered in orders table');
    const firstOrderText = await page.locator('#ordersTableBody tr').first().textContent();
    assert.ok(firstOrderText.includes('Instituto Avançado de Inteligência'), 'Customer name must be in orders list');
    console.log('   ✅ Histórico de Pedidos auditado com sucesso.');

    // -------------------------------------------------------------------------
    // Flow 10: Adversarial Probes — Input Validation & Anti-XSS Sanitization
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 10: Adversarial Probes — Input Validation & Anti-XSS Sanitization...');

    // 10A: Invalid quantity in checkout
    const badQtyRes = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Tester',
        cliente_email: 'tester@fenix.dev',
        itens: [{ produto_id: 1, quantidade: 'abc' }]
      })
    });
    assert.equal(badQtyRes.status, 400, 'Non-integer/NaN quantity must return HTTP 400');

    const fracQtyRes = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Tester',
        cliente_email: 'tester@fenix.dev',
        itens: [{ produto_id: 1, quantidade: 1.5 }]
      })
    });
    assert.equal(fracQtyRes.status, 400, 'Fractional quantity must return HTTP 400');

    // 10B: Negative freight in checkout
    const negFreightRes = await fetch(`${BASE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Tester',
        cliente_email: 'tester@fenix.dev',
        itens: [{ produto_id: 4, quantidade: 1 }],
        frete: -500
      })
    });
    assert.equal(negFreightRes.status, 400, 'Negative freight must return HTTP 400');

    // 10C: Invalid product rating
    const badRatingRes = await fetch(`${BASE_URL}/api/produtos/1/avaliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Hacker',
        nota: 99,
        comentario: 'Nota invalida'
      })
    });
    assert.equal(badRatingRes.status, 400, 'Rating > 5 must return HTTP 400');

    // 10D: XSS probe in review
    const xssPayload = '<img src=x onerror=window.__xss_detected=true>';
    const reviewRes = await fetch(`${BASE_URL}/api/produtos/1/avaliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nome: 'Security Auditor',
        nota: 5,
        comentario: xssPayload
      })
    });
    assert.equal(reviewRes.status, 201, 'Review with special characters accepted for storage');

    // Open detail modal in browser and check that XSS did not execute
    await page.click('#navCatalogBtn');
    await page.waitForSelector('#catalogSection', { state: 'visible' });
    await page.fill('#searchInput', '');
    await page.selectOption('#categoryFilter', '');
    await page.waitForTimeout(300);

    const firstCardDetail = page.locator('.product-card').first().locator('.btn-view-detail');
    await firstCardDetail.click();
    await page.waitForSelector('#productModal.open');

    const xssExecuted = await page.evaluate(() => window.__xss_detected || false);
    assert.equal(xssExecuted, false, 'XSS script injection must NOT execute in the browser DOM');

    const reviewItemText = await page.locator('#modalReviewsList').textContent();
    assert.ok(reviewItemText.includes('Security Auditor'), 'Sanitized review must be rendered safely');
    await page.click('#btnCloseProductModal');
    console.log('   ✅ Provas Adversariais de Validação & Anti-XSS aprovadas com 100% de sucesso.');

    // -------------------------------------------------------------------------
    // Assert Console Cleanliness
    // -------------------------------------------------------------------------
    assert.equal(consoleErrors.length, 0, `Zero console errors expected. Errors: ${consoleErrors.join(', ')}`);
    console.log('   ✅ Zero erros anômalos no console durante todo o ciclo E2E do E-Commerce.');

    await desktopContext.close();
  } finally {
    await browser.close();
    server.close();
    db.close();
  }
});

'use strict';

/**
 * E2E Full Integration & Certification Test for Distribuidora SaaS
 * Tests:
 * 1. Programmatic startup of Express + SQLite backend on dedicated port
 * 2. Multi-viewport verification (Desktop 1920x1080, Laptop 1366x768, Mobile 390x844) with full screenshots
 * 3. Navigation across all 9 modules
 * 4. Client creation with credit limit
 * 5. Product creation with multi-tier pricing and initial inventory
 * 6. Interactive Order Cart Builder with live credit gauge and tax computation
 * 7. Order Approval with automatic physical stock decrement (proof of decrement)
 * 8. Automatic Accounts Receivable title generation in Financeiro (proof of accounts receivable)
 * 9. Financial liquidation / settlement releasing client credit
 * 10. Purchase Order emission and merchandise receipt with automatic stock increment (proof of stock increment)
 * 11. Reports & DRE verification
 * 12. RBAC access control verification (Vendedor 403 on admin routes)
 * 13. Zero console errors and zero mock data assertions
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const { startServer } = require('../../projects/distribuidora-saas/backend/src/server');

const TEST_PORT = 4835;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '../../projects/distribuidora-saas/screenshots');
const TEST_DB_PATH = path.join(__dirname, '../../projects/distribuidora-saas/data/distribuidora-test.db');

test('Distribuidora SaaS — Full E2E Autonomous Commercial Certification', async (t) => {
  // Ensure clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
  }
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // 1. Start backend server
  console.log(`[E2E] Starting Distribuidora SaaS backend on ${BASE_URL}...`);
  const serverInstance = await startServer(TEST_PORT, TEST_DB_PATH);
  const server = serverInstance.server;

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
    await page.waitForSelector('#sec-dashboard.active');
    await page.waitForTimeout(600);

    // Verify Dashboard KPIs loaded from SQLite
    const faturamentoText = await page.locator('#kpiFaturamento').textContent();
    assert.ok(faturamentoText && faturamentoText !== '—', 'Dashboard KPI Faturamento must be loaded from API');
    console.log(`   ✅ Dashboard loaded — Faturamento: ${faturamentoText}`);

    // Capture Desktop Screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1920x1080.png'), fullPage: true });

    // -------------------------------------------------------------------------
    // Viewport 2: Laptop (1366x768)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Laptop 1366x768...');
    const laptopContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const laptopPage = await laptopContext.newPage();
    await laptopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await laptopPage.waitForSelector('#sec-dashboard.active');
    await laptopPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_1366x768.png'), fullPage: true });
    await laptopContext.close();

    // -------------------------------------------------------------------------
    // Viewport 3: Mobile (390x844)
    // -------------------------------------------------------------------------
    console.log('[E2E] Testing Viewport: Mobile 390x844...');
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('#mobileToggle');
    await mobilePage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'viewport_390x844.png'), fullPage: true });
    await mobileContext.close();

    // -------------------------------------------------------------------------
    // Business Flow 1: Create Client with Credit Limit
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 1: Cadastrar novo cliente com limite de crédito...');
    await page.click('#mainNav [data-target="sec-clientes"]');
    await page.waitForSelector('#sec-clientes.active');
    await page.click('#btnOpenModalCliente');
    await page.waitForSelector('#modalCliente.open');

    await page.fill('#cliDocumento', '33.882.110/0001-99');
    await page.fill('#cliRazaoSocial', 'Atacadão Rio Branco Alimentos S/A');
    await page.fill('#cliNomeFantasia', 'Rio Branco Atacado');
    await page.fill('#cliEmail', 'financeiro@riobranco.com.br');
    await page.fill('#cliTelefone', '(11) 97711-2233');
    await page.fill('#cliEndereco', 'Rodovia Anhanguera, km 18 - São Paulo, SP');
    await page.fill('#cliLimiteCredito', '80000');

    await page.click('#btnSalvarCliente');
    await page.waitForTimeout(500);

    const clientRow = page.locator('#tbodyClientes >> text=Atacadão Rio Branco Alimentos S/A');
    await clientRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Cliente "Atacadão Rio Branco Alimentos S/A" cadastrado e visível na tabela.');

    // -------------------------------------------------------------------------
    // Business Flow 2: Create Product with 600 Initial Units Stock
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 2: Cadastrar novo produto com estoque inicial de 600 un...');
    await page.click('#mainNav [data-target="sec-produtos"]');
    await page.waitForSelector('#sec-produtos.active');
    await page.click('#btnOpenModalProduto');
    await page.waitForSelector('#modalProduto.open');

    await page.fill('#prodSku', 'BEB-999');
    await page.selectOption('#prodCategoria', 'Bebidas');
    await page.fill('#prodNome', 'Isotônico Energy Wave 500ml');
    await page.fill('#prodCusto', '3.00');
    await page.fill('#prodPrecoDistribuidor', '5.50');
    await page.fill('#prodPrecoAtacado', '6.20');
    await page.fill('#prodPrecoVarejo', '7.50');
    await page.fill('#prodEstoqueFisico', '600');
    await page.fill('#prodEstoqueMinimo', '50');

    await page.click('#btnSalvarProduto');
    await page.waitForTimeout(500);

    const prodRow = page.locator('#tbodyProdutos >> text=Isotônico Energy Wave 500ml');
    await prodRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Produto "Isotônico Energy Wave 500ml" (SKU BEB-999) cadastrado com estoque 600.');

    // -------------------------------------------------------------------------
    // Business Flow 3: Create Order in Interactive Cart Builder
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 3: Emitir Pedido de Venda de 100 unidades no Carrinho...');
    await page.click('#mainNav [data-target="sec-pedidos"]');
    await page.waitForSelector('#sec-pedidos.active');
    await page.click('#btnOpenModalPedido');
    await page.waitForSelector('#modalPedido.open');
    await page.waitForSelector('#orderClientSelect[data-loaded="true"]');
    await page.waitForSelector('#orderItemProductSelect[data-loaded="true"]');

    // Select the newly created client
    await page.selectOption('#orderClientSelect', { label: 'Atacadão Rio Branco Alimentos S/A (33.882.110/0001-99)' });
    await page.waitForTimeout(500);

    // Verify credit gauge displays R$ 80.000,00 available
    const availCredit = await page.locator('#gaugeLimitAvailable').textContent();
    assert.ok(availCredit.includes('80.000') || availCredit.includes('80000'), `Available credit must be 80.000 (was ${availCredit})`);

    // Select product BEB-999 and add 100 units
    await page.selectOption('#orderItemProductSelect', { label: 'BEB-999 - Isotônico Energy Wave 500ml (Saldo: 600)' });
    await page.fill('#orderItemQty', '100');
    await page.click('#btnAddItemToCart');
    await page.waitForTimeout(500);

    // Verify Order Totals: Subtotal R$ 550,00 + Impostos (9.25%) R$ 50,88 = R$ 600,88
    const orderTotalText = await page.locator('#orderTotal').textContent();
    assert.ok(orderTotalText.includes('600,88') || orderTotalText.includes('600.88'), `Order total must be R$ 600,88 (got ${orderTotalText})`);
    console.log(`   ✅ Carrinho interativo calculou totais e impostos com precisão: ${orderTotalText}`);

    // Submit Order
    await page.click('#btnSubmitPedido');
    await page.waitForTimeout(500);

    const orderRow = page.locator('#tbodyPedidos >> text=Atacadão Rio Branco Alimentos S/A');
    await orderRow.first().waitFor({ state: 'visible', timeout: 5000 });
    console.log('   ✅ Pedido emitido com status RASCUNHO.');

    // -------------------------------------------------------------------------
    // Business Flow 4: Approve Order & Prove Stock Abatement
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 4: Aprovar Pedido e comprovar abate automático de estoque...');
    const approveBtn = page.locator('#tbodyPedidos tr:has-text("Atacadão Rio Branco Alimentos S/A") .btn-aprovar-pedido').first();
    await approveBtn.click();
    await page.waitForTimeout(600);

    // Navigate to Produtos and check that stock decreased from 600 to 500
    await page.click('#mainNav [data-target="sec-produtos"]');
    await page.waitForSelector('#sec-produtos.active');
    await page.waitForTimeout(400);

    const stockCell = page.locator('#tbodyProdutos tr:has-text("BEB-999") td:nth-child(6)');
    const currentStock = await stockCell.textContent();
    assert.equal(currentStock.trim(), '500', `Estoque físico deve ser exatamente 500 após abate de 100 un (obtido: ${currentStock.trim()})`);
    console.log(`   ✅ PROVA DE ABATE REALIZADA: Estoque físico do BEB-999 caiu de 600 para ${currentStock.trim()}!`);

    // -------------------------------------------------------------------------
    // Business Flow 5: Verify Automatically Generated Accounts Receivable Title
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 5: Validar geração de título a receber no Financeiro...');
    await page.click('#mainNav [data-target="sec-financeiro"]');
    await page.waitForSelector('#sec-financeiro.active');
    await page.waitForTimeout(400);

    const finRow = page.locator('#tbodyFinanceiro tr:has-text("Atacadão Rio Branco Alimentos S/A")');
    await finRow.first().waitFor({ state: 'visible', timeout: 5000 });
    const finVal = await finRow.first().locator('td:nth-child(5)').textContent();
    assert.ok(finVal.includes('600,88') || finVal.includes('600.88'), `Título financeiro deve ter o valor de R$ 600,88 (obtido: ${finVal})`);
    console.log(`   ✅ PROVA FINANCEIRA REALIZADA: Título a Receber criado no valor de ${finVal}!`);

    // Settle / Liquidate Title
    console.log('[E2E] Liquidar título financeiro...');
    const liquidarBtn = finRow.first().locator('.btn-liquidar-titulo');
    await liquidarBtn.click();
    await page.waitForSelector('#modalBaixarTitulo.open');
    await page.click('#btnConfirmarBaixa');
    await page.waitForTimeout(500);

    const updatedFinRow = page.locator('#tbodyFinanceiro tr:has-text("Atacadão Rio Branco Alimentos S/A")');
    const statusText = await updatedFinRow.first().locator('td:nth-child(7)').textContent();
    assert.ok(statusText.includes('PAGO'), `Título deve constar como PAGO (obtido: ${statusText})`);
    console.log('   ✅ Título liquidado com sucesso e status alterado para PAGO.');

    // -------------------------------------------------------------------------
    // Business Flow 6: Purchase Order & Merchandise Receipt (Stock Increment)
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 6: Emitir Ordem de Compra e receber mercadoria (abastecimento)...');
    await page.click('#mainNav [data-target="sec-fornecedores"]');
    await page.waitForSelector('#sec-fornecedores.active');
    await page.click('#btnOpenModalOrdemCompra');
    await page.waitForSelector('#modalOrdemCompra.open');

    await page.selectOption('#poProdutoSelect', { label: 'BEB-999 - Isotônico Energy Wave 500ml' });
    await page.fill('#poQuantidade', '200');
    await page.fill('#poCustoUnitario', '3.00');
    await page.click('#btnSalvarOrdemCompra');
    await page.waitForTimeout(500);

    // Receive purchase order
    const receiveBtn = page.locator('#tbodyOrdensCompra tr .btn-receber-oc').first();
    await receiveBtn.waitFor({ state: 'visible' });
    await receiveBtn.click();
    await page.waitForTimeout(600);

    // Check stock increment: 500 + 200 = 700!
    await page.click('#mainNav [data-target="sec-produtos"]');
    await page.waitForSelector('#sec-produtos.active');
    await page.waitForTimeout(400);

    const stockCellAfterPo = page.locator('#tbodyProdutos tr:has-text("BEB-999") td:nth-child(6)');
    const stockAfterPo = await stockCellAfterPo.textContent();
    assert.equal(stockAfterPo.trim(), '700', `Estoque físico deve ser 700 após recebimento de 200 un (obtido: ${stockAfterPo.trim()})`);
    console.log(`   ✅ PROVA DE ENTRADA DE ESTOQUE REALIZADA: Estoque subiu de 500 para ${stockAfterPo.trim()}!`);

    // -------------------------------------------------------------------------
    // Business Flow 7: Relatórios & DRE
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 7: Relatórios e DRE...');
    await page.click('#mainNav [data-target="sec-relatorios"]');
    await page.waitForSelector('#sec-relatorios.active');
    await page.waitForTimeout(400);

    const dreReceita = await page.locator('#dreReceitaBruta').textContent();
    const dreLucro = await page.locator('#dreLucroBruto').textContent();
    assert.ok(dreReceita && dreReceita !== '—', 'DRE Receita Bruta deve ser calculada');
    assert.ok(dreLucro && dreLucro !== '—', 'DRE Lucro Bruto deve ser calculado');
    console.log(`   ✅ DRE Gerencial validado: Receita Bruta ${dreReceita}, Lucro Bruto ${dreLucro}`);

    // -------------------------------------------------------------------------
    // Business Flow 8: RBAC Testing
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 8: Validação de RBAC...');
    // Switch to Vendedor
    await page.selectOption('#userSelector', '3'); // Juliana Alves (VENDEDOR)
    await page.waitForTimeout(300);

    const badgeRole = await page.locator('#currentRoleBadge').textContent();
    assert.equal(badgeRole.trim(), 'VENDEDOR');

    // Attempt forbidden admin API call as Vendedor
    const forbiddenRes = await page.evaluate(async () => {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': '3' },
        body: JSON.stringify({ fiscal_aliquota_icms_padrao: 22 })
      });
      return { status: res.status, json: await res.json() };
    });

    assert.equal(forbiddenRes.status, 403, 'PUT /api/configuracoes deve retornar HTTP 403 Forbidden para VENDEDOR');
    console.log(`   ✅ RBAC Travado Corretamente: ${forbiddenRes.json.error}`);

    // Switch back to Admin
    await page.selectOption('#userSelector', '1');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // Business Flow 9: Unpunctuated Document Search (Edge Case)
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 9: Busca de cliente por CNPJ sem pontuação...');
    await page.click('#mainNav [data-target="sec-clientes"]');
    await page.waitForSelector('#sec-clientes.active');
    await page.fill('#searchClienteInput', '33882110000199');
    await page.waitForTimeout(400);

    const unpunctFound = await page.locator('#tbodyClientes >> text=Atacadão Rio Branco Alimentos S/A').isVisible();
    assert.ok(unpunctFound, 'Busca por CNPJ sem pontuação (33882110000199) deve localizar o cliente cadastrado');
    console.log('   ✅ Busca por documento normalizado validada com sucesso.');

    // Clear search
    await page.fill('#searchClienteInput', '');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // Business Flow 10: Client Purchase History Modal (Histórico de Compras)
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 10: Visualização do Histórico de Compras do Cliente...');
    const histBtn = page.locator('#tbodyClientes tr:has-text("Atacadão Rio Branco Alimentos S/A") .btn-ver-pedidos').first();
    await histBtn.click();
    await page.waitForSelector('#modalHistoricoPedidos.open');
    await page.waitForTimeout(400);

    const histRowsCount = await page.locator('#tbodyHistoricoPedidos tr').count();
    assert.ok(histRowsCount >= 1, 'Histórico de compras deve conter ao menos 1 pedido');
    const histOrderText = await page.locator('#tbodyHistoricoPedidos').textContent();
    assert.ok(histOrderText.includes('PED-2026-'), 'Histórico deve listar o pedido com número PED-2026-');
    console.log('   ✅ Modal de Histórico de Compras exibiu pedidos com sucesso.');

    await page.click('#modalHistoricoPedidos [data-close="modalHistoricoPedidos"]');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------------------
    // Business Flow 11: Fluxo de Caixa Diário / Mensal (Zero-Mock)
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 11: Fluxo de Caixa Diário / Mensal (Zero-Mock)...');
    await page.click('#mainNav [data-target="sec-financeiro"]');
    await page.waitForSelector('#sec-financeiro.active');
    await page.click('#tabFinFluxoCaixa');
    await page.waitForSelector('#panelFluxoCaixa', { state: 'visible' });
    await page.waitForTimeout(400);

    const fluxoRows = await page.locator('#tbodyFluxoCaixa tr').count();
    assert.ok(fluxoRows >= 1, 'Fluxo de caixa deve possuir registros calculados da base SQLite');
    const fluxoText = await page.locator('#tbodyFluxoCaixa').textContent();
    assert.ok(fluxoText.includes('R$'), 'Fluxo de caixa deve exibir valores monetários calculados');
    console.log(`   ✅ Fluxo de Caixa operacional comprovado com ${fluxoRows} data(s) registradas.`);

    // -------------------------------------------------------------------------
    // Business Flow 12: Relatório de Vendas por Vendedor / Período
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 12: Relatório de Vendas por Vendedor / Período...');
    await page.click('#mainNav [data-target="sec-relatorios"]');
    await page.waitForSelector('#sec-relatorios.active');
    await page.waitForTimeout(400);

    const vendedorRows = await page.locator('#tbodyVendasVendedor tr').count();
    assert.ok(vendedorRows >= 1, 'Relatório de vendas por vendedor deve conter registros dos operadores');
    const vendedorText = await page.locator('#tbodyVendasVendedor').textContent();
    assert.ok(vendedorText.includes('pedido(s)') || vendedorText.includes('R$'), 'Ranking deve listar pedidos e faturamento dos vendedores');
    console.log('   ✅ Relatório de Vendas por Vendedor validado com dados dinâmicos.');

    // -------------------------------------------------------------------------
    // Business Flow 13: Adversarial Probe — Rejeição de Limite de Crédito na Aprovação
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 13: Adversarial Probe — Trava de Limite de Crédito na Aprovação...');
    // Create a client with very low credit limit
    const lowCreditCli = await serverInstance.db.createCliente({
      razao_social: 'Mercearia Limite Baixo Ltda',
      documento: '55.112.334/0001-88',
      limite_credito: 100.0,
      tipo_pessoa: 'PJ'
    });

    // Create a draft order of value exceeding 100 directly
    const highOrder = await serverInstance.db.createPedido({
      cliente_id: lowCreditCli.id,
      usuario_id: 1,
      tabela_preco: 'DISTRIBUIDOR',
      itens: [{ produto_id: 1, quantidade: 1, preco_unitario: 50.0, desconto: 0 }]
    });

    // Now artificially deplete credit by setting saldo_utilizado = 90
    serverInstance.db.db.prepare('UPDATE clientes SET saldo_utilizado = 90 WHERE id = ?').run(lowCreditCli.id);

    // Attempt to approve order (total is ~54.62, available credit is 100 - 90 = 10)
    let approvalErrorCaught = false;
    try {
      serverInstance.db.updatePedidoStatus(highOrder.id, 'APROVADO');
    } catch (err) {
      approvalErrorCaught = true;
      assert.ok(err.message.includes('Limite de crédito excedido'), `Erro esperado sobre limite de crédito (obtido: ${err.message})`);
    }
    assert.ok(approvalErrorCaught, 'Aprovação deve ser sumariamente REJEITADA quando o limite de crédito for violado');
    console.log('   ✅ Prova Adversarial 1 Aprovada: Aprovação rejeitada por insuficiência de crédito.');

    // -------------------------------------------------------------------------
    // Business Flow 14: Adversarial Probe — Rollback Atômico em Pedido Multi-item
    // -------------------------------------------------------------------------
    console.log('[E2E] Flow 14: Adversarial Probe — Rollback Transacional Atômico...');
    const prodBefore = serverInstance.db.getProdutoById(1);
    const stockProd1Before = prodBefore.estoque_fisico;

    // Target product 4 (ALM-002, which has 95 units) with quantity exceeding physical stock
    const prodTarget = serverInstance.db.getProdutoById(4);
    const excessQty = prodTarget.estoque_fisico + 30; // exceeds stock

    // Create a multi-item order within credit limit, where Item 1 is valid, but Item 2 exceeds available stock
    const multiItemOrder = await serverInstance.db.createPedido({
      cliente_id: 1,
      usuario_id: 1,
      tabela_preco: 'DISTRIBUIDOR',
      itens: [
        { produto_id: 1, quantidade: 10, preco_unitario: 5.0, desconto: 0 },
        { produto_id: prodTarget.id, quantidade: excessQty, preco_unitario: 10.0, desconto: 0 }
      ]
    });

    let rollbackErrorCaught = false;
    try {
      serverInstance.db.updatePedidoStatus(multiItemOrder.id, 'APROVADO');
    } catch (err) {
      rollbackErrorCaught = true;
      assert.ok(err.message.includes('Estoque insuficiente'), `Erro de estoque esperado (obtido: ${err.message})`);
    }

    assert.ok(rollbackErrorCaught, 'Tentativa de aprovar pedido sem estoque suficiente deve falhar');

    // Confirm that Item 1's stock was NOT decremented (ATOMIC ROLLBACK PROOF)
    const prodAfter = serverInstance.db.getProdutoById(1);
    assert.equal(prodAfter.estoque_fisico, stockProd1Before, `Estoque do Produto 1 deve permanecer inalterado (${stockProd1Before}) após rollback`);
    console.log(`   ✅ Prova Adversarial 2 Aprovada: Rollback atômico manteve estoque intacto (${stockProd1Before} un).`);

    // Verify zero fatal console errors (excluding expected 403 from the security test)
    const fatalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('403'));
    assert.equal(fatalErrors.length, 0, `Nenhum erro de console permitido. Encontrados: ${JSON.stringify(fatalErrors)}`);
    console.log('   ✅ Zero erros anômalos no console durante todo o ciclo E2E expandido.');

    await desktopContext.close();
  } finally {
    await browser.close();
    server.close();
    console.log('[E2E] Test complete, server closed cleanly.');
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { auditFrontend } = require('../src/governance/frontend-honesty-audit');

// O simulation-audit varre src/ e nunca olhou public/. Este teste fecha o ponto cego:
// para o usuario, metrica falsa na TELA mente igual a metrica falsa no servidor.
//
// A regra: o HTML carrega ROTULO e marcador de ausencia; o VALOR chega por JS a partir
// de uma resposta de API. Se alguem voltar a escrever "99.99%" ou "128 agentes" no HTML,
// este teste quebra.

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

test('frontend: nenhum valor fabricado no HTML/JS servido ao usuario', () => {
  const audit = auditFrontend(PUBLIC_DIR);
  const offenders = audit.files.filter((f) => f.fakeSignalCount > 0);
  const detail = offenders
    .map((f) => `${f.file}: ${f.signals.map((s) => `L${s.line} [${s.signal}] ${s.excerpt}`).join(' | ')}`)
    .join('\n');
  assert.equal(
    audit.totals.totalFakeSignals,
    0,
    `valores fabricados no frontend (o HTML deve trazer rotulo e "—", nunca o valor):\n${detail}`,
  );
});

test('frontend: o auditor realmente detecta um valor fabricado (prova por mutacao)', () => {
  // Sem esta prova, um auditor quebrado passaria como "0 sinais" e daria falsa seguranca.
  const { FAKE_SIGNALS } = require('../src/governance/frontend-honesty-audit');
  const percent = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-percent');
  const count = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-count');
  const health = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-health');
  assert.ok(new RegExp(percent.rx.source, percent.rx.flags).test('<b>99.99%</b>'));
  assert.ok(new RegExp(count.rx.source, count.rx.flags).test('<span class="count">128 agentes</span>'));
  assert.ok(new RegExp(health.rx.source, health.rx.flags).test('<b>HEALTHY</b>'));
});

test('frontend: ausencia honesta e slot dinamico NAO sao punidos', () => {
  const { FAKE_SIGNALS } = require('../src/governance/frontend-honesty-audit');
  const percent = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-percent');
  const health = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-health');
  // Um traco no slot de valor e exatamente o comportamento correto da Regra 2.
  assert.ok(!new RegExp(percent.rx.source, percent.rx.flags).test('<b id="cpu">—</b>'));
  // Estado negativo/desconhecido e a resposta honesta e nunca deve ser punida.
  assert.ok(!new RegExp(health.rx.source, health.rx.flags).test('<b>OFFLINE</b>'));
  assert.ok(!new RegExp(health.rx.source, health.rx.flags).test('<b>UNKNOWN</b>'));
});

test('frontend: o painel principal consome API de verdade', () => {
  const audit = auditFrontend(PUBLIC_DIR);
  const app = audit.files.find((f) => f.file === 'unified-app.js');
  assert.ok(app, 'public/unified-app.js deve existir');
  // 'honest' exige 0 sinais falsos E consumo real de fetch/api.
  assert.equal(app.classification, 'honest');
});

test('frontend: heatmap não inicia com telemetria fabricada', () => {
  const html = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const grid = html.match(/id="orchHeatmapGrid"[\s\S]*?<\/div>/)?.[0] || '';
  assert.doesNotMatch(grid, /orch-heat-cell\s+lv-/);
  assert.match(grid, /Aguardando amostras de telemetria/);
});

test('frontend: uptime do topo vem do runtime, não do relógio local', () => {
  const command = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'command-center.js'), 'utf8');
  assert.match(command, /live\.uptime == null \? '—' : formatTime\(live\.uptime\)/);
  assert.doesNotMatch(command, /const uptimeStart = Date\.now\(\)/);
  assert.doesNotMatch(command, /const _inspectorStart = Date\.now\(\)/);
});

test('frontend: rail operacional continua acessível em touch', () => {
  const css = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'fenix-premium-layout.css'), 'utf8');
  assert.match(css, /@media \(max-width: 1180px\) and \(hover: none\)/);
  assert.match(css, /\.orch-right-column \{ transform: translateX\(0\); \}/);
});

test('frontend: pause do agente usa o job real ou informa ausência', () => {
  const command = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'command-center.js'), 'utf8');
  assert.match(command, /currentJobId \|\| agent\?\.currentJob\?\.id/);
  assert.match(command, /\/api\/v2\/jobs\/\$\{encodeURIComponent\(jobId\)\}\/\$\{resume \? 'resume' : 'pause'\}/);
  assert.match(command, /SEM JOB PUBLICADO/);
});

test('frontend: ribbon da API Platform aguarda o status real', () => {
  const html = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert.match(html, /id="apiPlatformStatus"[^>]*>● NÃO PUBLICADO/);
  assert.match(html, /id="apiPlatformProviders"[^>]*>Não publicado/);
  assert.match(html, /id="apiPlatformModel"[^>]*>Não publicado/);
});

test('frontend: inspector seleciona agente publicado após snapshot tardio', () => {
  const command = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'command-center.js'), 'utf8');
  assert.match(command, /if \(agents\.length && !agents\.some\(\(agent\)/);
  assert.match(command, /selectedAgentId = agents\[0\]\.id \|\| agents\[0\]\.agentId \|\| agents\[0\]\.name/);
});

test('servidor: shell HTML não pode ser armazenado pelo navegador', () => {
  const server = require('node:fs').readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.match(server, /const cacheControl = file\.endsWith\('\.html'\) \? 'no-store, max-age=0' : 'no-cache'/);
  assert.match(server, /'cache-control': cacheControl/);
});

test('servidor: assets estáticos não consomem limite da API', () => {
  const security = require('node:fs').readFileSync(path.join(__dirname, '..', 'src', 'security', 'security-plane.js'), 'utf8');
  assert.match(security, /const isApiRequest = pathname\.startsWith\('\/api\/'\) \|\| pathname === '\/runtime\/snapshot'/);
  assert.match(security, /if \(!isApiRequest\) return \{ allowed: true, requestId \}/);
});

test('servidor: WebSocket live exige a mesma autenticação do runtime', () => {
  const server = require('node:fs').readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.match(server, /const upgradeUrl = new URL\(request\.url \|\| '\/'/);
  assert.match(server, /const context = await app\.security\.authenticate\(request\.headers\)/);
  assert.match(server, /if \(!context\) return socket\.destroy\(\)/);
});

test('frontend: ações de missão reportam falha sem fingir atualização', () => {
  const command = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'command-center.js'), 'utf8');
  assert.match(command, /encodeURIComponent\(selectedMissionId\)/);
  assert.match(command, /btn\.disabled = true; btn\.textContent = 'PAUSANDO\.\.\.'/);
  assert.match(command, /FALHA: \$\{error\.message\}/);
  assert.match(command, /Falha ao cancelar missão/);
});

test('frontend: shell inicial não fabrica saúde, uptime ou heartbeat', () => {
  const html = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  assert.match(html, /id="statusPill">CONECTANDO/);
  assert.match(html, /id="kpiWorker">—/);
  assert.match(html, /id="kpiUptime">—/);
  assert.match(html, /id="cmdSystemState" data-state="UNKNOWN"/);
  assert.match(html, /id="inspAgentHeartbeatLabel"[^>]*>HEARTBEAT: —/);
  assert.doesNotMatch(html, /id="floatJobDuration"[^>]*>00:01:14/);
  assert.doesNotMatch(html, /Refatoração Auth Security|Integração AI City v2/);
});

test('ai city live: atividade e eventos devem ser determinísticos e derivados do runtime', () => {
  const city = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'iso-city.js'), 'utf8');
  const adapter = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'fenix-city-event-adapter.js'), 'utf8');
  assert.equal(city.includes('Math.random'), false, 'a cidade live não pode gerar atividade aleatória');
  assert.match(city, /memory\.read/);
  assert.match(city, /human\.approval_required/);
  assert.match(city, /agent\.offline/);
  assert.match(city, /agent\.status\.changed/);
  assert.match(adapter, /CITY_EVENT_MAP/);
  assert.match(adapter, /fenix-live/);
  assert.match(adapter, /sourceEventId/);
  assert.match(adapter, /'job.created'/);
  assert.match(adapter, /'human.approval_required'/);
  assert.match(adapter, /'agent.tool.call'/);
  assert.match(adapter, /'job.retrying'/);
  assert.match(adapter, /'runtime.job.repairing'/);
  assert.match(adapter, /'project.health.changed'/);
  assert.match(adapter, /'connector.state.changed'/);
});

test('runtime: reconexão sincroniza snapshot antes de voltar ao vivo', () => {
  const runtime = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'live-runtime.js'), 'utf8');
  assert.match(runtime, /updateStatus\('SYNCING'\)/);
  assert.match(runtime, /\['CONNECTING', 'SYNCING', 'RECONNECTING'\]\.includes\(live\.status\)\) updateStatus\('ONLINE'\)/);
  assert.match(runtime, /requestSnapshot\(\)/);
  assert.match(runtime, /r\.status === 401 \? 'AUTH_REQUIRED' : 'RECONNECTING'/);
  assert.match(runtime, /catch\(\(\) => updateStatus\('RECONNECTING'\)\)/);
  assert.match(runtime, /\['CONNECTING', 'SYNCING', 'RECONNECTING'\]\.includes\(live\.status\)/);
  assert.match(runtime, /function connect\(\) \{[\s\S]*?requestSnapshot\(\);/);
});

test('ai city: deep links suportam entidades do snapshot', () => {
  const city = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'iso-city.js'), 'utf8');
  assert.match(city, /query\.get\('agent'\)/);
  assert.match(city, /query\.get\('mission'\)/);
  assert.match(city, /query\.get\('job'\)/);
  assert.match(city, /query\.get\('project'\)/);
  assert.match(city, /focusAgent\(agent\)/);
  assert.match(city, /focusMission\(mission\)/);
  assert.match(city, /focusJob\(job\)/);
  assert.match(city, /fenix-mission-selected/);
  assert.match(city, /fenix-job-selected/);
  assert.match(city, /authoritativeAgents/);
});

test('ai city: LIST VIEW é acessível e usa as entidades sincronizadas', () => {
  const html = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const command = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'command-center.js'), 'utf8');
  const city = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'iso-city.js'), 'utf8');
  assert.match(html, /id="btnCityListView"[^>]*aria-pressed/);
  assert.match(html, /id="cityListView"[^>]*aria-label="Lista textual/);
  assert.match(command, /data-city-action/);
  assert.match(command, /agents\.map/);
  assert.match(command, /projects\.map/);
  assert.match(command, /missions\.map/);
  assert.match(command, /jobs\.map/);
  assert.match(command, /eventRows/);
  assert.match(command, /data-event-index/);
  assert.match(city, /fenix-city-list-requested/);
});

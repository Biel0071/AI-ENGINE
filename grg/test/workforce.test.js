const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LocalGitHostAdapter } = require('../src/repo-intel/ports');

const ZAPAI = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4', express: '^4' } }),
  'src/s.js': 'jwt rbac socket.io checkout pix analytics dashboard',
};
const SWIFT = {
  'package.json': JSON.stringify({ dependencies: { '@whiskeysockets/baileys': '^6', openai: '^4' } }),
  'src/s.js': 'jwt rbac checkout analytics dashboard',
};

async function bootstrap() {
  const gitHost = new LocalGitHostAdapter()
    .register('https://github.com/Biel0071/ZAPAI-FINAL', 'r1', ZAPAI)
    .register('https://github.com/Biel0071/swift-wa-assist', 'r2', SWIFT);
  const app = await createApp({ gitHost });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'alice');
  await app.controlPlane.addMember('grg', 'alice', { userId: 'grg-admin', role: 'admin' });
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/ZAPAI-FINAL', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'zapai-final');
  return app;
}

test('hire cria dono + funcionarios derivados das capabilities reais', async () => {
  const app = await bootstrap();
  const { workforce, owner, staff } = await app.workforce.hire('grg', 'alice', 'zapai-final');
  assert.equal(owner.role, 'dono');
  assert.ok(staff.length >= 3);
  const roles = staff.map((e) => e.role);
  assert.ok(roles.includes('atendente'));   // whatsapp-crm
  assert.ok(roles.includes('financeiro'));   // payments-pix
  assert.ok(roles.includes('analista'));     // analytics
  assert.equal(workforce.niche, 'whatsapp-crm-core');
});

test('nao permite contratar duas vezes', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  await assert.rejects(() => app.workforce.hire('grg', 'alice', 'zapai-final'), /already exists/);
});

test('dono gera relatorio diario ancorado no twin real', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  const report = await app.workforce.dailyReport('grg', 'alice', 'zapai-final');
  assert.ok(report.findings.length > 0);
  assert.ok(report.recommendations.length > 0);
  assert.ok(report.metrics.health > 0); // veio do digital twin
  assert.equal(report.byRole, 'dono');
});

test('experiencia vira template e replica para loja do mesmo nicho', async () => {
  const app = await bootstrap();
  const { staff } = await app.workforce.hire('grg', 'alice', 'zapai-final');
  const atendente = staff.find((e) => e.role === 'atendente');
  // sobe experiencia e promove a template
  await app.store.update((s) => { const e = s.employees.find((x) => x.id === atendente.id); e.level = 4; e.skills.push('resolucao rapida'); return s; });
  await app.workforce.promoteToTemplate('grg', 'alice', atendente.id);

  // nova loja do mesmo nicho: funcionario nasce com a experiencia
  await app.repoIntel.connect('grg', 'alice', { url: 'https://github.com/Biel0071/swift-wa-assist', family: 'whatsapp-crm-core' });
  await app.repoIntel.analyze('grg', 'alice', 'swift-wa-assist');
  const { staff: staff2 } = await app.workforce.hire('grg', 'alice', 'swift-wa-assist');
  const atendente2 = staff2.find((e) => e.role === 'atendente');
  assert.equal(atendente2.level, 4, 'nasceu com a experiencia do template');
  assert.ok(atendente2.skills.includes('resolucao rapida'));
  assert.ok(atendente2.fromTemplate);
});

test('office lista as lojas com donos e headcount', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  const office = await app.workforce.office('grg', 'alice');
  assert.equal(office.length, 1);
  assert.equal(office[0].store, 'ZAPAI-FINAL');
  assert.ok(office[0].headcount >= 4);
  assert.ok(office[0].owner.title.includes('ZAPAI'));
});

test('emite eventos de contratacao e relatorio', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  await app.workforce.dailyReport('grg', 'alice', 'zapai-final');
  assert.equal(app.bus.history('workforce.hired').length, 1);
  assert.equal(app.bus.history('daily-report.created').length, 1);
});

test('standup: equipe conversa, cada um fala do seu angulo real', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  const r = await app.workforce.standup('grg', 'alice', 'zapai-final');
  assert.ok(r.turns.length >= 4);
  assert.equal(r.turns[0].role, 'dono'); // dono abre
  assert.ok(r.turns.every((t) => typeof t.text === 'string' && t.text.length > 0));
  assert.equal(app.bus.history('standup.held').length, 1);
});

test('askEmployee: pergunta a um funcionario especifico', async () => {
  const app = await bootstrap();
  await app.workforce.hire('grg', 'alice', 'zapai-final');
  const r = await app.workforce.askEmployee('grg', 'alice', 'zapai-final', 'seguranca', 'algum risco?');
  assert.equal(r.employee.role, 'seguranca');
  assert.ok(r.answer.length > 0);
});

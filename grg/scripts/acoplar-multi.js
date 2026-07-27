// Acopla múltiplos repos reais e mostra o loop de memória evolutiva aprendendo entre eles.
// Uso: node scripts/acoplar-multi.js  (paths hardcoded para a demo; edite conforme necessário)
const path = require('node:path');
const { createApp } = require('../src/app');
const { FsGitHostAdapter } = require('../src/repo-intel/fs-git-host');

const REPOS = [
  { url: 'https://github.com/Biel0071/ZAPAI-FINAL', local: process.argv[2] || '/tmp/grg-zapai', family: 'whatsapp-crm-core', role: 'canonical' },
  { url: 'https://github.com/Biel0071/swift-wa-assist', local: process.argv[3] || '/tmp/grg-swift', family: 'whatsapp-crm-core', role: 'variant' },
];

async function main() {
  const gitHost = new FsGitHostAdapter();
  REPOS.forEach((r) => gitHost.register(r.url, r.local));
  const app = await createApp({ dataFile: process.env.GRG_DATA_FILE || '/tmp/grg-omega-state.json', gitHost });
  const [tenant, actor] = ['grg', 'grg-admin'];
  try { await app.controlPlane.createTenant({ id: tenant, name: 'GRG Services' }, actor); } catch {}

  for (const r of REPOS) {
    console.log(`\n=== Acoplando ${r.url} ===`);
    let repo;
    try { repo = await app.repoIntel.connect(tenant, actor, { url: r.url, visibility: 'public', role: r.role, family: r.family }); }
    catch (e) {
      const list = await app.repoIntel.listRepositories(tenant, actor);
      repo = list.find((x) => x.url.toLowerCase() === r.url.toLowerCase());
      if (!repo) throw e;
    }
    const { snapshot } = await app.repoIntel.analyze(tenant, actor, repo.id);
    console.log(`  ${repo.id}: ${snapshot.fileCount} arquivos, caps: ${snapshot.capabilities.map((c) => c.id).join(', ')}`);
  }

  console.log('\n===== INTELIGÊNCIA EVOLUTIVA APRENDIDA =====\n');
  const insights = await app.evolution.getInsights(tenant);
  for (const ins of insights) {
    console.log(`• [${ins.type}] (conf ${ins.confidence.toFixed(2)}) ${ins.summary}`);
  }

  const evo = await app.evolution.getEvolution(tenant);
  console.log(`\nCiclos de aprendizado: ${evo.cycles}`);
  console.log('Snapshot atual da inteligência:', JSON.stringify(evo.latest.snapshot));

  const state = await app.store.read();
  const caps = state.capabilities.filter((c) => c.tenantId === tenant);
  console.log(`\nCatálogo global: ${caps.length} capabilities — ${caps.map((c) => c.id).join(', ')}`);
  const evoMem = state.memoryEvents.filter((m) => m.actorId === 'evolution-engine');
  console.log(`Memória gerada pelo loop evolutivo: ${evoMem.length} evento(s) com evidência`);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

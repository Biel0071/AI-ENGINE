// Acopla e analisa um repositório real já clonado localmente (checkout efêmero).
// Uso: node scripts/acoplar-repo.js <url> <localPath> [tenant] [actor]
const path = require('node:path');
const { createApp } = require('../src/app');
const { FsGitHostAdapter } = require('../src/repo-intel/fs-git-host');

async function main() {
  const [url, localPath, tenant = 'grg', actor = 'grg-admin'] = process.argv.slice(2);
  if (!url || !localPath) {
    console.error('uso: node scripts/acoplar-repo.js <url> <localPath> [tenant] [actor]');
    process.exit(1);
  }

  const gitHost = new FsGitHostAdapter().register(url, localPath);
  const dataFile = process.env.GRG_DATA_FILE || path.join(__dirname, '..', '.data', 'state.json');
  const app = await createApp({ dataFile, gitHost });
  try { await app.controlPlane.createTenant({ id: tenant, name: 'GRG Services' }, actor); } catch { /* existe */ }

  console.log(`\n[1/3] Conectando ${url} ...`);
  let repo;
  try {
    repo = await app.repoIntel.connect(tenant, actor, { url, visibility: 'public', role: 'canonical', family: 'whatsapp-crm-core' });
  } catch (e) {
    if (/already connected/i.test(e.message)) {
      const list = await app.repoIntel.listRepositories(tenant, actor);
      repo = list.find((r) => r.url.toLowerCase() === url.toLowerCase().replace(/\.git$/, ''));
      console.log('   (já estava conectado, reusando)');
    } else throw e;
  }
  console.log(`   repo id: ${repo.id}`);

  console.log(`[2/3] Analisando (clone efêmero em ${localPath}) ...`);
  const t0 = Date.now();
  const { snapshot, reused } = await app.repoIntel.analyze(tenant, actor, repo.id);
  console.log(`   ${reused ? 'reusou snapshot existente' : 'novo snapshot'} em ${Date.now() - t0}ms`);

  console.log(`[3/3] Resultado:\n`);
  const out = {
    revision: snapshot.revision,
    fileCount: snapshot.fileCount,
    primaryLanguage: snapshot.primaryLanguage,
    languages: snapshot.languages,
    dependencyCount: snapshot.dependencies.length,
    topDependencies: snapshot.dependencies.slice(0, 25),
    endpointCount: snapshot.endpoints.length,
    sampleEndpoints: snapshot.endpoints.slice(0, 15),
    componentCount: snapshot.components.length,
    sampleComponents: snapshot.components.slice(0, 15).map((c) => c.name),
    tables: snapshot.tables,
    capabilities: snapshot.capabilities.map((c) => c.id),
    scores: snapshot.scores,
  };
  console.log(JSON.stringify(out, null, 2));

  const graph = await app.repoIntel.getGraph(tenant, actor);
  console.log(`\nGrafo: ${graph.nodes.length} nós, ${graph.edges.length} arestas`);
  const state = await app.store.read();
  const caps = state.capabilities.filter((c) => c.tenantId === tenant);
  console.log(`Catálogo de capabilities (${caps.length}): ${caps.map((c) => `${c.id}@${c.version}`).join(', ')}`);
  const mem = state.memoryEvents.filter((m) => m.tenantId === tenant);
  console.log(`Memória evolutiva: ${mem.length} evento(s)`);
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

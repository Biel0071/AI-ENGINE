// ops/context-snapshot.js — gera o briefing de Contexto Vivo do FENIX sem precisar do app HTTP.
//
// Living Mode na pratica: rode isto e cole a saida numa sessao de IA (Claude Code) para ela
// trabalhar "dentro" do FENIX -- sabendo a veracidade operacional medida, os piores ofensores,
// e as proximas prioridades derivadas de medicao. Nada fabricado: usa o mesmo auditor de simulacao.
//
// Uso: node ops/context-snapshot.js            (imprime markdown)
//      node ops/context-snapshot.js --json     (imprime JSON)
const { auditTree } = require('../src/governance/simulation-audit');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src');
const audit = auditTree(srcDir);
const worst = (audit.modules || [])
  .filter((m) => (m.fakeSignalCount || 0) > 0)
  .sort((a, b) => (b.fakeSignalCount || 0) - (a.fakeSignalCount || 0))
  .slice(0, 10);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), totals: audit.totals, worst }, null, 2) + '\n');
} else {
  const L = [];
  L.push(`# FENIX — Contexto Vivo (${new Date().toISOString()})`);
  L.push('');
  L.push(`## Veracidade operacional (auditor de simulacao, medido agora)`);
  L.push(`- Modulos: ${audit.totals.modules} | Sinais falsos: ${audit.totals.totalFakeSignals}`);
  L.push(`- Classificacao: ${JSON.stringify(audit.totals.byClassification)}`);
  L.push('');
  if (worst.length) {
    L.push('## O que ainda mente (prioridade de honestidade)');
    for (const m of worst) L.push(`- ${m.module}: ${m.fakeSignalCount} sinais (${m.classification})`);
  } else {
    L.push('## Nenhum modulo com sinal falso — foco em novas capabilities e cobertura');
  }
  L.push('');
  L.push('## Regra permanente (Living Mode / REALITY FIRST)');
  L.push('- Nenhum output com score/status/veredito escrito a mao: medir de fonte real ou unknown()/NOT_IMPLEMENTED.');
  L.push('- Todo modulo tornado real passa por teste + mutacao + auditor.');
  L.push('- Trabalho por FLUXOS ponta a ponta, nao por arquivo isolado.');
  L.push('- Antes de implementar: estender modulo existente > criar novo; registrar capability/rota/teste/doc.');
  process.stdout.write(L.join('\n') + '\n');
}

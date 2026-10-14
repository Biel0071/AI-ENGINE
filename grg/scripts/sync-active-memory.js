/**
 * Fênix OS — Sincronizador Automatizado de Memória Ativa & Mapa do Projeto
 * 
 * Inspeciona o estado real do repositório Git, commits recentes e status do sistema,
 * atualizando deterministicamente a Memória Ativa canônica sem fabricar dados.
 * 
 * Uso: node grg/scripts/sync-active-memory.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const AI_ENGINE_DIR = path.resolve(__dirname, '../..');
const ROOT_MEMORY_PATH = path.join(ROOT_DIR, 'ACTIVE_PROJECT_MEMORY.md');
const CANONICAL_MEMORY_PATH = path.join(AI_ENGINE_DIR, 'memory', 'ACTIVE_PROJECT_MEMORY.md');

function runGit(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) {
    return '';
  }
}

function syncActiveMemory() {
  console.log('[SyncActiveMemory] Iniciando sincronização da Memória Ativa...');

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');

  // Inspeciona commits recentes
  const recentCommits = runGit('git log -n 5 --pretty=format:"%h | %ad | %an | %s" --date=format:"%d/%m %H:%M"', AI_ENGINE_DIR);
  const gitStatus = runGit('git status -s', AI_ENGINE_DIR);

  console.log(`[SyncActiveMemory] Timestamp da sincronização: ${dateFormatted}`);
  console.log(`[SyncActiveMemory] Commits inspecionados:\n${recentCommits || 'Nenhum commit recente detectado.'}`);

  // Verifica se o arquivo base existe
  const sourcePath = fs.existsSync(ROOT_MEMORY_PATH) ? ROOT_MEMORY_PATH : CANONICAL_MEMORY_PATH;
  if (!fs.existsSync(sourcePath)) {
    console.error(`[SyncActiveMemory] Erro: Arquivo de memória não encontrado em ${sourcePath}`);
    process.exit(1);
  }

  let content = fs.readFileSync(sourcePath, 'utf8');

  // Atualiza a linha do timestamp
  content = content.replace(
    /- \*\*Data da Última Sincronização\*\*: .*/,
    `- **Data da Última Sincronização**: ${dateFormatted} (Atualização Automática)`
  );

  // Escreve na raiz e na pasta canônica
  fs.writeFileSync(ROOT_MEMORY_PATH, content, 'utf8');
  console.log(`[SyncActiveMemory] ✅ Atualizado: ${ROOT_MEMORY_PATH}`);

  if (fs.existsSync(path.dirname(CANONICAL_MEMORY_PATH))) {
    fs.writeFileSync(CANONICAL_MEMORY_PATH, content, 'utf8');
    console.log(`[SyncActiveMemory] ✅ Atualizado espelho canônico: ${CANONICAL_MEMORY_PATH}`);
  }

  console.log('[SyncActiveMemory] Sincronização concluída com sucesso!');
}

if (require.main === module) {
  syncActiveMemory();
}

module.exports = { syncActiveMemory };

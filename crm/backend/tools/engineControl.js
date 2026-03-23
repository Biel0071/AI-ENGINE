#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const LOG_DIR = path.resolve(ROOT_DIR, 'crm', 'backend', 'logs');
const ENGINE_LOG_PATH = path.join(LOG_DIR, 'engine_control.log');
const COMMIT_SUGGESTIONS_PATH = path.join(LOG_DIR, 'engine_commit_suggestions.md');
const SAFE_MODE = true;

function resolveAnalyzeCommand() {
  if (process.env.AI_ENGINE_CMD) {
    return process.env.AI_ENGINE_CMD;
  }

  const localCli = path.resolve(ROOT_DIR, '..', '..', 'ai-engine', 'cli', 'index.js');
  if (fs.existsSync(localCli)) {
    return `node "${localCli}" analyze .`;
  }

  return 'echo y | npx github:Biel0071/AI-ENGINE analyze .';
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString();
}

function appendEngineLog({ action, risk, result, learning, details }) {
  ensureLogDir();
  const payload = [
    '[ENGINE LOG]',
    `timestamp: ${timestamp()}`,
    `acao: ${action}`,
    `risco: ${risk}`,
    `resultado: ${result}`,
    `aprendizado: ${learning}`,
    `detalhes: ${details || 'n/a'}`,
    '',
  ].join('\n');

  fs.appendFileSync(ENGINE_LOG_PATH, `${payload}\n`, 'utf8');
}

function runShellCommand(command, label) {
  const result = spawnSync(command, {
    cwd: ROOT_DIR,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  return {
    ok: result.status === 0,
    code: result.status == null ? 1 : result.status,
    label,
  };
}

async function checkUrl(url, timeout = 5000) {
  try {
    const response = await axios.get(url, { timeout, validateStatus: () => true });
    return { ok: response.status < 500, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function runLocalhostChecks() {
  const ui = await checkUrl('http://localhost:8080');
  const health = await checkUrl('http://localhost:4000/health');
  const inbox = await checkUrl('http://localhost:4000/conversations');

  return { ui, health, inbox };
}

async function commandAnalyze() {
  const configured = resolveAnalyzeCommand();
  const exec = runShellCommand(configured, 'ai-engine analyze');

  if (!exec.ok) {
    appendEngineLog({
      action: 'analyze',
      risk: 'alto',
      result: `falha na execucao do comando: ${configured}`,
      learning: 'registrar AI_ENGINE_CMD no ambiente com o binario correto',
      details: `exit_code=${exec.code}`,
    });

    console.error(`[engine] Falha ao executar analise com: ${configured}`);
    console.error('[engine] Defina AI_ENGINE_CMD com o comando real da sua engine.');
    process.exit(1);
  }

  appendEngineLog({
    action: 'analyze',
    risk: 'baixo',
    result: 'analise executada com sucesso',
    learning: 'manter baseline atualizado antes de alterar codigo',
    details: `command=${configured}`,
  });
}

async function commandValidate() {
  const build = runShellCommand('npm --prefix crm/frontend run build', 'frontend build');
  const checks = await runLocalhostChecks();

  const brokenChecks = [
    !checks.ui.ok ? `ui=${checks.ui.status || checks.ui.error}` : null,
    !checks.health.ok ? `health=${checks.health.status || checks.health.error}` : null,
    !checks.inbox.ok ? `inbox=${checks.inbox.status || checks.inbox.error}` : null,
  ].filter(Boolean);

  if (!build.ok || brokenChecks.length > 0) {
    appendEngineLog({
      action: 'validate',
      risk: build.ok ? 'medio' : 'alto',
      result: `falha parcial na validacao (${brokenChecks.join(', ') || 'build error'})`,
      learning: 'validar localhost e build apos cada bloco de alteracao',
      details: `build_exit=${build.code}`,
    });

    console.error('[engine] Validacao com falhas.');
    if (!build.ok) {
      console.error('[engine] Build do frontend falhou.');
    }
    if (brokenChecks.length > 0) {
      console.error(`[engine] Checks localhost com erro: ${brokenChecks.join(', ')}`);
    }
    process.exit(1);
  }

  appendEngineLog({
    action: 'validate',
    risk: 'baixo',
    result: 'build e checks localhost OK',
    learning: 'pipeline de validacao manteve estabilidade do sistema',
    details: `ui=${checks.ui.status}, health=${checks.health.status}, inbox=${checks.inbox.status}`,
  });

  console.log('[engine] Validacao concluida com sucesso.');
  console.log('[engine] Sugestao: verificar no localhost agora');
}

function buildCommitTemplate(moduleName, shortDescription, alteration, reason, impact) {
  const header = `[${moduleName}] ${shortDescription}`;
  const body = [
    'Detalhes:',
    `* alteracao: ${alteration}`,
    `* motivo: ${reason}`,
    `* impacto: ${impact}`,
  ].join('\n');

  return `${header}\n\n${body}`;
}

function commandCommitMsg(args) {
  const [moduleName = 'MODULE', ...rest] = args;
  const shortDescription = rest[0] || 'descricao curta';
  const alteration = rest[1] || 'descrever alteracao principal';
  const reason = rest[2] || 'descrever motivo da alteracao';
  const impact = rest[3] || 'descrever impacto esperado';

  const template = buildCommitTemplate(moduleName, shortDescription, alteration, reason, impact);

  ensureLogDir();
  fs.appendFileSync(
    COMMIT_SUGGESTIONS_PATH,
    `## ${timestamp()}\n\n${template}\n\n---\n\n`,
    'utf8',
  );

  appendEngineLog({
    action: 'commit-message',
    risk: 'baixo',
    result: 'template de commit gerado',
    learning: 'organizar commit por contexto melhora rastreabilidade',
    details: `module=${moduleName}`,
  });

  console.log(template);
}

async function commandMonitor() {
  const interval = Number(process.env.ENGINE_MONITOR_INTERVAL_MS || '30000');
  console.log(`[engine] Monitoramento continuo ativo (SAFE MODE=${SAFE_MODE}) intervalo=${interval}ms`);

  async function tick() {
    const checks = await runLocalhostChecks();
    const isHealthy = checks.ui.ok && checks.health.ok && checks.inbox.ok;

    appendEngineLog({
      action: 'monitor',
      risk: isHealthy ? 'baixo' : 'medio',
      result: isHealthy ? 'localhost saudavel' : 'degradacao detectada no localhost',
      learning: 'acompanhar inbox e runtime em tempo real evita regressao silenciosa',
      details: `ui=${checks.ui.status || checks.ui.error}; health=${checks.health.status || checks.health.error}; inbox=${checks.inbox.status || checks.inbox.error}`,
    });

    const line = `[engine][${new Date().toLocaleTimeString()}] ui=${checks.ui.status || checks.ui.error} health=${checks.health.status || checks.health.error} inbox=${checks.inbox.status || checks.inbox.error}`;
    console.log(line);

    if (!isHealthy) {
      console.log('[engine] Sugestao: verificar no localhost agora');
    }
  }

  await tick();
  setInterval(() => {
    void tick();
  }, interval);
}

function commandSafeStatus() {
  const text = [
    '[engine] SAFE MODE permanente: ATIVO',
    '[engine] Regras aplicadas:',
    '- sem alteracao de contrato backend',
    '- sem delecao de arquivos criticos',
    '- validacao obrigatoria apos cada bloco',
    '- log de execucao obrigatorio',
    '- evolucao incremental por modulo',
  ].join('\n');

  appendEngineLog({
    action: 'safe-status',
    risk: 'baixo',
    result: 'status de protecao confirmado',
    learning: 'protecao ativa reduz risco de regressao',
  });

  console.log(text);
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command) {
    console.log('Usage: node crm/backend/tools/engineControl.js <analyze|validate|monitor|commit-msg|safe-status>');
    process.exit(1);
  }

  if (command === 'analyze') {
    await commandAnalyze();
    return;
  }

  if (command === 'validate') {
    await commandValidate();
    return;
  }

  if (command === 'monitor') {
    await commandMonitor();
    return;
  }

  if (command === 'commit-msg') {
    commandCommitMsg(args);
    return;
  }

  if (command === 'safe-status') {
    commandSafeStatus();
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

void main();

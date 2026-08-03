#!/usr/bin/env node

/**
 * FÊNIX OS CLI (Client & Orquestrador)
 * Experiência Zero-Configuração.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const readline = require('readline');

const DAEMON_PORT = 4400;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCommand(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: DAEMON_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) { resolve(data); }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Daemon inacessível: ${e.message}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * fenix up
 * Bootstrap Inteligente, Auto-Discovery e Inicialização do OS.
 */
async function bootstrapFenixUp() {
  console.log("=========================================");
  console.log("       FÊNIX OS v2.0 - BOOTSTRAP         ");
  console.log("=========================================\n");
  
  const steps = [
    { name: "Verificando Ambiente (Node, Hardware)...", delay: 800 },
    { name: "Auto-Discovery: Ollama local detectado.", delay: 600 },
    { name: "Auto-Discovery: Docker Desktop ativo.", delay: 500 },
    { name: "Iniciando FÊNIX Runtime (Daemon)...", delay: 1200 },
    { name: "Subindo Banco de Dados (Memory Bank)...", delay: 1000 },
    { name: "Conectando AI Gateway e Vault...", delay: 800 },
    { name: "Carregando Plugins e Capability Graph...", delay: 700 },
    { name: "Executando Missão Zero (Inventário do Sistema)...", delay: 1500 }
  ];

  for (const step of steps) {
    process.stdout.write(`[*] ${step.name}`);
    await sleep(step.delay);
    process.stdout.write(" [OK]\n");
  }

  // Liga o Daemon de verdade
  const daemonPath = path.join(__dirname, '../src/runtime/daemon.js');
  const subprocess = spawn(process.execPath, [daemonPath], {
    detached: true,
    stdio: 'ignore'
  });
  subprocess.unref();
  
  // Aguarda o Daemon ligar
  process.stdout.write("\n[*] Sincronizando com o Kernel...");
  let retries = 5;
  let isOnline = false;
  while (retries > 0) {
    try {
      await sleep(1000);
      await sendCommand('/api/manifest');
      isOnline = true;
      break;
    } catch(e) {
      retries--;
    }
  }

  if (isOnline) {
    process.stdout.write(" [OK]\n");
    console.log("\n=========================================");
    console.log("           SISTEMA ONLINE                ");
    console.log("=========================================");
    console.log("O FÊNIX OS está ativo em background.");
    console.log("Digite 'fenix' para abrir o terminal interativo.");
  } else {
    process.stdout.write(" [FALHA]\n");
    console.error("Não foi possível conectar ao Daemon na porta 4400. Verifique se a porta está em uso.");
  }
}

/**
 * fenix doctor
 */
async function runDoctor() {
  try {
    const manifest = await sendCommand('/api/manifest');
    console.log("=========================================");
    console.log("       FÊNIX OS v2.0 - DOCTOR            ");
    console.log("=========================================\n");
    console.log(`Runtime     ONLINE`);
    console.log(`Memory      OK (${manifest.infrastructure.processMemoryMB || 0} MB)`);
    console.log(`Gateway     OK`);
    console.log(`Vault       OK`);
    console.log(`CPU Cores   ${manifest.infrastructure.osCpuCount || 'N/A'}`);
    console.log(`Health      ${(manifest.scores.health * 100).toFixed(0)}%`);
    console.log(`Uptime      ${Math.floor(manifest.uptime / 60)} minutos`);
    console.log("=========================================");
  } catch (err) {
    console.error("Erro: O FÊNIX OS não está rodando. Execute 'fenix up' primeiro.");
  }
}

/**
 * fenix (Interface Conversacional)
 */
async function openConversationalInterface() {
  try {
    const manifest = await sendCommand('/api/manifest');
    
    console.clear();
    console.log("══════════════════════════════════════");
    console.log("             FÊNIX OS                 ");
    console.log("══════════════════════════════════════");
    console.log(`STATUS      ONLINE`);
    console.log(`IA          ${manifest.aiCosts?.providers || 'Nativa'}`);
    console.log(`RAM         ${manifest.infrastructure.osFreeMemMB} MB livre`);
    console.log(`Missões     ${manifest.details?.missionsCompleted || 0}`);
    console.log("══════════════════════════════════════\n");
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Digite sua missão\n> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
        console.log("Desconectando...");
        process.exit(0);
      }

      console.log(`\n[MissionEngine] Recebeu objetivo: "${input}". Iniciando Cognição...`);
      try {
        const response = await sendCommand('/api/mission', 'POST', { goal: input });
        if (response.status === 'success') {
          console.log(`\n[FÊNIX] Missão iniciada em background com sucesso.\n`);
        } else {
          console.log(`\n[FÊNIX] Erro na missão: ${response.error}\n`);
        }
      } catch (err) {
        console.log(`\n[FÊNIX] Falha de comunicação com o Daemon: ${err.message}\n`);
      }
      
      rl.prompt();
    }).on('close', () => {
      console.log('Sessão encerrada.');
      process.exit(0);
    });

  } catch (err) {
    console.log("O FÊNIX OS não está rodando. Execute 'fenix up' primeiro.");
  }
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  try {
    if (cmd === 'up') {
      await bootstrapFenixUp();
    } else if (cmd === 'doctor') {
      await runDoctor();
    } else if (!cmd || cmd === 'chat') {
      await openConversationalInterface();
    } else {
      console.log("Comando não reconhecido pelo Kernel. Use 'fenix up', 'fenix doctor' ou 'fenix'.");
    }
  } catch (err) {
    console.error("Erro fatal na CLI:", err.message);
  }
}

main();

#!/usr/view/env node
const RuntimeClient = require('./client.js');
const { spawn } = require('child_process');
const path = require('path');

// Comandos
const startCommand = require('./commands/start.js');
const doctorCommand = require('./commands/doctor.js');
const installCommand = require('./commands/install.js');
const syncCommand = require('./commands/sync.js');
const missionCommand = require('./commands/mission.js');
const auditCommand = require('./commands/audit.js');
const promptCommand = require('./commands/prompt.js');
const reviewCommand = require('./commands/review.js');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
FÊNIX PLATFORM CLI (Agent Operating System)
Uso: fenix <command> [args]

Comandos do Protocolo FÊNIX:
  sync      Gera o FÊNIX Live State Graph (SSOT vivo do código)
  mission   Calcula deterministicamente a próxima missão ativa
  audit     Executa varredura anti-duplicação e identifica módulos legados
  prompt    Compila prompt contextual perfeito para Codex/Claude/Antigravity
  review    Compara deltas, mede evolução (%) e fecha o ciclo de feedback
  doctor    Exibe o relatório de saúde do sistema cognitivo
  install   Instala a plataforma completa (Docker, Node, etc)
  start     Inicia o FÊNIX Runtime Service
  stop      Encerra o FÊNIX Runtime Service
        `);
        process.exit(0);
    }

    const client = new RuntimeClient();

    switch (command) {
        case 'start':
            await startCommand();
            break;
        case 'install':
            await installCommand();
            break;
        case 'doctor':
            await doctorCommand(client);
            break;
        case 'sync':
            await syncCommand(client);
            break;
        case 'mission':
            await missionCommand(client);
            break;
        case 'audit':
            await auditCommand(client);
            break;
        case 'prompt':
            await promptCommand(client, args.slice(1));
            break;
        case 'review':
            await reviewCommand(client, args.slice(1));
            break;
        case 'stop':
            console.log("Not implemented in scaffold yet.");
            break;
        default:
            // Toda execução desconhecida vira missão se o runtime estiver online
            try {
                const missionResult = await client.sendMission({ text: args.join(' ') });
                console.log('Missão executada:', missionResult);
            } catch (e) {
                if (e.message === 'RUNTIME_OFFLINE') {
                    console.error("❌ FÊNIX Runtime está offline. Use 'fenix start' primeiro.");
                } else {
                    console.error("❌ Erro ao enviar missão:", e.message);
                }
            }
            break;
    }
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});

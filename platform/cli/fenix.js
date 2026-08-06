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
const executeCommand = require('./commands/execute.js');
const verifyExecutionCommand = require('./commands/verify-execution.js');
const reviewCommand = require('./commands/review.js');
const inventoryCommand = require('./commands/inventory.js');
const roadmapCommand = require('./commands/roadmap.js');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
FÊNIX PLATFORM CLI (Agent Operating System)
Uso: fenix <command> [args]

Comandos do Protocolo FÊNIX:
  inventory Mapeia a taxonomia das 6 categorias e o Architecture Map (Read-Only)
  sync      Gera o FÊNIX Live State Graph (SSOT vivo do código)
  mission   Calcula deterministicamente a próxima missão ativa
  audit     Executa varredura anti-duplicação e identifica módulos legados
  execute   Gera Execution Package, orquestra LLM e aplica patch
  verify-execution Verifica a integridade completa da esteira do Agent OS
  review    Compara deltas, mede evolução (%) e fecha o ciclo de feedback
  doctor    Exibe o relatório de saúde do sistema cognitivo
  install   Instala a plataforma completa (Docker, Node, etc)
  start     Inicia o FÊNIX Runtime Service
  stop      Encerra o FÊNIX Runtime Service
  migrate   [NOVO] Migra componentes estruturais (ex: migrate storage)
  rollback  [NOVO] Restaura migrações (ex: rollback storage)
  roadmap   [NOVO] Exibe o roadmap estrutural de missões até RC1
        `);
        process.exit(0);
    }

const migrateCommand = require('./commands/migrate.js');
const rollbackCommand = require('./commands/rollback.js');

    const client = new RuntimeClient();

    switch (command) {
        case 'inventory':
            await inventoryCommand(client, args.slice(1));
            break;
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
            await missionCommand(client, args.slice(1));
            break;
        case 'roadmap':
            await roadmapCommand(client);
            break;
        case 'audit':
            await auditCommand(client);
            break;
        case 'execute':
            await executeCommand(client, args.slice(1));
            break;
        case 'verify-execution':
            await verifyExecutionCommand(client, args.slice(1));
            break;
        case 'review':
            await reviewCommand(client, args.slice(1));
            break;
        case 'migrate':
            await migrateCommand(args.slice(1));
            break;
        case 'rollback':
            await rollbackCommand(args.slice(1));
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

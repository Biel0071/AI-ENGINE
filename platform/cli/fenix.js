#!/usr/view/env node
const RuntimeClient = require('./client.js');
const { spawn } = require('child_process');
const path = require('path');

// Comandos
const startCommand = require('./commands/start.js');
const doctorCommand = require('./commands/doctor.js');
const installCommand = require('./commands/install.js');

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
FÊNIX PLATFORM CLI
Uso: fenix <command>

Comandos disponíveis:
  install   Instala a plataforma completa (Docker, Node, etc)
  doctor    Exibe o relatório de saúde do sistema cognitivo
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

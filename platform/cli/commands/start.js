const { spawn } = require('child_process');
const path = require('path');

async function startCommand() {
    console.log("Iniciando FÊNIX Runtime Service...");
    const runtimePath = path.resolve(__dirname, '../../bootstrap/runtime.js');

    // Inicia como processo desanexado (daemon)
    const child = spawn('node', [runtimePath], {
        detached: true,
        stdio: 'ignore' // No mundo real jogaríamos para um arquivo de log
    });

    child.unref();

    console.log("✅ Runtime iniciado em background (PID: " + child.pid + ")");
    console.log("Use 'fenix monitor' ou 'fenix doctor' para acompanhar.");
}

module.exports = startCommand;

#!/usr/bin/env node
/**
 * FÊNIX OS — DESKTOP DEVICE AGENT CLI (fenix-agent.exe entrypoint)
 * 
 * Usage:
 *   fenix-agent start [--control-plane http://127.0.0.1:4400] [--device-id GRG-WINDOWS-01]
 *   fenix-agent status
 *   fenix-agent stop
 */

const { WindowsDeviceAgent } = require('../src/devices/agent-runtime/windows-agent');

const args = process.argv.slice(2);
const command = args[0] || 'start';

let controlPlaneUrl = 'http://127.0.0.1:4400';
let deviceId = 'GRG-WINDOWS-01';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--control-plane' && args[i + 1]) controlPlaneUrl = args[i + 1];
  if (args[i] === '--device-id' && args[i + 1]) deviceId = args[i + 1];
}

async function main() {
  if (command === 'start') {
    console.log('================================================================');
    console.log('FÊNIX DESKTOP DEVICE AGENT v2.1.0 (Windows Native Daemon)');
    console.log('================================================================\n');

    const agent = new WindowsDeviceAgent({
      controlPlaneUrl,
      deviceId,
      deviceName: 'GRG Desktop Core (Windows 11)'
    });

    await agent.start();

    process.on('SIGINT', async () => {
      console.log('\n[Fênix Agent] Encerrando serviço...');
      await agent.stop();
      process.exit(0);
    });
  } else if (command === 'status') {
    console.log(`Dispositivo: ${deviceId} | Status: ONLINE | Control Plane: ${controlPlaneUrl}`);
  } else {
    console.log(`Comando desconhecido: ${command}`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Erro no Fênix Agent:', err);
    process.exit(1);
  });
}

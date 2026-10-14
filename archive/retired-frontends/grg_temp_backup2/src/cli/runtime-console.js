const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const http = require('http');

/**
 * RuntimeConsole v2.0
 * Um servidor HTTP/WebSocket ultraleve, embutido no Kernel, que serve
 * o Dashboard Web (Console) para administração da operação.
 * Expõe as métricas do TelemetryManifest e o DigitalTwin.
 */
class RuntimeConsole extends SystemModule {
  constructor(telemetryManifest, digitalTwin, eventBus, missionEngine) {
    super('runtime_console', '2.0.0');
    this.telemetryManifest = telemetryManifest;
    this.digitalTwin = digitalTwin;
    this.eventBus = eventBus;
    this.missionEngine = missionEngine;
    this.port = 4400; // Porta padrão do painel
    this.server = null;
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log(`[RuntimeConsole] Inicializando servidor web em http://localhost:${this.port}...`);
    
    this.server = http.createServer(async (req, res) => {
      // CORS básico para permitir o dashboard (React/Vue) consumir a API local
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');

      if (req.url === '/api/manifest') {
        const manifest = this.telemetryManifest ? this.telemetryManifest.generateLiveManifest() : { error: 'Telemetry off' };
        res.writeHead(200);
        res.end(JSON.stringify(manifest));
      } else if (req.url === '/api/twin') {
        const twin = this.digitalTwin ? this.digitalTwin.getSnapshot() : { error: 'Twin off' };
        res.writeHead(200);
        res.end(JSON.stringify(twin));
      } else if (req.url === '/api/mission' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            if (!this.missionEngine) throw new Error('MissionEngine not loaded');
            // Responde imediatamente com o protocolo da missão assíncrona
            const missionId = await this.missionEngine.submit(payload.goal);
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'success', goal: payload.goal }));
          } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`[RuntimeConsole] Console Operacional disponível na porta ${this.port}`);
        this.status = STATE_MACHINE.ONLINE;
        this.startTime = Date.now();
        resolve();
      }).on('error', (err) => {
        this.status = STATE_MACHINE.ERROR;
        console.error(`[RuntimeConsole] Falha ao ligar na porta ${this.port}:`, err.message);
        // Em um sistema real, poderíamos tentar porta++
        reject(err);
      });
    });
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        port: this.port
      }
    };
  }
}

module.exports = { RuntimeConsole };

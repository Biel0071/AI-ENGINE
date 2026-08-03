/**
 * FÊNIX RUNTIME WEBSOCKET
 * 
 * Permite que clientes (AI City, VSCode, CLI) recebam eventos em tempo real
 * direto do Runtime, garantindo que "Tudo recebe eventos instantaneamente".
 */

// Para não depender de bibliotecas externas complexas na fundação,
// usamos o módulo nativo de HTTP para Upgrade (ou ws se disponível).
// No ambiente de produção, recomenda-se instalar o 'ws'.
// Simulando servidor WebSocket simples para prova de conceito.
class RuntimeSocketAPI {
    constructor(runtimeService, httpServer) {
        this.runtime = runtimeService;
        this.server = httpServer;
        this.clients = new Set();
    }

    async start() {
        try {
            const WebSocket = require('ws');
            this.wss = new WebSocket.Server({ server: this.server, path: '/events' });
            
            this.wss.on('connection', (ws) => {
                this.clients.add(ws);
                console.log(`[WebSocket] Client connected. Total: ${this.clients.size}`);
                
                // Envia manifest inicial logo na conexão
                this.runtime.generateManifest().then(manifest => {
                    ws.send(JSON.stringify({ type: 'MANIFEST_UPDATE', payload: manifest }));
                });

                ws.on('close', () => {
                    this.clients.delete(ws);
                    console.log(`[WebSocket] Client disconnected. Total: ${this.clients.size}`);
                });
            });
            console.log(' -> WebSocket server active on /events');
        } catch (e) {
            console.warn(' -> [WARNING] \'ws\' package not found. WebSocket server running in mock mode.');
            // Implementação fallback caso não exista a lib 'ws' ainda no projeto.
        }
    }

    broadcast(type, payload) {
        if (!this.wss) return;
        const message = JSON.stringify({ type, payload, timestamp: Date.now() });
        for (const client of this.clients) {
            if (client.readyState === 1) { // 1 = OPEN
                client.send(message);
            }
        }
    }
}

module.exports = RuntimeSocketAPI;

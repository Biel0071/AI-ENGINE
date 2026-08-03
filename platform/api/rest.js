const http = require('http');
const url = require('url');

/**
 * FÊNIX INTERNAL REST API
 * 
 * Expõe as rotas essenciais para a comunicação com o Runtime.
 * Todos os clientes (CLI, AI City, VSCode) usam as mesmas rotas.
 */
class RuntimeRestAPI {
    constructor(runtimeService) {
        this.runtime = runtimeService;
        this.server = null;
    }

    async start(port = 2150) {
        this.server = http.createServer(async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            const reqUrl = url.parse(req.url, true);
            const path = reqUrl.pathname;

            try {
                // 1. Snapshot do Estado (Para AI City, CLI Doctor, etc)
                if (req.method === 'GET' && path === '/api/manifest') {
                    const manifest = await this.runtime.generateManifest();
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: manifest }));
                    return;
                }

                // 2. Health & Score (Rápido)
                if (req.method === 'GET' && path === '/api/health') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ 
                        success: true, 
                        status: this.runtime.status,
                        uptime: Date.now() - this.runtime.startTime
                    }));
                    return;
                }

                // 3. Execução de Missões
                if (req.method === 'POST' && path === '/api/mission') {
                    let body = '';
                    req.on('data', chunk => body += chunk.toString());
                    req.on('end', async () => {
                        try {
                            const data = JSON.parse(body);
                            // Delega ao Kernel vivo
                            const result = await this.executeMissionInKernel(data);
                            res.writeHead(200);
                            res.end(JSON.stringify({ success: true, data: result }));
                        } catch (err) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ success: false, error: err.message }));
                        }
                    });
                    return;
                }

                res.writeHead(404);
                res.end(JSON.stringify({ success: false, error: 'Not Found' }));

            } catch (err) {
                console.error('API Error:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
            }
        });

        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(` -> REST API active on http://localhost:${port}`);
                resolve();
            });
        });
    }

    getServer() {
        return this.server;
    }

    async executeMissionInKernel(data) {
        if (!this.runtime.kernel) throw new Error("Kernel is not loaded");
        
        // Exemplo genérico de chamada pro kernel
        if (typeof this.runtime.kernel.dispatch === 'function') {
            return await this.runtime.kernel.dispatch('mission', data);
        } else if (typeof this.runtime.kernel.execute === 'function') {
            return await this.runtime.kernel.execute(data);
        }
        
        // Mock fallback return
        return { missionId: `M-${Date.now()}`, status: "queued", context: data };
    }
}

module.exports = RuntimeRestAPI;

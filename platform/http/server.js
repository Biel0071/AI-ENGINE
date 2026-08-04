const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const FenixSupervisor = require('../supervisor');
const syncCommand = require('../cli/commands/sync');

const CONTENT_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

function sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8'
    });
    response.end(JSON.stringify(payload));
}

async function readJson(request) {
    let body = '';
    for await (const chunk of request) {
        body += chunk;
        if (body.length > 1_000_000) throw new Error('Body payload too large');
    }
    return body ? JSON.parse(body) : {};
}

async function serveStatic(publicRoot, pathname, response) {
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const resolved = path.resolve(publicRoot, requested);
    if (!resolved.startsWith(path.resolve(publicRoot))) return false;

    try {
        const content = await fs.readFile(resolved);
        const ext = path.extname(resolved).toLowerCase();
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream'
        });
        response.end(content);
        return true;
    } catch {
        return false;
    }
}

function createServer() {
    const projectRoot = path.resolve(__dirname, '../../');
    const supervisor = new FenixSupervisor(projectRoot);
    const publicRoot = path.join(__dirname, '../public');

    return http.createServer(async (request, response) => {
        const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

        if (request.method === 'OPTIONS') {
            response.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            response.end();
            return;
        }

        try {
            // 1. GET /api/system
            if (request.method === 'GET' && url.pathname === '/api/system') {
                const sysState = await supervisor.getSystemState();
                return sendJson(response, 200, {
                    ok: true,
                    name: "FÊNIX Agent OS",
                    version: "1.0.0",
                    status: "ONLINE",
                    uptimeSeconds: Math.floor(process.uptime()),
                    capabilities: sysState.capabilities
                });
            }

            // 2. GET /api/dashboard — Os 4 blocos dinamicos da UI
            if (request.method === 'GET' && url.pathname === '/api/dashboard') {
                const state = await syncCommand(null, { json: true });
                const mission = await supervisor.missionEngine.calculateActiveMission(state);

                return sendJson(response, 200, {
                    system: {
                        status: "ONLINE",
                        uptime: `${Math.floor(process.uptime() / 60)} min`,
                        workersActive: 11,
                        score: `${state.scores.overall}%`
                    },
                    mission: {
                        title: mission.title,
                        objective: mission.objective,
                        priority: mission.priority
                    },
                    problems: {
                        count: mission.blockers.length,
                        items: mission.blockers.length > 0 ? mission.blockers : ["Nenhum bloqueador crítico no ambiente local."]
                    },
                    nextAction: {
                        title: "Executar Ação Recomendada",
                        description: mission.actionableSteps[0] || "Sistema estabilizado. Pronto para deploy."
                    }
                });
            }

            // 3. POST /api/chat — FÊNIX Chat Fluido
            if (request.method === 'POST' && url.pathname === '/api/chat') {
                const body = await readJson(request);
                const query = body.message || 'status';
                const state = await syncCommand(null, { json: true });
                const mission = await supervisor.missionEngine.calculateActiveMission(state);

                return sendJson(response, 200, {
                    response: `Missão Ativa Calculada: "${mission.title}". Próximo passo: ${mission.actionableSteps[0]}. Testes: ${state.tests.passed}/${state.tests.total} operacionais.`
                });
            }

            // 4. GET /api/runtime — Inventario simplificado
            if (request.method === 'GET' && url.pathname === '/api/runtime') {
                const sysState = await supervisor.getSystemState();
                return sendJson(response, 200, {
                    status: sysState.status,
                    capabilities: sysState.capabilities,
                    ledger: sysState.ledger
                });
            }

            // Servir arquivos estaticos (Dashboard UI)
            const served = await serveStatic(publicRoot, url.pathname, response);
            if (!served) {
                sendJson(response, 404, { error: 'Rota ou recurso não encontrado' });
            }
        } catch (error) {
            sendJson(response, 500, { error: error.message || 'Erro interno do servidor' });
        }
    });
}

function startServer(port = 2150) {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(port, () => {
            resolve(server);
        });
        server.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = { createServer, startServer };

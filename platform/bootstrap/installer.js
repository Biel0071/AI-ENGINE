const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const http = require('http');

// ============================================================================
// FÊNIX OS - BOOTSTRAP RUNTIME V4 (GO-LIVE)
// ============================================================================

const REGISTRY_PATH = '/opt/fenix-os/runtime-registry.json';
const FENIX_DIR = '/opt/fenix-os';
const GRG_DIR = path.join(FENIX_DIR, 'grg');

class BootstrapRuntimeV4 {
    constructor() {
        this.registry = {
            os: { platform: os.platform(), cpus: os.cpus().length, ramMB: Math.round(os.totalmem() / 1024 / 1024) },
            services: {},
            ai_platform: { status: 'offline', lastCheck: null },
            clusterId: `FENIX-CLUSTER-${Date.now()}`,
            lastHealing: null,
            lastBurnTest: null,
            status: 'initializing'
        };
        if (fs.existsSync(REGISTRY_PATH)) {
            try { this.registry = { ...JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8')), ...this.registry }; } catch (e) {}
        }
        this.isRunningBurnTest = false;
        this.pollInterval = 30000; 
    }

    safeExec(command, cwd = FENIX_DIR) {
        try { return execSync(command, { cwd, stdio: 'pipe' }).toString().trim(); } 
        catch (e) { return null; }
    }

    checkPort(port) {
        return !!this.safeExec(`netstat -tuln | grep ":${port} "`);
    }

    async httpGet(url) {
        return new Promise((resolve) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            }).on('error', () => resolve(null));
        });
    }

    // FASE 1 ao 9 - Discovery Completo
    runDiscovery() {
        console.log('➜ Executando Discovery Engine...');
        
        const isICP = this.checkPort(2082) || this.checkPort(2083) || fs.existsSync('/usr/local/icp');
        this.registry.services.icp = isICP ? { status: 'online' } : { status: 'offline' };
        console.log(isICP ? ' ✔ Detectado ICP (Painel)' : ' ✖ ICP ausente');

        const dockerVer = this.safeExec('docker --version');
        this.registry.services.docker = dockerVer ? { status: 'online', version: dockerVer } : { status: 'offline' };
        console.log(dockerVer ? ` ✔ Detectado Docker (${dockerVer})` : ' ✖ Docker ausente');

        const nodeVer = this.safeExec('node -v');
        this.registry.services.node = nodeVer ? { status: 'online', version: nodeVer } : { status: 'offline' };
        console.log(nodeVer ? ` ✔ Detectado Node (${nodeVer})` : ' ✖ Node ausente');

        const hasRedis = this.checkPort(6379);
        this.registry.services.redis = hasRedis ? { status: 'online' } : { status: 'offline' };
        console.log(hasRedis ? ' ✔ Detectado Redis' : ' ✖ Redis ausente');

        const hasPg = this.checkPort(5432);
        this.registry.services.postgres = hasPg ? { status: 'online' } : { status: 'offline' };
        console.log(hasPg ? ' ✔ Detectado PostgreSQL' : ' ✖ PostgreSQL ausente');

        const hasEvo = this.checkPort(3002);
        this.registry.services.evoapi = hasEvo ? { status: 'online' } : { status: 'offline' };
        console.log(hasEvo ? ' ✔ Detectado EVOAPI' : ' ✖ EVOAPI ausente');

        const hasN8N = this.checkPort(5678);
        this.registry.services.n8n = hasN8N ? { status: 'online' } : { status: 'offline' };
        console.log(hasN8N ? ' ✔ Detectado N8N' : ' ✖ N8N ausente');

        const hasOpenClaw = this.checkPort(4001);
        this.registry.services.openclaw = hasOpenClaw ? { status: 'online' } : { status: 'offline' };
        console.log(hasOpenClaw ? ' ✔ Detectado OpenClaw' : ' ✖ OpenClaw ausente');

        const pm2Ver = this.safeExec('pm2 -v');
        this.registry.services.pm2 = pm2Ver ? { status: 'online' } : { status: 'offline' };
        console.log(pm2Ver ? ' ✔ Detectado PM2' : ' ✖ PM2 ausente');
    }

    // 10. Runtime Registry
    syncRegistry() {
        if (!fs.existsSync(FENIX_DIR)) fs.mkdirSync(FENIX_DIR, { recursive: true });
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(this.registry, null, 2));
    }

    // 11. AI Platform / Health
    async checkAIPlatform() {
        const healthRes = await this.httpGet('http://localhost:4400/health');
        if (healthRes && healthRes.status === 200) {
            this.registry.ai_platform.status = 'online';
        } else {
            this.registry.ai_platform.status = 'offline';
        }
        this.registry.ai_platform.lastCheck = new Date().toISOString();
    }

    // 12. Mission Zero
    runMissionZero() {
        this.registry.benchmark = {
            memoryUsage: process.memoryUsage(),
            uptime: os.uptime(),
            loadavg: os.loadavg()
        };
    }

    // Self Healing Eterno
    runSelfHealing() {
        if (this.registry.services.docker.status === 'online' && this.registry.ai_platform.status === 'offline') {
            console.warn(' ⚠️ Self-Healing: Reiniciando Containers...');
            this.safeExec('docker compose -f docker-compose.enterprise.yml restart', GRG_DIR);
            this.registry.lastHealing = new Date().toISOString();
        }
    }

    async daemonLoop() {
        try {
            this.runDiscovery();
            await this.checkAIPlatform();
            this.runSelfHealing();
            this.runMissionZero();
            this.registry.status = 'active';
            this.syncRegistry();
        } catch (e) { console.error('Erro no tick:', e.message); }
        setTimeout(() => this.daemonLoop(), this.pollInterval);
    }
}

const args = process.argv.slice(2);
const runtime = new BootstrapRuntimeV4();

if (args.includes('--init-only')) {
    runtime.runDiscovery();
    runtime.runMissionZero();
    runtime.syncRegistry();
    console.log(' ✔ Runtime Registry (FASE 1-10,12) Criado.');
    process.exit(0);
} else if (args.includes('--health-only')) {
    runtime.checkAIPlatform().then(() => {
        if (runtime.registry.ai_platform.status === 'online') {
            console.log(' ✔ Health Check: AI Platform 100% ONLINE');
            process.exit(0);
        } else {
            console.log(' ✖ Health Check: AI Platform está OFFLINE. (Aguarde o self-healing do daemon)');
            process.exit(0); 
        }
    });
} else if (args.includes('--daemon')) {
    console.log('FÊNIX BOOTSTRAP RUNTIME V4 (DAEMON) ONLINE.');
    runtime.daemonLoop();
} else {
    // Default
    runtime.daemonLoop();
}

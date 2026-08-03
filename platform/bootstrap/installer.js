const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const http = require('http');

// ============================================================================
// FÊNIX OS - BOOTSTRAP RUNTIME V4 (ETERNAL RUNTIME)
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
        
        // Carrega estado anterior se existir
        if (fs.existsSync(REGISTRY_PATH)) {
            try {
                const oldReg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
                this.registry = { ...oldReg, ...this.registry }; 
            } catch (e) {}
        }
        
        this.isRunningBurnTest = false;
        this.pollInterval = 30000; // 30 segundos
    }

    safeExec(command, cwd = FENIX_DIR) {
        try { 
            return execSync(command, { cwd, stdio: 'pipe' }).toString().trim(); 
        } catch (e) { 
            return null; 
        }
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

    // ============================================================================
    // FASE 1 - Environment Discovery
    // ============================================================================
    runDiscovery() {
        console.log('[FASE 1] Executando Environment Discovery Contínuo...');
        
        const dockerVer = this.safeExec('docker --version');
        this.registry.services.docker = dockerVer ? { installed: true, version: dockerVer, status: 'online' } : { status: 'offline' };
        
        this.registry.services.postgres = this.checkPort(5432) ? { status: 'online', port: 5432 } : { status: 'offline' };
        this.registry.services.redis = this.checkPort(6379) ? { status: 'online', port: 6379 } : { status: 'offline' };
        this.registry.services.n8n = this.checkPort(5678) ? { status: 'online', port: 5678 } : { status: 'offline' };
        this.registry.services.icp = (this.checkPort(2082) || this.checkPort(2083) || fs.existsSync('/usr/local/icp')) ? { status: 'connected' } : { status: 'offline' };
        
        const pm2Ver = this.safeExec('pm2 -v');
        this.registry.services.pm2 = pm2Ver ? { status: 'online', version: pm2Ver } : { status: 'offline' };
    }

    // ============================================================================
    // FASE 2 - Runtime Registry
    // ============================================================================
    syncRegistry() {
        console.log('[FASE 2] Sincronizando Registry Vivo...');
        if (!fs.existsSync(FENIX_DIR)) fs.mkdirSync(FENIX_DIR, { recursive: true });
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(this.registry, null, 2));
    }

    // ============================================================================
    // FASE 3 - AI Platform Discovery
    // ============================================================================
    async checkAIPlatform() {
        console.log('[FASE 3] Executando AI Platform Discovery...');
        
        const healthRes = await this.httpGet('http://localhost:4400/health');
        if (healthRes && healthRes.status === 200) {
            this.registry.ai_platform.status = 'online';
            console.log(' ✔ AI Platform está ONLINE e respondendo (Porta 4400).');
        } else {
            this.registry.ai_platform.status = 'offline';
            console.warn(' ❌ AI Platform está OFFLINE ou não responde.');
        }
        this.registry.ai_platform.lastCheck = new Date().toISOString();
    }

    // ============================================================================
    // FASE 4 - Self Healing
    // ============================================================================
    runSelfHealing() {
        console.log('[FASE 4] Avaliando métricas para Self Healing...');
        let needsHealing = false;

        // Se Docker ta online, mas AI Platform ta offline, forçar restart!
        if (this.registry.services.docker.status === 'online' && this.registry.ai_platform.status === 'offline') {
            needsHealing = true;
            console.warn(' ⚠️ Detectada anomalia: AI Platform caiu. Iniciando Self-Healing Docker Compose...');
            this.safeExec('docker compose -f docker-compose.enterprise.yml restart', GRG_DIR);
            this.registry.lastHealing = new Date().toISOString();
        }

        if (!needsHealing) {
            console.log(' ✔ Sistema saudável. Healing desnecessário.');
        }
    }

    // ============================================================================
    // FASE 5 - Mission Zero
    // ============================================================================
    runMissionZero() {
        console.log('[FASE 5] Mission Zero (Inventário & Benchmark)...');
        this.registry.benchmark = {
            memoryUsage: process.memoryUsage(),
            uptime: os.uptime(),
            loadavg: os.loadavg()
        };
    }

    // ============================================================================
    // FASE 6 - Production Readiness (Burn Test)
    // ============================================================================
    async runProductionReadiness() {
        // Roda o Burn Test se AI Platform estiver offline OU se for a primeira vez
        if (this.isRunningBurnTest) return;

        if (this.registry.ai_platform.status === 'offline') {
            console.warn('\n[FASE 6] ATENÇÃO: AI Platform está OFFLINE. Executando Production Readiness (Burn Test) automaticamente!\n');
            this.isRunningBurnTest = true;
            
            try {
                const burnTestScript = path.join(GRG_DIR, 'ops', 'burn-test.sh');
                if (fs.existsSync(burnTestScript)) {
                    // Executa o script inteiro e espera terminar
                    execSync(`bash ${burnTestScript}`, { cwd: GRG_DIR, stdio: 'inherit' });
                    this.registry.lastBurnTest = new Date().toISOString();
                    console.log(' ✔ Production Readiness executado com sucesso.');
                } else {
                    console.warn(` Script de Burn Test não encontrado em ${burnTestScript}`);
                }
            } catch (err) {
                console.error(' ❌ Falha no Production Readiness (Burn Test).', err.message);
            } finally {
                this.isRunningBurnTest = false;
            }
        } else {
            console.log('[FASE 6] Sistema Verde. Burn Test ignorado.');
        }
    }

    // ============================================================================
    // ETERNAL LOOP
    // ============================================================================
    async loop() {
        console.log('\n======================================================');
        console.log(`[${new Date().toISOString()}] Iniciando Ciclo FENIX BOOTSTRAP RUNTIME V4`);
        console.log('======================================================\n');
        
        try {
            this.runDiscovery();
            await this.checkAIPlatform();
            this.runSelfHealing();
            this.runMissionZero();
            await this.runProductionReadiness();
            
            this.registry.status = 'active';
            this.syncRegistry();
            
            console.log('\n ✔ Ciclo concluído com sucesso. Aguardando próximo tick...');
        } catch (e) {
            console.error('\n ❌ Falha crítica no ciclo do Runtime:', e);
        }

        setTimeout(() => this.loop(), this.pollInterval);
    }

    start() {
        this.loop();
    }
}

// Inicia se executado diretamente
if (require.main === module) {
    const runtime = new BootstrapRuntimeV4();
    runtime.start();
}

module.exports = BootstrapRuntimeV4;

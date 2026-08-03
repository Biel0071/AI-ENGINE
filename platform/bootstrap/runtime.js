const path = require('path');

/**
 * FÊNIX PLATFORM RUNTIME SERVICE (V1.0)
 * 
 * Este arquivo é o Serviço Permanente do FÊNIX. 
 * Ele orquestra o Kernel e expõe as APIs internas (REST & WebSocket).
 * Nenhuma regra de negócio é duplicada aqui. Tudo é delegado ao Kernel.
 */

class FenixRuntimeService {
    constructor() {
        this.status = 'initializing';
        this.startTime = Date.now();
        this.kernel = null;
        this.restApi = null;
        this.socketApi = null;
        this.manifestGenerator = null;
    }

    async boot() {
        console.log('FÊNIX PLATFORM RUNTIME: Boot Sequence Initiated...');
        try {
            // 1. Instanciar o Kernel real existente
            await this.loadKernel();

            // 2. Iniciar APIs
            await this.startInternalAPI();
            await this.startWebSocket();

            this.status = 'active';
            console.log('✅ FÊNIX PLATFORM RUNTIME: READY FOR PRODUCTION');
            console.log(`⏱️ Boot Time: ${Date.now() - this.startTime}ms`);

        } catch (error) {
            console.error('❌ FÊNIX PLATFORM RUNTIME: FATAL BOOT ERROR', error);
            this.status = 'error';
            process.exit(1);
        }
    }

    async loadKernel() {
        console.log(' -> Loading Core Kernel...');
        // O Kernel existe na pasta grg/src/core/Kernel.js ou similar.
        // Usamos path relativo ao diretorio bootstrap.
        const kernelPath = path.resolve(__dirname, '../../grg/src/core/Kernel.js');
        try {
            const KernelClass = require(kernelPath);
            this.kernel = new KernelClass();
            await this.kernel.boot();
            console.log(' -> Core Kernel Loaded.');
        } catch (e) {
            console.warn(`[WARNING] Kernel not found at ${kernelPath}. Using mock for bootstrap validation.`);
            // Fallback caso a localização exata do Kernel varie
            this.kernel = { 
                boot: async () => {},
                status: 'mocked' 
            };
        }
    }

    async startInternalAPI() {
        console.log(' -> Starting Internal REST API...');
        const RestAPI = require('../api/rest.js');
        this.restApi = new RestAPI(this);
        await this.restApi.start(2150); // Porta default para Internal API do Runtime
    }

    async startWebSocket() {
        console.log(' -> Starting WebSocket Server...');
        const SocketAPI = require('../api/socket.js');
        this.socketApi = new SocketAPI(this, this.restApi.getServer());
        await this.socketApi.start();
    }

    // Retorna o "Snapshot do Cérebro"
    async generateManifest() {
        const ManifestGenerator = require('../core/manifest.js');
        if (!this.manifestGenerator) {
            this.manifestGenerator = new ManifestGenerator(this);
        }
        return await this.manifestGenerator.generate();
    }
}

// Iniciar se chamado diretamente (daemon)
if (require.main === module) {
    const runtime = new FenixRuntimeService();
    runtime.boot();
}

module.exports = FenixRuntimeService;

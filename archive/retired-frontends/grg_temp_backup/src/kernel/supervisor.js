const { SystemModule } = require('./module');
const { STATE_MACHINE } = require('./states'); // We will create this

/**
 * Supervisor
 * Garante que os processos e subsistemas core do Kernel (EventBus, Scheduler, Workers)
 * permaneçam ativos. Reinicia automaticamente componentes falhos de acordo com as regras de resiliência.
 */
class Supervisor extends SystemModule {
  constructor(kernel) {
    super('supervisor', '2.0.0');
    this.kernel = kernel;
    this.monitoredComponents = new Map(); // componentName -> { instance, retryCount, maxRetries }
    this.checkInterval = 5000;
    this.timer = null;
  }

  async start() {
    this.status = 'starting';
    console.log('[Supervisor] Inicializando vigilância de processos...');
    
    this.timer = setInterval(() => this.checkHealth(), this.checkInterval);
    if (this.timer.unref) this.timer.unref();

    this.status = 'running';
    this.startTime = Date.now();
  }

  async stop() {
    this.status = 'stopped';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  watch(name, componentInstance, maxRetries = 3) {
    this.monitoredComponents.set(name, {
      instance: componentInstance,
      retryCount: 0,
      maxRetries
    });
    console.log(`[Supervisor] Monitorando: ${name}`);
  }

  async checkHealth() {
    for (const [name, record] of this.monitoredComponents.entries()) {
      try {
        const health = await record.instance.health();
        if (!health.ok) {
          console.warn(`[Supervisor] Degradação detectada em ${name}: ${health.status}`);
          await this.attemptRecovery(name, record);
        } else {
          // Reseta contador se estiver saudável por 1 ciclo
          record.retryCount = 0;
        }
      } catch (error) {
        console.error(`[Supervisor] Falha crítica em ${name}: ${error.message}`);
        await this.attemptRecovery(name, record);
      }
    }
  }

  async attemptRecovery(name, record) {
    if (record.retryCount >= record.maxRetries) {
      console.error(`[Supervisor] Falha permanente em ${name}. Limite de retries excedido.`);
      // Emite evento crítico no Kernel
      if (this.kernel.eventBus) {
        this.kernel.eventBus.publish({ type: 'system.failure', component: name, priority: 'CRITICAL' });
      }
      return;
    }

    record.retryCount++;
    console.log(`[Supervisor] Tentando reiniciar ${name} (Tentativa ${record.retryCount}/${record.maxRetries})...`);
    
    try {
      if (typeof record.instance.stop === 'function') await record.instance.stop();
      if (typeof record.instance.start === 'function') await record.instance.start();
      console.log(`[Supervisor] Sucesso ao reiniciar ${name}.`);
    } catch (e) {
      console.error(`[Supervisor] Falha ao reiniciar ${name}: ${e.message}`);
    }
  }
}

module.exports = { Supervisor };

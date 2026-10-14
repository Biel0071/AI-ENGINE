const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const fs = require('fs/promises');
const path = require('path');

/**
 * PluginManager v2.0
 * Gerencia o ciclo de vida de extensões no estilo VS Code.
 * Os plugins fornecem Capabilities ao Grafo e reagem a Eventos.
 */
class PluginManager extends SystemModule {
  constructor(capabilityGraph, eventBus) {
    super('plugin_manager', '2.0.0');
    this.capabilityGraph = capabilityGraph;
    this.eventBus = eventBus;
    this.plugins = new Map(); // id -> { manifest, instance, status }
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[PluginManager] Ready to load plugins.');
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    for (const [id, record] of this.plugins.entries()) {
      try {
        if (typeof record.instance.onStop === 'function') {
          await record.instance.onStop();
        }
      } catch (err) {
        console.error(`[PluginManager] Falha ao parar plugin ${id}:`, err);
      }
    }
  }

  /**
   * Carrega um plugin a partir de um diretório (espera um package.json ou manifest.json)
   */
  async loadPluginFromPath(pluginPath) {
    try {
      const manifestPath = path.join(pluginPath, 'manifest.json');
      const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestRaw);

      if (!manifest.id || !manifest.version || !manifest.main) {
        throw new Error('Manifest inválido. Requer id, version e main.');
      }

      const mainFile = path.join(pluginPath, manifest.main);
      const PluginClass = require(mainFile);
      const instance = new PluginClass();

      // Verifica contrato IPlugin (pato-tipagem)
      if (typeof instance.onStart !== 'function') {
        throw new Error('Plugin não implementa o contrato IPlugin (onStart missing).');
      }

      this.plugins.set(manifest.id, {
        manifest,
        instance,
        status: STATE_MACHINE.BOOT
      });

      console.log(`[PluginManager] Plugin carregado: ${manifest.id} v${manifest.version}`);
      return manifest.id;
    } catch (err) {
      console.error(`[PluginManager] Falha ao carregar plugin de ${pluginPath}:`, err.message);
      throw err;
    }
  }

  /**
   * Inicia um plugin carregado
   */
  async activatePlugin(id) {
    const record = this.plugins.get(id);
    if (!record) throw new Error(`Plugin não encontrado: ${id}`);
    
    if (record.status === STATE_MACHINE.ONLINE) return; // Já online

    console.log(`[PluginManager] Ativando plugin: ${id}`);
    try {
      await record.instance.onStart({
        eventBus: this.eventBus,
        capabilityGraph: this.capabilityGraph
      });
      record.status = STATE_MACHINE.ONLINE;
      
      // Auto-registrar capabilities exportadas no Manifest
      if (record.manifest.contributes && record.manifest.contributes.capabilities) {
        for (const capDef of record.manifest.contributes.capabilities) {
          // Injeta a função execute usando a instância do plugin
          const executableCap = {
            ...capDef,
            execute: (args) => record.instance.executeCapability(capDef.id, args)
          };
          this.capabilityGraph.register(executableCap);
        }
      }

      this.eventBus?.publish('plugin.activated', { pluginId: id });
    } catch (err) {
      record.status = STATE_MACHINE.ERROR;
      console.error(`[PluginManager] Erro ao ativar plugin ${id}:`, err);
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        loadedPlugins: this.plugins.size,
        plugins: Array.from(this.plugins.entries()).map(([id, record]) => ({
          id,
          version: record.manifest.version,
          status: record.status
        }))
      }
    };
  }
}

module.exports = { PluginManager };

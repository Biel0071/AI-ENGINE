/**
 * IServiceProvider Contract
 * Abstrai a instalação e gerenciamento do serviço daemon do FÊNIX OS.
 */
class IServiceProvider {
  constructor(serviceName, scriptPath) {
    this.serviceName = serviceName;
    this.scriptPath = scriptPath;
  }

  /**
   * Instala o serviço no OS hospedeiro
   * @returns {Promise<void>}
   */
  async install() { throw new Error('Not implemented'); }

  /**
   * Desinstala o serviço do OS hospedeiro
   * @returns {Promise<void>}
   */
  async uninstall() { throw new Error('Not implemented'); }

  /**
   * Inicia o serviço
   * @returns {Promise<void>}
   */
  async start() { throw new Error('Not implemented'); }

  /**
   * Interrompe o serviço
   * @returns {Promise<void>}
   */
  async stop() { throw new Error('Not implemented'); }

  /**
   * Retorna o status atual do serviço
   * @returns {Promise<string>} 'running' | 'stopped' | 'not_installed'
   */
  async status() { throw new Error('Not implemented'); }
}

module.exports = { IServiceProvider };

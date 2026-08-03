const { ServiceProviderContract } = require('./service-provider-contract');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class WindowsServiceProvider extends ServiceProviderContract {
  constructor() {
    super();
    this.serviceName = 'FenixOSDaemon';
    this.serviceDescription = 'FENIX OS v4.0 - Core Intelligence Daemon';
    this.scriptPath = path.resolve(__dirname, '../../runtime/daemon.js');
    this.nodePath = process.execPath;
  }

  async isInstalled() {
    try {
      const result = execSync(`powershell -Command "Get-Service -Name '${this.serviceName}' -ErrorAction SilentlyContinue"`, { stdio: 'pipe' }).toString();
      return result.includes(this.serviceName);
    } catch {
      return false;
    }
  }

  async install() {
    console.log(`[WindowsServiceProvider] Preparando instalacao do servico ${this.serviceName}...`);
    const isAlreadyInstalled = await this.isInstalled();
    if (isAlreadyInstalled) {
      console.log(`[WindowsServiceProvider] Servico ${this.serviceName} ja esta instalado.`);
      return;
    }
    
    try {
      // Usando NSSM ou SC para simplificar, mas como podemos não ter NSSM, criaremos via SC (Service Control).
      // Como o SC espera um executavel e o Node precisa do script, passamos os argumentos juntos
      const binPath = `"${this.nodePath}" "${this.scriptPath}"`;
      execSync(`sc create ${this.serviceName} binPath= "${binPath}" start= auto DisplayName= "${this.serviceDescription}"`, { stdio: 'ignore' });
      execSync(`sc description ${this.serviceName} "${this.serviceDescription}"`, { stdio: 'ignore' });
      console.log(`[WindowsServiceProvider] Servico ${this.serviceName} registrado para autostart via Windows Services.`);
    } catch (err) {
      console.error(`[WindowsServiceProvider] Falha ao instalar o servico: ${err.message}`);
    }
  }

  async start() {
    console.log(`[WindowsServiceProvider] Iniciando o servico ${this.serviceName}...`);
    try {
      execSync(`sc start ${this.serviceName}`, { stdio: 'ignore' });
    } catch (err) {
      console.error(`[WindowsServiceProvider] Falha ao iniciar: ${err.message}`);
    }
  }

  async stop() {
    console.log(`[WindowsServiceProvider] Parando o servico ${this.serviceName}...`);
    try {
      execSync(`sc stop ${this.serviceName}`, { stdio: 'ignore' });
    } catch (err) {
      console.error(`[WindowsServiceProvider] Falha ao parar: ${err.message}`);
    }
  }

  async status() {
    const installed = await this.isInstalled();
    let isRunning = false;
    if (installed) {
      try {
        const result = execSync(`sc query ${this.serviceName}`, { stdio: 'pipe' }).toString();
        isRunning = result.includes('RUNNING');
      } catch {
        isRunning = false;
      }
    }
    return {
      name: this.serviceName,
      isInstalled: installed,
      isRunning: isRunning
    };
  }
}

module.exports = { WindowsServiceProvider };

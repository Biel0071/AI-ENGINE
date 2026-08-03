const os = require('node:os');
const { WindowsServiceProvider } = require('./windows-service-provider');

function getServiceProvider(serviceName, scriptPath) {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return new WindowsServiceProvider(serviceName, scriptPath);
  } else if (platform === 'linux') {
    // Para simplificar a v2.0 neste momento, retornaremos um mock ou fallback
    throw new Error('Linux Systemd provider not fully implemented yet');
  } else if (platform === 'darwin') {
    throw new Error('Mac Launchd provider not fully implemented yet');
  } else {
    throw new Error(`Unsupported OS: ${platform}`);
  }
}

module.exports = { getServiceProvider };

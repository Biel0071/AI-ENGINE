const os = require('node:os');
const { WindowsServiceProvider } = require('./windows-service-provider');
const { LinuxServiceProvider } = require('./linux-service-provider');

function getServiceProvider(serviceName, scriptPath) {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return new WindowsServiceProvider(serviceName, scriptPath);
  } else if (platform === 'linux') {
    return new LinuxServiceProvider(serviceName, scriptPath);
  } else {
    throw new Error(`Unsupported OS: ${platform}. Only Windows and Linux are fully supported in FENIX OS v4.`);
  }
}

module.exports = { getServiceProvider };

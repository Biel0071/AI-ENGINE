const { execSync } = require('child_process');
const fs = require('fs');

class LinuxServiceProvider {
  constructor(serviceName, scriptPath) {
    this.serviceName = serviceName;
    this.scriptPath = scriptPath;
    this.serviceFilePath = `/etc/systemd/system/${this.serviceName}.service`;
  }

  install() {
    const serviceConfig = `[Unit]
Description=${this.serviceName} FENIX OS Daemon
After=network.target

[Service]
Type=simple
User=root
ExecStart=${process.execPath} ${this.scriptPath}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`;
    fs.writeFileSync(this.serviceFilePath, serviceConfig);
    execSync('systemctl daemon-reload', { stdio: 'ignore' });
    execSync(`systemctl enable ${this.serviceName}`, { stdio: 'ignore' });
  }

  uninstall() {
    if (fs.existsSync(this.serviceFilePath)) {
      this.stop();
      execSync(`systemctl disable ${this.serviceName}`, { stdio: 'ignore' });
      fs.unlinkSync(this.serviceFilePath);
      execSync('systemctl daemon-reload', { stdio: 'ignore' });
    }
  }

  start() {
    execSync(`systemctl start ${this.serviceName}`, { stdio: 'ignore' });
  }

  stop() {
    execSync(`systemctl stop ${this.serviceName}`, { stdio: 'ignore' });
  }

  status() {
    try {
      const output = execSync(`systemctl is-active ${this.serviceName}`).toString().trim();
      return { isRunning: output === 'active' };
    } catch {
      return { isRunning: false };
    }
  }
}

module.exports = { LinuxServiceProvider };

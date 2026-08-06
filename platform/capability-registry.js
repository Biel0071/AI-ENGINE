const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const FenixIntelligenceClient = require('./core/intelligence-client');

class CapabilityRegistry {
    constructor() {
        this.capabilities = this.detectCapabilities();
    }

    detectCapabilities() {
        const caps = {
            git: { enabled: false, tools: ['status', 'commit', 'branch', 'diff'] },
            node: { enabled: false, tools: ['npm', 'npx', 'tsc', 'test'] },
            python: { enabled: false, tools: ['pip', 'pytest', 'venv'] },
            docker: { enabled: false, tools: ['compose', 'ps', 'build'] },
            playwright: { enabled: false, tools: ['e2e', 'screenshot'] },
            github: { enabled: false, tools: ['clone', 'push', 'pull_request'] },
            lovable: { enabled: true, tools: ['ui_scaffold'] },
            figma: { enabled: false, tools: ['design_tokens'] }
        };

        try {
            execSync('git --version', { stdio: 'ignore' });
            caps.git.enabled = true;
            caps.github.enabled = true;
        } catch {}

        try {
            execSync('node -v', { stdio: 'ignore' });
            caps.node.enabled = true;
        } catch {}

        try {
            execSync('python --version', { stdio: 'ignore' });
            caps.python.enabled = true;
        } catch {}

        try {
            execSync('docker --version', { stdio: 'ignore' });
            caps.docker.enabled = true;
        } catch {}

        return caps;
    }

    getCapabilities() {
        return this.capabilities;
    }

    async discoverRemoteCapabilities(intelligenceClient) {
        try {
            const remoteCaps = await intelligenceClient.capabilities();
            for (const [key, enabled] of Object.entries(remoteCaps)) {
                // Se a API retornar um objeto detalhado, tentamos usar o "enabled", senão tratamos como booleano
                const isEnabled = typeof enabled === 'object' ? Boolean(enabled.enabled) : Boolean(enabled);
                this.capabilities[key] = { 
                    enabled: isEnabled, 
                    provider: 'FÊNIX Intelligence Service',
                    tools: typeof enabled === 'object' && enabled.tools ? enabled.tools : []
                };
            }
        } catch (error) {
            console.warn("[CapabilityRegistry] Falha ao descobrir capabilities remotos:", error.message);
        }
        return this.capabilities;
    }

    isEnabled(capabilityName) {
        return Boolean(this.capabilities[capabilityName] && this.capabilities[capabilityName].enabled);
    }
}

module.exports = CapabilityRegistry;

const fs = require('fs');
const path = require('path');

module.exports = {
  type: 'manager',
  name: 'PluginManager',
  version: '1.0.0',
  requires: ['PluginRegistry', 'CapabilityRegistry'],
  create(container) {
    const pluginRegistry = container.get('PluginRegistry');
    const capabilityRegistry = container.get('CapabilityRegistry');

    return {
      scan(pluginsDir) {
        if (!fs.existsSync(pluginsDir)) return;
        
        const folders = fs.readdirSync(pluginsDir);
        for (const folder of folders) {
          const pluginPath = path.join(pluginsDir, folder);
          if (fs.statSync(pluginPath).isDirectory()) {
            this.loadPlugin(pluginPath);
          }
        }
      },

      loadPlugin(pluginPath) {
        const manifestPath = path.join(pluginPath, 'plugin.json');
        if (!fs.existsSync(manifestPath)) return;

        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          
          if (!manifest.id || !manifest.capabilities) {
             console.warn('[PluginManager] Invalid manifest at ' + manifestPath);
             return;
          }

          if (pluginRegistry) {
            pluginRegistry.register(manifest.id, { ...manifest, path: pluginPath });
          }
          
          if (capabilityRegistry && Array.isArray(manifest.capabilities)) {
            manifest.capabilities.forEach(cap => {
              capabilityRegistry.register(cap, { owner: manifest.id, type: manifest.type });
            });
          }

          console.log('[PluginManager] Loaded Plugin: ' + manifest.id);
        } catch (e) {
          console.error('[PluginManager] Failed to load plugin at ' + pluginPath + ':', e.message);
        }
      }
    };
  }
};

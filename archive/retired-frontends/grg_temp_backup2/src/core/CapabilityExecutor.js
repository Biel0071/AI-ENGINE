module.exports = {
  type: 'executor',
  name: 'CapabilityExecutor',
  version: '1.0.0',
  requires: ['PluginRegistry', 'ExecutionPolicies'],
  create(container) {
    const pluginRegistry = container.get('PluginRegistry');
    const policies = container.get('ExecutionPolicies');

    return {
      async execute(pluginId, action, payload) {
        if (!pluginRegistry || !policies) {
          throw new Error('[CapabilityExecutor] Missing dependencies');
        }

        const pluginMeta = pluginRegistry.get(pluginId);
        if (!pluginMeta) {
          throw new Error('[CapabilityExecutor] Plugin not found: ' + pluginId);
        }

        // Apply Execution Policies (Permissions, Sandbox)
        await policies.enforce(pluginMeta, action);

        // Load Plugin Entry dynamically (Logical Sandbox for now)
        try {
          const pluginModule = require(pluginMeta.path + '/' + pluginMeta.entry);
          return await pluginModule.execute(action, payload);
        } catch (error) {
          throw new Error('[CapabilityExecutor] Plugin Execution Failed: ' + error.message);
        }
      }
    };
  }
};

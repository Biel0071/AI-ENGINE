module.exports = {
  type: 'router',
  name: 'CapabilityRouter',
  version: '1.0.0',
  requires: ['CapabilityRegistry'],
  create(container) {
    const capabilityRegistry = container.get('CapabilityRegistry');
    
    return {
      resolve(capabilityName) {
        if (!capabilityRegistry) return null;
        
        const capability = capabilityRegistry.get(capabilityName);
        if (!capability) return null;

        // In the future, this is where we check availability, latency, cost
        return capability.owner; // returns the plugin ID
      }
    };
  }
};

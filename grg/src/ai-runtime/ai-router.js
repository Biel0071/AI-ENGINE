class AIRouter {
  constructor(registry) {
    this.registry = registry;
  }

  isAvailable(capability) {
    const providers = this.registry.getProvidersForCapability(capability);
    return providers && providers.length > 0;
  }

  async execute(capability, payload) {
    const providers = this.registry.getProvidersForCapability(capability);
    if (!providers || providers.length === 0) {
      throw new Error(`[AIRouter] No providers registered for capability: ${capability}`);
    }

    // Try the first available provider for the capability.
    // In a full implementation, this could use fallback logic, load balancing, etc.
    for (const providerName of providers) {
      const provider = this.registry.getProviderInstance(providerName);
      if (provider) {
        try {
          if (typeof provider.generate === 'function') {
            const res = await provider.generate(payload.prompt);
            return res.text; // Assuming standard response format
          } else if (typeof provider.stream === 'function') {
            // Simplified fallback for stream-only providers
            return `[Simulated response from ${providerName} for ${capability}]`;
          }
        } catch (err) {
          console.warn(`[AIRouter] Provider ${providerName} failed for ${capability}, trying next...`, err.message);
        }
      }
    }

    throw new Error(`[AIRouter] All providers failed for capability: ${capability}`);
  }
}

module.exports = { AIRouter };

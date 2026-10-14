/**
 * FÊNIX OS — Function Inventory & Function Trace Engine
 * Maps functional capabilities across the full stack (UI -> Component -> API -> Database).
 */

class FunctionInventory {
  constructor({ projectId = 'default' } = {}) {
    this.projectId = projectId;
    this.features = new Map(); // featureId -> FeatureTrace
  }

  registerFeature({
    id,
    name,
    domain = 'business',
    page = null,
    components = [],
    services = [],
    apiRoutes = [],
    controllers = [],
    databaseTables = [],
    schemas = []
  }) {
    if (!id || !name) throw new Error('id and name are required for Feature');

    const feature = {
      id,
      name,
      domain,
      trace: {
        page,
        components,
        services,
        apiRoutes,
        controllers,
        databaseTables,
        schemas
      },
      registeredAt: new Date().toISOString()
    };

    this.features.set(id, feature);
    return feature;
  }

  getFeature(id) {
    return this.features.get(id) || null;
  }

  traceFeature(id) {
    const feat = this.getFeature(id);
    if (!feat) return null;
    return {
      featureId: feat.id,
      featureName: feat.name,
      domain: feat.domain,
      chain: {
        '1. View / Page': feat.trace.page,
        '2. UI Components': feat.trace.components,
        '3. Frontend Services': feat.trace.services,
        '4. API Endpoints': feat.trace.apiRoutes,
        '5. Backend Controllers': feat.trace.controllers,
        '6. Database Schemas/Tables': feat.trace.databaseTables,
        '7. Validation Rules': feat.trace.schemas
      }
    };
  }

  listAll() {
    return Array.from(this.features.values());
  }
}

module.exports = { FunctionInventory };

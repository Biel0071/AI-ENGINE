const { Registry } = require('./Registry');
const { RuntimeRegistry } = require('./RuntimeRegistry');

class ModuleRegistry extends Registry { constructor() { super('ModuleRegistry'); } }
class CapabilityRegistry extends Registry { constructor() { super('CapabilityRegistry'); } }
class ServiceRegistry extends Registry { constructor() { super('ServiceRegistry'); } }
class KnowledgeRegistry extends Registry { constructor() { super('KnowledgeRegistry'); } }
class MissionRegistry extends Registry { constructor() { super('MissionRegistry'); } }
class WorkerRegistry extends Registry { constructor() { super('WorkerRegistry'); } }
class ProjectRegistry extends Registry { constructor() { super('ProjectRegistry'); } }
class ProviderRegistry extends Registry { constructor() { super('ProviderRegistry'); } }
class EvolutionRegistry extends Registry { constructor() { super('EvolutionRegistry'); } }
class RouteRegistry extends Registry { constructor() { super('RouteRegistry'); } }
class EventRegistry extends Registry { constructor() { super('EventRegistry'); } }
class PluginRegistry extends Registry { constructor() { super('PluginRegistry'); } }
class SessionRegistry extends Registry { constructor() { super('SessionRegistry'); } }

module.exports = {
  ModuleRegistry,
  CapabilityRegistry,
  ServiceRegistry,
  KnowledgeRegistry,
  MissionRegistry,
  WorkerRegistry,
  ProjectRegistry,
  ProviderRegistry,
  EvolutionRegistry,
  RuntimeRegistry,
  RouteRegistry,
  EventRegistry,
  PluginRegistry,
  SessionRegistry
};

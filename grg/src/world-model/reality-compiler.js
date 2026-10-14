'use strict';

const crypto = require('node:crypto');
const { isEntityType, isRelationshipType } = require('./reality-ontology');

const BLUEPRINT_SCHEMA_VERSION = '1.0.0';

function isOrganizationCreationIntent(intent) {
  const normalized = String(intent || '').trim().toLocaleLowerCase('pt-BR');
  return /\b(crie|criar|create|construa|construir)\b/.test(normalized)
    && /\b(empresa|organiza[cç][aã]o|organization|company)\b/.test(normalized)
    && /\b(software|tecnologia|tech|desenvolvimento)\b/.test(normalized);
}

function stableId(value, length = 12) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project';
}

function findVacantPlot(existingBuildings, seed) {
  const candidates = [{ x: 9, z: -8 }];
  for (let ring = 1; ring <= 8; ring += 1) {
    const distance = ring * 20;
    candidates.push(
      { x: 9 + distance, z: -8 }, { x: 9 - distance, z: -8 },
      { x: 9, z: -8 + distance }, { x: 9, z: -8 - distance },
      { x: 9 + distance, z: -8 + distance }, { x: 9 - distance, z: -8 - distance },
      { x: 9 + distance, z: -8 - distance }, { x: 9 - distance, z: -8 + distance }
    );
  }
  const offset = parseInt(seed.slice(0, 2), 16) % candidates.length;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[(offset + i) % candidates.length];
    const occupied = existingBuildings.some(building => {
      const point = building?.coordinates;
      if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.z))) return false;
      return Math.abs(Number(point.x) - candidate.x) < 18 && Math.abs(Number(point.z) - candidate.z) < 16;
    });
    if (!occupied) return { x: candidate.x, y: 0, z: candidate.z };
  }
  throw new Error('No vacant plot is available for the new workspace.');
}

class RealityCompiler {
  compile(intent, { tenantId = 'grg', project, existingBuildings = [] } = {}) {
    const text = String(intent || '').trim();
    const recognized = isOrganizationCreationIntent(text);

    if (!recognized) return { recognized: false, reason: 'Intent is outside the currently implemented RealityCompiler slice.' };
    if (!project || !project.id || !project.name) {
      return { recognized: false, reason: 'A real project must be selected before creating its organization.' };
    }

    const projectSlug = slugify(project.id);
    const organizationId = `org-${projectSlug}-software`;
    const buildingId = `bld-${projectSlug}-workspace`;
    const worldId = `world:${slugify(tenantId)}:city`;
    const digest = stableId(`${tenantId}:${project.id}:workspace`);
    const coordinates = findVacantPlot(
      existingBuildings.filter(building => building?.id !== buildingId), digest
    );
    const organizationName = `${project.name} Software`;
    const entities = [
      {
        id: organizationId,
        type: 'ORGANIZATION',
        name: organizationName,
        organizationType: 'SOFTWARE_COMPANY',
        tenantId,
        projectId: project.id,
        buildingId,
        status: 'ACTIVE'
      },
      {
        id: buildingId,
        type: 'BUILDING',
        name: `${project.name} Workspace`,
        tenantId,
        projectId: project.id,
        organizationId,
        district: 'project-district',
        floors: 3,
        coordinates,
        color: '#06b6d4',
        icon: '🏢',
        function: 'Software engineering workspace',
        status: 'ACTIVE'
      }
    ];
    const relationships = [
      { from: worldId, type: 'CONTAINS', to: organizationId },
      { from: organizationId, type: 'CONTAINS', to: buildingId },
      { from: organizationId, type: 'SERVES', to: `project:${project.id}` },
      { from: buildingId, type: 'LOCATED_IN', to: worldId }
    ];
    if (entities.some(entity => !isEntityType(entity.type))) throw new Error('Blueprint contains an unsupported ontology entity.');
    if (relationships.some(edge => !isRelationshipType(edge.type))) throw new Error('Blueprint contains an unsupported ontology relationship.');

    const blueprintId = `blueprint-${stableId(`${tenantId}:${project.id}:software-company`)}`;
    return {
      recognized: true,
      blueprint: {
        id: blueprintId,
        schemaVersion: BLUEPRINT_SCHEMA_VERSION,
        compiler: 'FenixRealityCompiler',
        tenantId,
        projectId: project.id,
        project: { id: project.id, name: project.name },
        intent: text,
        worldId,
        entities,
        relationships,
        constructionPlan: {
          steps: [
            { id: `${blueprintId}:organization`, action: 'MATERIALIZE_ORGANIZATION', targetId: organizationId },
            { id: `${blueprintId}:workspace`, action: 'MATERIALIZE_BUILDING', targetId: buildingId }
          ]
        },
      }
    };
  }
}

function persistBlueprintToGraphBrain(blueprint, graphBrain) {
  if (!blueprint || !graphBrain) throw new Error('Blueprint and Graph Brain are required.');
  const world = { id: blueprint.worldId, type: 'WORLD', properties: { tenantId: blueprint.tenantId, name: 'FÊNIX City' } };
  const project = {
    id: `project:${blueprint.projectId}`,
    type: 'PROJECT',
    properties: {
      projectId: blueprint.projectId,
      name: blueprint.project?.name || blueprint.projectId,
      tenantId: blueprint.tenantId
    }
  };
  const entities = [world, project, ...blueprint.entities.map(entity => ({
    id: entity.type === 'ORGANIZATION' ? `organization:${entity.id}` : `building:${entity.id}`,
    type: entity.type,
    properties: { ...entity }
  }))];
  for (const node of entities) {
    const existing = graphBrain.nodes.get(node.id);
    if (existing && existing.type !== node.type) throw new Error(`Graph node type conflict for ${node.id}.`);
    if (!existing) graphBrain.addNode(node.id, node.type, node.properties);
  }

  const idByEntity = new Map(blueprint.entities.map(entity => [entity.id,
    entity.type === 'ORGANIZATION' ? `organization:${entity.id}` : `building:${entity.id}`]));
  idByEntity.set(blueprint.worldId, blueprint.worldId);
  idByEntity.set(`project:${blueprint.projectId}`, `project:${blueprint.projectId}`);
  for (const relation of blueprint.relationships) {
    const from = idByEntity.get(relation.from) || relation.from;
    const to = idByEntity.get(relation.to) || relation.to;
    const exists = graphBrain.edges.some(edge => edge.from === from && edge.type === relation.type && edge.to === to);
    if (!exists) graphBrain.addEdge(from, relation.type, to, { blueprintId: blueprint.id });
  }
  if (graphBrain.save() === false) throw new Error('Graph Brain could not persist the world blueprint.');
  return { nodes: entities.map(node => node.id), relationships: blueprint.relationships.length };
}

module.exports = { RealityCompiler, persistBlueprintToGraphBrain, isOrganizationCreationIntent, findVacantPlot, BLUEPRINT_SCHEMA_VERSION };

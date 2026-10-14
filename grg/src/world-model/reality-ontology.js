'use strict';

// Extensible vocabulary for entities and relations that can inhabit a Fênix world.
// The first compiler slice only materializes organizations and buildings.
const ENTITY_TYPES = Object.freeze([
  'WORLD', 'ORGANIZATION', 'AGENT', 'BUILDING', 'FLOOR', 'ROOM', 'VEHICLE',
  'MACHINE', 'OBJECT', 'RESOURCE', 'PROJECT', 'MISSION', 'JOB', 'PROCESS',
  'SERVICE', 'SYSTEM', 'INFRASTRUCTURE', 'DISTRICT', 'CITY'
]);

const RELATIONSHIP_TYPES = Object.freeze([
  'CONTAINS', 'PART_OF', 'OWNS', 'LOCATED_IN', 'WORKS_IN', 'MANAGES',
  'DEPENDS_ON', 'PRODUCES', 'CONSUMES', 'EXECUTES', 'COMMUNICATES_WITH',
  'CONNECTED_TO', 'SERVES', 'HAS_WORLD', 'BELONGS_TO'
]);

function isEntityType(type) {
  return ENTITY_TYPES.includes(type);
}

function isRelationshipType(type) {
  return RELATIONSHIP_TYPES.includes(type);
}

module.exports = { ENTITY_TYPES, RELATIONSHIP_TYPES, isEntityType, isRelationshipType };

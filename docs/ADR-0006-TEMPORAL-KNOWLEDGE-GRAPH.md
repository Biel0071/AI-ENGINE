# ADR-0006: Temporal, versioned Knowledge Graph

- Status: accepted
- Date: 2026-07-27
- Scope: systems, services, repositories, entities, capabilities, dependencies and causal impact

## Decision

State schema v7 introduces canonical `knowledgeEntities` and `knowledgeRelationships` while preserving legacy `graphEdges` during migration.

Entities are tenant-scoped, typed, versioned and carry attributes, confidence and provenance. A stable `(tenant, type, key)` identity evolves in place. Relationships require existing endpoints in the same tenant and retain temporal history: changing relationship attributes closes the active edge with `validTo` and creates a new version with `validFrom`.

The service supports bounded neighborhoods, directed shortest paths, confidence-weighted downstream impact and anomaly detection for dangling/self-loop edges. Traversal depth is capped to protect the control plane from unbounded queries. Graph read/write permissions are explicit in RBAC.

## Storage choice

The first canonical implementation uses the configured transactional kernel store so entity/relationship changes participate in the same persistence and backup boundary. Neo4j/ArangoDB is not introduced yet: current graph size and query shapes do not justify another critical datastore before legacy producers move to the canonical service. The service boundary permits a graph database adapter later without changing callers.

## Compatibility and migration

`GET /api/graph` remains the Alpha compatibility view. New APIs live under `/api/knowledge-graph`. Producers will move incrementally; legacy edges are not silently promoted because most lack complete provenance/confidence required by the canonical schema.

## Limitations

Impact is transparent reachability with multiplied edge confidence, not proof of real-world causality. Cypher/Gremlin, graph embeddings, community detection and automated legacy ingestion remain future increments.

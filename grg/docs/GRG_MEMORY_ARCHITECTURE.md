# GRG Memory Architecture

Short-lived execution context belongs to a mission/job. Durable engineering memory belongs to tenant/project and records actor, summary, evidence, confidence and timestamps. Knowledge graph edges connect memories and insights to concrete project/repository nodes.

The current local fallback is FileStore plus local vector indexing; Postgres/Qdrant/Redis adapters are available when configured. Memory consolidation and EvolutionEngine consume real event signals and deduplicate stable insight keys.

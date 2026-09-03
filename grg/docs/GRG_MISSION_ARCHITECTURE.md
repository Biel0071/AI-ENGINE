# GRG Mission Architecture

`Conversation -> Intent -> Plan -> Mission -> DAG Jobs -> Agent/Tool execution -> Events -> Validation -> Artifacts -> Memory -> Report`.

MissionKernel owns lifecycle and step dependencies. JobEngine owns claim, heartbeat, retries, dead-letter recovery, pause/resume/cancel and result events. Reconcile repairs lost unlock events and finalizes missions only when every step has a terminal validated result.

Autonomy remains policy-controlled: read/plan may be automatic; mutating work requires scoped permissions and, where configured, approval. Completion is evidence-based rather than model text.

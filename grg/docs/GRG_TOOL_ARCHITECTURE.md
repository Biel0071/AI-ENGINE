# GRG Tool Architecture

`ToolRegistry` is the governance boundary. A registered tool has an id, version, command, digest-pinned image, capabilities, permissions, requirements and network policy.

Existing native surfaces include filesystem, terminal, git/worktree, project mirror, browser QA, knowledge/memory, scheduler and sandbox execution. Every mutating execution must pass authorization, policy/resource limits, audit emission and result persistence.

Next implementation: expose one canonical tool schema/handler contract so native tools and MCP-discovered tools share discovery, permission checks, retries, timeout and audit behavior.

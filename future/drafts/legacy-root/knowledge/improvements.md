# Inbox Rebuild Learnings and Future Improvements

## Scope
Source analyzed from the recent Inbox v2 rebuild:
- frontend/src/modules/inbox/types.ts
- frontend/src/modules/inbox/inboxGateway.ts
- frontend/src/modules/inbox/useInboxController.ts
- frontend/src/modules/inbox/components/InboxConversationList.tsx
- frontend/src/modules/inbox/components/InboxChatPanel.tsx
- frontend/src/modules/inbox/InboxModule.tsx
- frontend/src/pages/InboxPage.tsx

## What Worked Well
- Runtime dual-mode strategy (live and mock) prevented operational dead-ends during API/session failures.
- Controller-level orchestration kept UI components mostly stateless and focused on rendering.
- Unified domain mapping in gateway absorbed backend payload variability and protected UI contract stability.
- Optimistic send flow with explicit statuses (sending, sent, failed) improved feedback without blocking throughput.
- Realtime subscription with cleanup and periodic connection polling reduced stale state and memory leak risk.
- Legacy page replaced by thin wrapper preserved routes while allowing a full module rewrite.

## Problems Resolved
- Monolithic page complexity was replaced by modular responsibilities (gateway, controller, UI components).
- Inconsistent loading/error/empty behavior was standardized across list and chat panel.
- Session-dependent send failures are now preempted by connection gating and contextual error messaging.
- New incoming messages now update both list ordering and active-thread state coherently.
- Unread counters are normalized when selecting and loading a conversation.

## Stability Decisions That Avoided System Breakage
- Fallback switch from live boot to mock boot on exception avoided white-screen scenarios.
- Defensive data normalization with mapConversation/mapMessage reduced backend contract fragility.
- Retry entry point for conversations allowed graceful recovery from transient API outages.
- Realtime unsubscribe plus interval clear on unmount prevented duplicate listeners and runaway updates.
- Page-level compatibility wrapper isolated navigation/routing from internal module replacement risk.

## Always Follow
- Separate concerns in this order: types -> gateway -> controller hook -> presentational components -> page wrapper.
- Keep UI resilient by making loading/error/empty states first-class, not afterthoughts.
- Keep network and transformation logic out of rendering components.
- Model runtime mode explicitly and expose it in UI for operational transparency.
- Use optimistic updates only with deterministic rollback/failure markers.
- Sort conversation list by reliable timestamps after every mutation path.

## Avoid
- Embedding API calls directly into visual components.
- Assuming backend payload shape is stable across all endpoints.
- Treating realtime as source of truth without reconciliation with selected thread state.
- Hiding connectivity constraints from users when send actions are impossible.
- Big-bang replacements without compatibility wrappers for existing route contracts.

## Future Optimizations
- Add message pagination/windowing for large threads.
- Add conversation list virtualization for high-volume tenants.
- Introduce offline queue for send retries with idempotent client message keys.
- Promote runtime mode transition telemetry (live<->mock) to diagnostics.
- Add exponential backoff for connection polling and retry paths.
- Persist selected conversation and drafts per tenant/user session.
- Add contract tests for gateway mappers against representative payload fixtures.

## Scale Points
- Move controller state transitions into reducer/state-machine for predictability under concurrency.
- Split realtime event processing into dedicated event adapters per event family.
- Introduce cache layer for conversations/messages (SWR/React Query style) with stale-while-revalidate.
- Add bounded in-memory message store and dedup by message id+conversation id.
- Capture UX metrics: time-to-first-conversation, send success ratio, reconnect latency.

## Flow Improvements
- Add explicit reconnect CTA when disconnected in live mode.
- Add per-thread retry and resend controls for failed messages.
- Add keyboard and accessibility flows for list navigation and composer actions.
- Show unread badge in list rows and suppress after thread open acknowledgment.

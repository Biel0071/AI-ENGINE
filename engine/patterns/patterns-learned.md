# Reusable Architecture Patterns Learned from Inbox v2

## 1) Ideal Module Structure
Standard module blueprint:
- types.ts: strict UI-facing contracts and runtime enums.
- gateway.ts: live/mock transport and payload normalization.
- use<Module>Controller.ts: orchestration, side effects, state transitions.
- components/: split by role (list, panel, composer, status blocks).
- <Module>.tsx: composition shell (wires controller to components).
- page wrapper: keeps route/API contract stable during internal rewrites.

Expected properties:
- Testable boundaries.
- Replaceable internals without route churn.
- Fast diagnosis of faults by layer.

## 2) Controller Pattern (Hook + Gateway)
Controller responsibilities:
- Own complete module state (data + UI state + operation flags + errors).
- Boot sequence with concurrent calls where possible.
- Decide runtime mode based on capability/failure.
- Resolve selected entity and derived counters with memoized selectors.
- Handle optimistic actions and deterministic rollback paths.
- Subscribe/unsubscribe realtime updates and reconcile list/thread state.

Gateway responsibilities:
- Normalize raw payloads into typed domain objects.
- Hide endpoint names and retry options from UI layers.
- Provide symmetrical methods for live and mock execution.

Decision rule:
- UI never talks directly to API/realtime.

## 3) Fallback Pattern (API + Mock)
Boot policy:
- Try live connection + live conversations.
- If failure, downgrade to mock runtime and continue operation.

Operational policy:
- Keep same typed contracts in both modes.
- Surface fallback state to user (runtime badge + contextual messaging).
- Keep send/read behavior available in mock mode to avoid blocked workflows.

Recovery policy:
- Provide explicit retry action to attempt return to live mode.
- Poll connection status periodically to detect restoration opportunities.

## 4) UI Pattern (List + Panel + States)
Layout pattern:
- Left: searchable conversation list.
- Right: active chat panel and composer.
- Top: compact operational badges and counters.

State pattern per region:
- Loading: skeleton or pulse placeholders.
- Empty: clear no-data guidance.
- Error: explicit error block with retry CTA.
- Success/normal: typed content rendering.

Interaction pattern:
- Selecting conversation clears unread and fetches thread.
- Composer sends on button or Enter, with Shift+Enter preserved.
- Disabled interactions when prerequisites are missing (thread, connection, payload).

## 5) Realtime Integration Pattern
Subscription pattern:
- connect once in module lifecycle.
- bind known event aliases.
- map incoming payloads into typed message model.
- cleanup listeners and disconnect on unmount.

Reconciliation pattern:
- If message belongs to active thread: append message and reset typing indicator.
- If message belongs to inactive thread: update last message, increment unread, reorder list.
- Always sort conversations by most recent timestamp after mutations.

Safety pattern:
- Use refs to avoid stale selected-thread closures in event callbacks.
- Do not rely on realtime as sole truth; keep fetch flows available.

## Architectural Decisions Rated Correct
- Domain mapping in gateway before state mutation.
- Runtime-mode as explicit state variable.
- Presentational component purity.
- Optimistic sending with visual status transitions.
- Thin wrapper migration from legacy page to new module.

## Anti-Patterns to Block in Future Builds
- Monolithic pages that blend transport, orchestration, and rendering.
- Hidden fallback behavior (silent mode changes).
- Inconsistent state handling across list/panel/composer.
- Missing cleanup in intervals/subscriptions.
- Non-typed payload propagation from API to UI.

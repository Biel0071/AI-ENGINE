# Inbox UI Design Patterns Learned

## Chat Structure Pattern
- Header block with identity context: contact name + channel identifier.
- Operational status chips: connection state and runtime mode always visible.
- Scrollable message timeline with auto-scroll only when user is near bottom.
- Bubble differentiation by sender with strong contrast and compact metadata.
- Composer pinned at bottom with multiline input and explicit send affordance.

## Conversation List Behavior Pattern
- Search-first list header for fast filtering by name or phone.
- Dense card rows with avatar, title, preview, and last-activity time.
- Active row with stronger border/background to maintain focus orientation.
- Readability-first truncation strategy for names and previews.
- List body with bounded height and independent scrolling.

## Visual State Pattern
For list and panel, every state must be explicit:
- Loading: skeleton or pulse placeholders with layout-preserving dimensions.
- Empty (global/list): no conversations with onboarding-style guidance text.
- Empty (thread): selected thread without messages prompts first action.
- Error: high-contrast error card + recovery action.
- Disabled: composer and send controls blocked when connection or selection is invalid.

## Send Feedback Pattern
- Optimistic message insertion with status icon per message lifecycle.
- Status progression:
  - sending -> clock marker
  - sent -> confirmation marker
  - failed -> error marker
- Immediate draft clear on optimistic dispatch to preserve perceived speed.
- Contextual inline error when sending is blocked or fails.
- Keyboard behavior: Enter sends, Shift+Enter inserts newline.

## Reusable UX Rules
- Never hide operational state from agents/operators.
- Keep one clear primary action in each zone (retry, select, send).
- Preserve layout stability when switching between states.
- Keep microcopy action-oriented and specific to failure cause.
- Favor progressive disclosure over overloaded side panels.

## UI Stability Heuristics
- Defensive fallback text for missing fields (name, phone, timestamps).
- Graceful handling when list exists but active conversation is null.
- Maintain interaction continuity when realtime events mutate off-screen conversations.
- Keep visual semantics consistent: same tones for success/info/error across module.

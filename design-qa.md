# AI Response + Streaming + Sources + Conversation History Design QA

- Previous response-design source: `C:\Users\omidi\Pictures\Screenshots\Screenshot 2026-08-20 185125.png`
- Streaming/loading source: user-supplied Task 4 reference image in the conversation (displayed at 2048 × 1827; no filesystem path exposed to the workspace)
- Sources/citation source: user-supplied Sources / Citation Experience reference image in the conversation (displayed at 2048 × 1827; no filesystem path exposed to the workspace)
- Conversation-history source: user-supplied Conversation History Management reference image in the conversation (displayed at 1978 × 1724; no filesystem path exposed to the workspace)
- Implementation target: `src/features/chat/` response lifecycle plus `src/features/history/` conversation-history components integrated into the existing sidebar
- Protected baseline: homepage, ambient motion, header, sidebars, right panels, prompt composer, conversation layout, and completed response design
- Intended viewports: desktop, tablet, and mobile
- Implementation screenshot path: unavailable
- Implementation pixels / CSS viewport / density: unavailable because no configured in-app browser surface is connected
- States: empty homepage, pre-token loading, activity transitions, progressive response streaming, completed response, collapsed sources, expanded source details, analyzed files, history loading, search results, empty search, active conversation, action menu, inline rename, pinned, archived, and mobile drawer

## Full-view comparison evidence

Blocked. The source references were inspected and the local preview returned HTTP 200, but the in-app browser runtime returned no available browser instances. Same-state rendered captures could not be placed beside the sources for visual comparison.

## Focused region comparison evidence

Blocked. Focused comparisons of the premium loader, activity timeline, streaming cursor, code reveal, completed response, source details, analyzed files, grouped history, search, context actions, and responsive drawer require browser-rendered screenshots.

## Findings

- [P2] Rendered visual verification is unavailable.
  - Location: loading, post-submit conversation, Sources / Citation, and Conversation History states at all required breakpoints.
  - Evidence: the production build and HTTP preview succeed, but the in-app browser returned no available instance.
  - Impact: animation timing, optical alignment, viewport density, internal scrolling, responsive wrapping, hover states, and exact reference fidelity cannot be certified.
  - Fix: connect an available in-app browser, capture the required states, and compare them with the sources in shared visual inputs.

## Open questions

- The repository still has no grounded chat route. The local presentation demonstrates the response lifecycle with safe placeholder copy; contract-backed stream events can replace this lifecycle without changing the new presentation components.
- The protected citation contract accepts allowlisted official Liara sources only. External documentation is not rendered until an approved, validated contract path exists for it.

## Required fidelity surfaces

- Fonts and typography: new states inherit the existing application stack, sizes, weights, and line-height scale; browser comparison is blocked.
- Spacing and layout rhythm: the loader inherits the existing response grid and breakpoints; browser comparison is blocked.
- Colors and visual tokens: only the existing dark glass, cyan, mint, border, and muted-gray language is used; browser comparison is blocked.
- Image quality and asset fidelity: the existing `/liara-logo.png` and installed Lucide icon set are reused; no replacement or generated placeholder assets were introduced.
- Copy and content: activity labels are high-level user-facing states only; hidden reasoning and chain-of-thought are not rendered.
- Sources and grounding: source titles, URLs, sections, paths, and snippets are rendered only from supplied citation or project-evidence data; the zero-source state does not invent trust claims.
- Conversation history: labels, grouping, time metadata, search, filters, and action copy follow the supplied history reference; seeded entries are explicitly local sample history rather than fabricated server data.

## Protected UI verification

- Empty-state, header, right-panel, background, composer markup, conversation layout, response presentation, streaming, and source components are unchanged.
- `src/features/home/copilot-home.module.css` changes are limited to an active state on the existing New Chat control and scroll containment for the existing recent-conversations region.
- `src/features/home/copilot-home.tsx` changes are limited to replacing the previous static recent list with the additive history component and routing existing prompt submissions through history metadata registration.
- `src/features/chat/use-streaming-conversation.ts` only adds a safe reset method used by New Chat, archive, and delete; its existing loading and streaming lifecycle is unchanged.
- The completed response still uses the existing `AiResponseCard`, section, status, code, interaction, and recommended-action design.
- Sources are appended after completed response actions; no homepage, shell, conversation, response, streaming, or loading stylesheet was visually changed for this task.
- Initial server-rendered HTML returns HTTP 200 and contains the existing homepage heading.

## Interaction checks

- New messages enter a dedicated pre-token loading phase before any answer text appears.
- Four public activity steps transition from pending to active to complete without exposing hidden reasoning.
- Response sections reveal in sequence, active text carries a blinking cursor, and the code block fades in near completion.
- Response feedback, copy, sources, and recommended actions remain unavailable until generation completes.
- Near-bottom auto-scroll follows growing streamed content without pulling back a user who has scrolled away.
- Desktop, tablet, and mobile layouts are covered by the existing response breakpoints and new matching loader breakpoints.
- All new animation has a reduced-motion fallback.
- Browser click testing, focus inspection, console inspection, and screenshot comparison remain blocked.
- Sources show a count, compact selectable cards, official/project trust labels, an inert accessible collapsed state, selected detail panels, documentation actions, and analyzed-file paths.
- Grounding badges appear only when corresponding official citations, project context, or configuration analysis data is explicitly supplied.
- The zero-source state stays compact and explicitly states that no verified grounding data was attached.
- Conversation history groups validated metadata into Today, Yesterday, and Older sections and keeps pinned items first within each group.
- Search filters immediately and exposes a dedicated empty-result state with a clear action.
- Rename, pin/unpin, archive/restore, and two-step delete are available from an accessible context menu; Escape and outside-click close the menu.
- History metadata is validated with Zod and persisted locally with guarded storage access; invalid saved payloads fall back to local sample history.
- The existing mobile sidebar is reused as the history drawer, and selecting a conversation closes it at the existing 1020px breakpoint.
- New Chat cancels pending generation work, clears only the active conversation, and returns to the unchanged homepage empty state.

## Validation

- ESLint passed with zero warnings.
- TypeScript strict-mode typecheck passed.
- Vitest passed: 5 files, 21 tests, including loading-before-first-token, progressive-section, citation grounding, history validation, grouping, filtering, invalid-storage fallback, and title normalization coverage.
- Next.js production build passed.
- HTTP preview returned 200 and contained the existing homepage heading.
- `git diff --check` passed.

## Comparison history

- Previous response-design pass: structured response sections, workflow rail, code block, interactions, and recommended actions were implemented while preserving the shell.
- Streaming/loading pass: additive loader, activity timeline, progressive text, cursor, code reveal, responsive rules, and reduced-motion handling were added around the existing completed response.
- Sources/citation pass: additive source cards, expand/collapse, selected documentation/project details, analyzed files, and grounding badges were appended after completed responses.
- Conversation-history pass: reusable model, persistence hook, grouped list, instant search, filters, active/loading/empty states, context actions, and mobile drawer integration were added only within the existing sidebar.
- Rendered comparison: blocked because no browser surface is connected; no pixel-level visual pass is claimed.

## Implementation checklist

- Connect an available in-app browser.
- Capture loading, mid-stream, and completed states at desktop width.
- Capture loading and completed states at tablet and mobile widths.
- Capture collapsed, expanded documentation, expanded project-context, and zero-source states at desktop and mobile widths.
- Capture history loading, grouped list, filtered search, action menu, inline rename, active conversation, and mobile drawer states.
- Inspect overflow, primary interactions, focus behavior, reduced motion, and console output.
- Compare full views and focused response regions, then resolve any visible P0/P1/P2 mismatch.

## Follow-up polish

- No speculative optical tuning is proposed without rendered comparison evidence.

final result: blocked

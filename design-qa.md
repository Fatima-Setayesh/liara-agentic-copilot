# Chat Workspace Design QA

- Source visual truth: the inline chat-workspace reference attached to the implementation request
- Implementation target: `src/features/chat/chat-workspace.tsx` and `src/features/chat/chat-workspace.module.css`
- Protected baseline: the existing Liara landing/empty state and `src/features/home/copilot-home.module.css`
- Intended state: first prompt submitted, desktop chat workspace visible, right inspector behavior unchanged
- Intended desktop viewport: 1600 × 1307 reference proportions, normalized to the available application viewport
- Implementation screenshot: unavailable because the configured browser runtime reported no available browser instances

## Full-view comparison evidence

Blocked. The reference image is available in the conversation, but no browser-rendered implementation screenshot could be captured for a same-state comparison.

## Focused region comparison evidence

Blocked for the same reason. Source-level inspection confirms the new workspace is isolated to its own component and stylesheet, but optical fidelity cannot be certified without rendered pixels.

## Findings

- [P1] Browser-rendered chat workspace verification is unavailable.
  - Location: full chat workspace after first prompt submission.
  - Evidence: browser selection returned `No browser is available`; runtime discovery returned an empty browser list.
  - Impact: responsive fit, internal scrolling, composer docking, animation appearance, and comparison against the supplied screenshot cannot be visually certified.
  - Fix: reconnect the in-app browser, submit a prompt, and capture the desktop and mobile chat states.

- [P2] A grounded answer backend is not present in the current repository.
  - Location: response, agent progress, and sources sections.
  - Evidence: the repository contains the versioned `/api/chat` contract but no route implementation.
  - Impact: the UI must show an honest pending state and cannot display fabricated Liara guidance, agent operations, or citations.
  - Fix: connect the existing versioned UI-message contract to an authoritative chat route in a separate backend task.

## Required fidelity surfaces

- Fonts and typography: inherited from the existing application; new workspace uses the same compact hierarchy and muted/mint emphasis.
- Spacing and layout rhythm: conversation stream, structured response, progress, sources, actions, and docked composer follow the reference hierarchy while staying inside the existing content column.
- Colors and visual tokens: existing dark glass, cyan, mint, border, and glow direction reused; no new brand color introduced.
- Image quality and asset fidelity: existing `/liara-logo.png` reused for the assistant avatar; Lucide used for UI icons.
- Copy and content: client copy clearly identifies the absence of a grounded service and does not manufacture platform claims.
- Motion and interaction: new mount, message, and pending-state transitions are additive; all existing motion CSS remains untouched.
- Responsiveness and accessibility: desktop stream scrolls internally; mobile returns to document flow. Regions, timestamps, copy buttons, source expansion, and status messaging have accessible semantics.

## Protected empty-state verification

- `src/features/home/copilot-home.module.css` SHA-256 remains `4621EC73D2C97ED419E257A97BA34E334F825D6D7AB1D31C2CA6A5BA10D7A713`, matching the pre-implementation hash.
- The landing hero, logo, heading, subtitle, benefit row, suggestion cards, right panel, background layers, and footer remain the same code path while `chatEntries.length === 0`.
- The existing composer uses its original markup and styling in empty mode; only successful submission now invokes the additive workspace transition.
- Lint, typecheck, contract tests, and production build pass.

## Interaction checks

- First prompt submission creates a timestamped user entry and enters chat mode.
- Chat-mode composer reuses the existing input implementation without quick-action marquee duplication.
- Suggested next actions add real conversation entries.
- Response and code blocks expose copy actions.
- Source details are expandable and accept only the existing typed citation model.
- Browser click testing, console inspection, and screenshot comparison remain blocked.

## Comparison history

- Pass 1: isolated implementation complete; static and build validation pass; rendered comparison blocked because no browser instance is connected.

## Follow-up polish

- None proposed until rendered comparison evidence is available; visual tuning without that evidence would be speculative.

final result: blocked

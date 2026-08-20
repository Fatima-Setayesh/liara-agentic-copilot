# Chat Response Experience Design QA

- Source visual truth: inline chat-response reference attached to the current user request
- Source pixels: 2200 × 1320 as provided in the conversation
- Implementation target: `src/features/chat/ai-response-card.tsx`, `src/features/chat/chat-workspace.tsx`, and `src/features/chat/chat-workspace.module.css`
- Protected baseline: existing homepage, ambient motion, sidebars, top bar, right panel, hero, composer, quick actions, and all home styles
- Intended viewport: desktop chat state at the reference aspect ratio, with responsive mobile fallback
- Implementation screenshot path: unavailable
- Implementation pixels / CSS viewport / device scale factor: unavailable because no browser instance is connected
- State: first user message submitted and response workspace visible

## Full-view comparison evidence

Blocked. The source reference is available, but the configured in-app browser is unavailable and browser discovery returned no instances. A same-state implementation screenshot could not be captured.

## Focused region comparison evidence

Blocked. Focused comparisons of the user message, response header, diagnosis/code panel, agent progress, sources, actions, and follow-up composer require a rendered implementation capture.

## Findings

- [P1] Rendered visual verification is unavailable.
  - Location: complete post-submit chat workspace.
  - Evidence: in-app browser selection returned `Browser is not available: iab`; browser discovery returned `[]`.
  - Impact: optical alignment, viewport density, internal scrolling, responsive stacking, hover states, and visual fidelity against the supplied reference cannot be certified.
  - Fix: reconnect the in-app browser, submit a message, capture the desktop and mobile states, and compare them with the source in a shared visual input.

- [P2] Grounded product answers remain backend-blocked.
  - Location: diagnosis, progress, and sources content.
  - Evidence: the repository provides the typed `/api/chat` contract but no authoritative route implementation.
  - Impact: the frontend can present the complete response UI but must show honest pending states instead of inventing Liara guidance, citations, or retrieval activity.
  - Fix: implement the server-side chat stream and pass typed text, citations, agent states, and suggestions into these presentation components.

## Required fidelity surfaces

- Fonts and typography: new response UI inherits the existing application font stack and uses compact 9–14px tool typography, restrained weights, and clear response hierarchy.
- Spacing and layout rhythm: the new response card follows the reference’s compact user row, bordered primary response surface, two-column answer/progress composition, internal panels, and full-width follow-up composer.
- Colors and visual tokens: only the existing dark glass, cyan, mint, muted gray, and warm pending-state semantics are used.
- Image quality and asset fidelity: the existing `/liara-logo.png` brand asset is reused for the AI avatar; all interface symbols use the existing Lucide library.
- Copy and content: the UI identifies unavailable grounding explicitly. It does not manufacture Liara diagnoses, commands, source metadata, or completed retrieval states.

## Protected empty-state verification

- `src/features/home/copilot-home.tsx` remains SHA-256 `60D725ADC938DD2AA3AA5CEC18A8BDA28B8E6A784B81CEABDCC1EF9759B685BA`.
- `src/features/home/copilot-home.module.css` remains SHA-256 `4621EC73D2C97ED419E257A97BA34E334F825D6D7AB1D31C2CA6A5BA10D7A713`.
- No existing homepage, sidebar, header, right-panel, hero, input, quick-action, background, animation, or transition file was changed.
- Initial server-rendered HTML still contains the homepage heading and omits the chat-workspace state before submission.

## Interaction checks

- Source inspection confirms the first successful composer submit still enters chat mode.
- User messages render with real timestamps.
- Response feedback buttons toggle independently.
- Full-response and code-block copy controls are wired.
- Source cards expand and link externally only when typed backend citations exist.
- Suggested next actions submit follow-up prompts through the existing conversation handler.
- The original composer is reused in follow-up mode without changing its implementation or visual tokens.
- Browser click testing, focus inspection, console inspection, and screenshot comparison are blocked.

## Validation

- ESLint passed with zero warnings.
- TypeScript strict-mode typecheck passed.
- Vitest passed: 1 file, 4 tests.
- Next.js production build passed.
- `git diff --check` passed.

## Comparison history

- Pass 1: response composition implemented from the new reference; source-level and build validation passed; rendered comparison blocked because no browser is connected.

## Implementation checklist

- Reconnect the in-app browser.
- Capture the submitted desktop state at the reference aspect ratio.
- Capture the responsive mobile state.
- Compare full view and focused response regions, then address any visible P0/P1/P2 mismatch.

## Follow-up polish

- No speculative visual tuning is proposed without rendered comparison evidence.

final result: blocked

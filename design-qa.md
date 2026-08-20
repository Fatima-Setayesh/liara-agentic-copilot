# AI Response + Streaming States Design QA

- Previous response-design source: `C:\Users\omidi\Pictures\Screenshots\Screenshot 2026-08-20 185125.png`
- Streaming/loading source: user-supplied Task 4 reference image in the conversation (displayed at 2048 × 1827; no filesystem path exposed to the workspace)
- Implementation target: `src/features/chat/` response, loading, activity, and streaming components
- Protected baseline: homepage, ambient motion, header, sidebars, right panels, prompt composer, conversation layout, and completed response design
- Intended viewports: desktop, tablet, and mobile
- Implementation screenshot path: unavailable
- Implementation pixels / CSS viewport / density: unavailable because no configured in-app browser surface is connected
- States: empty homepage, pre-token loading, activity transitions, progressive response streaming, and completed response

## Full-view comparison evidence

Blocked. The source references were inspected, but the in-app browser runtime returned no available browser instances. Same-state rendered captures could not be placed beside the sources for visual comparison.

## Focused region comparison evidence

Blocked. Focused comparisons of the premium loader, activity timeline, streaming cursor, code reveal, responsive stacking, and completed response require browser-rendered screenshots.

## Findings

- [P2] Rendered visual verification is unavailable.
  - Location: loading and post-submit conversation states at all required breakpoints.
  - Evidence: the production build and HTTP preview succeed, but the in-app browser returned no available instance.
  - Impact: animation timing, optical alignment, viewport density, internal scrolling, responsive wrapping, hover states, and exact reference fidelity cannot be certified.
  - Fix: connect an available in-app browser, capture the required states, and compare them with the sources in shared visual inputs.

## Open questions

- The repository still has no grounded chat route. The local presentation demonstrates the response lifecycle with safe placeholder copy; contract-backed stream events can replace this lifecycle without changing the new presentation components.

## Required fidelity surfaces

- Fonts and typography: new states inherit the existing application stack, sizes, weights, and line-height scale; browser comparison is blocked.
- Spacing and layout rhythm: the loader inherits the existing response grid and breakpoints; browser comparison is blocked.
- Colors and visual tokens: only the existing dark glass, cyan, mint, border, and muted-gray language is used; browser comparison is blocked.
- Image quality and asset fidelity: the existing `/liara-logo.png` and installed Lucide icon set are reused; no replacement or generated placeholder assets were introduced.
- Copy and content: activity labels are high-level user-facing states only; hidden reasoning and chain-of-thought are not rendered.

## Protected UI verification

- `src/features/home/copilot-home.module.css` is unchanged.
- Empty-state, header, sidebar, right-panel, background, composer, and conversation markup are unchanged.
- `src/features/home/copilot-home.tsx` changes are limited to replacing the previous append-only message helper with the isolated streaming lifecycle hook.
- The completed response still uses the existing `AiResponseCard`, section, status, code, interaction, and recommended-action design.
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

## Validation

- ESLint passed with zero warnings.
- TypeScript strict-mode typecheck passed.
- Vitest passed: 3 files, 13 tests, including loading-before-first-token and progressive-section coverage.
- Next.js production build passed.
- HTTP preview returned 200 and contained the existing homepage heading.
- `git diff --check` passed.

## Comparison history

- Previous response-design pass: structured response sections, workflow rail, code block, interactions, and recommended actions were implemented while preserving the shell.
- Streaming/loading pass: additive loader, activity timeline, progressive text, cursor, code reveal, responsive rules, and reduced-motion handling were added around the existing completed response.
- Rendered comparison: blocked because no browser surface is connected; no pixel-level visual pass is claimed.

## Implementation checklist

- Connect an available in-app browser.
- Capture loading, mid-stream, and completed states at desktop width.
- Capture loading and completed states at tablet and mobile widths.
- Inspect overflow, primary interactions, focus behavior, reduced motion, and console output.
- Compare full views and focused response regions, then resolve any visible P0/P1/P2 mismatch.

## Follow-up polish

- No speculative optical tuning is proposed without rendered comparison evidence.

final result: blocked

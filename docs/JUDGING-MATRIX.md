# Judging Matrix

> **Internal planning allocation — not official organizer sub-scores.**
>
> The only official scoring weights are:
> - Answer Quality & Correctness — 80
> - UI & UX — 55
> - Agentic Features & Personalization — 50
> - Security / Reliability / Monitoring — 50
> - Liara Deployment — 40
> - Cost Optimization — 25
>
> Any smaller breakdown below is internal planning only.

This matrix turns the 300-point rubric into verifiable product work. A row is
`Complete` only when its evidence exists and can be reproduced. Foundation work
may enable a row without completing the scored behavior.

Status vocabulary: `Foundation`, `Planned`, `In progress`, `Complete`, `Blocked`.

| Category | Points | Planned implementation | Acceptance evidence | Status | Owner |
| --- | ---: | --- | --- | --- | --- |
| Answer Quality — authoritative retrieval | 30 | MDX-aware Liara corpus ingestion, bounded retrieval, ranking, and insufficient-evidence behavior | Evaluation set shows relevant official passages for simple and multi-document questions; no-result case refuses to invent facts | In progress | Backend / Platform |
| Answer Quality — citation integrity | 20 | Source metadata preserved from document through answer; citations reference only retrieved official material | Automated citation-integrity tests plus judge-visible links that resolve to the claimed page/section | Foundation | Backend / Platform (data); Frontend (presentation) |
| Answer Quality — troubleshooting and clarification | 20 | Selective clarification and multi-step diagnostic answers grounded in retrieved material | Scenario tests for ambiguous deployment failure and sufficiently specific Next.js deployment question | Planned | Backend / Platform |
| Answer Quality — quality evaluation | 10 | Versioned representative evaluation cases covering correctness, completeness, groundedness, and honest uncertainty | Repeatable evaluation report and reviewed failure examples | Planned | Backend / Platform |
| **Answer Quality & Correctness subtotal** | **80** |  |  |  |  |
| UI/UX — core chat experience | 20 | Accessible conversation surface using reusable components where they improve delivery | Working message input, streamed response, code rendering, loading, retry, and empty/error states | Planned | Frontend |
| UI/UX — responsive and accessible behavior | 15 | Keyboard-first, responsive mobile/desktop layout with visible focus and semantic controls | Manual accessibility checklist, keyboard demo, and responsive screenshots/tests | Planned | Frontend |
| UI/UX — honest lifecycle feedback | 10 | Render backend-provided activity, outcome, and interruption/retry behavior without fake progress | Demo of retrieving/generating activity and completed/cancelled/failed outcomes tied to real events | Foundation | Shared (Backend contract; Frontend presentation) |
| UI/UX — sources, suggestions, and preferences | 10 | Traceable source UI, actionable follow-ups, and understandable personalization controls | Judge can inspect a citation, use a suggestion, and change a supported preference | Foundation | Frontend (UI); Backend / Platform (data) |
| **UI & User Experience subtotal** | **55** |  |  |  |  |
| Agentic — intent and clarification | 15 | Detect request intent and ask only decision-relevant clarifying questions | Scenario suite demonstrates both clarification and direct-answer paths | Planned | Backend / Platform |
| Agentic — real workflows and activity | 15 | Orchestrate retrieval, contextual decisions, grounded generation, and next actions with event-backed states | Trace/log and UI demo correlate each displayed activity with an executed operation | Foundation | Backend / Platform |
| Agentic — conversation context | 10 | Persist bounded useful context; trim/summarize under a token budget | Continuation tests retain relevant framework/service facts without resending unlimited history | Planned | Backend / Platform |
| Agentic — personalization and suggestions | 10 | Apply explicit language, experience, and answer-depth preferences; generate grounded next steps | Tests prove explicit preferences affect output and absent preferences are never invented | Foundation | Shared |
| **Agentic Features & Personalization subtotal** | **50** |  |  |  |  |
| Security/Reliability — validation and secret boundary | 15 | Server-only credentials, strict request schemas, size limits, safe structured errors, and hardened headers | Boundary tests, environment review, and browser inspection show no provider secret or stack trace | Foundation | Backend / Platform |
| Security/Reliability — abuse and budget controls | 10 | Rate limit, request/token ceilings, and duplicate-request controls | Deterministic rate-limit and budget tests with safe `RATE_LIMITED` response | Planned | Backend / Platform |
| Security/Reliability — failure handling | 10 | Timeouts and mapped failures for retrieval, model, stream, and persistence dependencies | Fault-injection tests cover provider/retrieval/stream failures and actionable user errors | Foundation | Backend / Platform |
| Security/Reliability — observability | 10 | Structured redacted logs for request ID, phase latency, provider/model, usage, retrieval count, and normalized errors | Captured diagnostic log examples contain required fields and no prompt/secrets by default | Planned | Backend / Platform |
| Security/Reliability — automated validation | 5 | CI runs frozen install, lint, typecheck, tests, and production build | Passing least-privilege GitHub Actions run | Foundation | Backend / Platform |
| **Security, Reliability & Monitoring subtotal** | **50** |  |  |  |  |
| Liara Deployment — reproducible application deploy | 15 | Verified Liara-compatible build/start settings for the pnpm-only repository and Node 24 | Clean deployment from a reviewed commit with recorded build/start behavior | Planned | Backend / Platform |
| Liara Deployment — production configuration and streaming | 10 | Server-only environment configuration, production origin handling, and verified SSE/cancellation behavior | Live production tests show streamed text/data/error/completion and no localhost dependency | Planned | Backend / Platform |
| Liara Deployment — health and diagnostics | 5 | Lightweight health behavior and useful platform logs | Health check and failure logs demonstrated on Liara | Planned | Backend / Platform |
| Liara Deployment — demo readiness | 10 | Stable public demo, smoke test, and rollback-aware runbook | Judge-accessible URL passes the documented smoke test near judging time | Planned | Shared |
| **Liara Deployment subtotal** | **40** |  |  |  |  |
| Cost — routing and hard budgets | 10 | Provider abstraction, justified model routing, output/context/request ceilings | Usage tests show simple requests avoid unjustified expensive calls and budgets stop overruns | Planned | Backend / Platform |
| Cost — context/retrieval/cache efficiency | 10 | Bounded history and retrieval, safe cache, and duplicate prevention | Metrics compare tokens/calls before and after controls without degrading answer evaluation | Planned | Backend / Platform |
| Cost — usage visibility | 5 | Record token usage and estimated cost when provider metadata permits | Per-request and aggregate demo metrics are inspectable without exposing sensitive content | Planned | Backend / Platform |
| **Cost Optimization subtotal** | **25** |  |  |  |  |
| **TOTAL** | **300** |  |  |  |  |

## Foundation evidence available now

- Protected versioned contracts and runtime validation live in
  `src/contracts/chat/v1`.
- The streaming protocol and ownership boundaries are recorded in the
  architecture documentation and ADRs.
- The repository provides strict TypeScript, lint, unit-test, build, and CI
  commands.
- The server retrieval baseline has source-policy, normalization, chunking,
  ranking, no-result, duplicate, cancellation, and full-corpus integration tests.
- No row claiming end-to-end grounded answers, model orchestration, persistence,
  rate limiting, production streaming, or deployment is marked complete.

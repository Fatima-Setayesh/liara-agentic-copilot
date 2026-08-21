# Liara Agentic Developer Copilot — Product Specification

Status: **Foundation specification; product features are not yet implemented**
Last updated: 2026-08-20

## 1. Product definition

Liara Agentic Developer Copilot is a grounded developer-support product for understanding, configuring, deploying, troubleshooting, and using Liara services. It combines authoritative Liara retrieval, an agentic support flow, useful conversation context, structured citations, and a polished chat experience.

The product succeeds when a developer can ask a simple setup question or bring an ambiguous deployment problem and receive a correct, traceable, appropriately scoped next step. It must respond honestly when authoritative evidence is unavailable.

It must not become:

- a generic model wrapper with Liara branding
- an ungrounded question-answer bot
- a textarea plus arbitrary response string
- a UI that invents citations or progress
- an autonomous operator that makes external changes without clear authorization

## 2. Challenge goal and scoring

The implementation targets the full 300-point hackathon rubric:

| Category | Points |
| --- | ---: |
| Answer Quality & Correctness | 80 |
| UI & User Experience | 55 |
| Agentic Features & Personalization | 50 |
| Security, Reliability & Monitoring | 50 |
| Liara Deployment | 40 |
| Cost Optimization | 25 |
| **Total** | **300** |

This order drives implementation priority. Every significant decision must improve a scored outcome or materially improve maintainability, security, reliability, parallel delivery, or Liara deployability. Every feature must have observable acceptance evidence; documentation or visual labels alone do not count as implementation.

## 3. Authoritative knowledge

Primary sources are:

1. published Liara documentation: <https://docs.liara.ir/>
2. official documentation repository: <https://github.com/liara-cloud/docs>

For Liara-specific facts, retrieved official evidence outranks model memory. The backend owns source validation and citation construction. If no adequate official evidence is retrieved, the answer must acknowledge the limitation instead of guessing.

## 4. Functional requirements

The product must eventually support:

- grounded questions about Liara services, frameworks, configuration, and deployment
- troubleshooting that distinguishes build, deployment, runtime, networking, and service-specific failures
- selective clarification when necessary to choose a safe path
- multi-document answers when one source is insufficient
- conversation continuation using bounded, relevant context
- structured official sources and citations
- structured next-step suggestions
- optional personalization without invented profile data
- streaming answer delivery with real activity states, cancellation, and safe errors
- graceful no-result and provider/retrieval failure behavior

Implementation status: the application scaffold, governance, versioned chat contract, validation infrastructure, and server-only authoritative retrieval baseline exist. Chat orchestration, model integration, and user-facing grounded answers are not implemented.

## 5. Answer quality requirements

Answers must be:

- grounded in retrieved official Liara material for Liara claims
- direct enough for simple questions and sufficiently detailed for complex ones
- explicit about assumptions and missing information
- capable of synthesizing multiple documents without losing source traceability
- organized into actionable troubleshooting steps when appropriate
- consistent with the user’s framework, runtime, service, language, experience, and requested depth when those are known
- free of fabricated commands, pricing, behavior, citations, or source snippets

The quality evaluation set must include simple lookup, framework deployment, ambiguous failure, multi-source troubleshooting, no-result, and context-continuation cases.

## 6. Retrieval and RAG requirements

The retrieval pipeline must preserve a clean separation:

```text
question -> query understanding -> retrieval -> ranking -> bounded context
         -> model generation -> grounded answer -> citations
```

Required source metadata includes:

- stable document and chunk identity
- document title
- official published URL
- source repository path
- section heading
- service or framework category where available
- relationship between chunk and source document

Retrieval must limit context to relevant results and must not send the full corpus for each request. Chunking, lexical/vector retrieval, reranking, storage, and refresh strategy require measured evaluation before a database or vector dependency is selected. Liara compatibility, implementation time, citation fidelity, operating cost, and retrieval quality are decision criteria.

Retrieved text is untrusted input. The pipeline must prevent documentation content from overriding system policy or requesting secrets/tools.

## 7. Citation requirements

- Each rendered source originates from backend contract data.
- A citation maps deterministically to one allowlisted official source.
- Source titles, URLs, sections, paths, and snippets are never generated by the frontend.
- Citations remain usable after streaming completes.
- Complex answers may cite multiple sources.
- Tests must detect missing, unreferenced, duplicate, malformed, and non-official citations.
- Retrieval scores and sensitive internal metadata stay server-side unless a deliberate contract addition is approved.

The initial official URL allowlist is `https://docs.liara.ir/**` and `https://github.com/liara-cloud/docs/**`. Expanding it requires a reviewed source-policy change.

## 8. Agentic requirements

Agentic behavior must represent real operations:

- understand intent and detect missing decision-critical information
- request clarification selectively
- retrieve and rank authoritative context
- execute bounded multi-step troubleshooting logic
- retain relevant conversation facts
- generate useful follow-up actions
- surface only real activity states

Stable v1 activity states are `understanding`, `clarification_required`, `retrieving`, and `generating`. Terminal outcomes are `completed`, `cancelled`, and `failed`. A completed outcome carries `evidenceStatus` as `sufficient`, `partial`, or `none`; `none` is an honest completed response, not a retrieval failure. User cancellation is an outcome rather than an application error. Hidden chain-of-thought must never be transmitted or displayed. Additional activity states such as `executing` require an implemented operation and a protected contract change.

## 9. Context and personalization

Useful optional context includes framework, runtime, Liara service, project description, experience level, answer depth, and preferred language. The system must never infer a durable profile without evidence or user control.

Conversation architecture must support bounded history, relevance filtering, summarization, and token budgets. It must not resend unlimited history indefinitely. Users must eventually be able to understand or reset retained preferences.

## 10. Frontend, UI, and UX requirements

UI and User Experience is a mandatory **55-point** judging category. The requirements below define product behavior and acceptance considerations, not a visual theme. They are classified as follows:

- **Mandatory product requirements:** the visible capabilities, quality boundaries, and validation expectations in this section
- **Implementation guidance:** the approved stack and optional accelerators, which are not judging requirements themselves
- **Frontend-owned design decisions:** visual identity and component appearance intentionally left open

Unless supported by implementation and acceptance evidence, each capability below remains a requirement or plan rather than an implemented or verified feature. The current page is only a scaffold.

### 10.1 Frontend responsibility and shared boundary

Fatima owns the complete visible product experience: frontend implementation and API integration; UI and UX; desktop, mobile, and responsive behavior; chat and conversation flows; AI and technical-answer presentation; citations, code blocks, links, and technical information; loading, streaming, empty, error, retry, and cancellation states; continuation, suggestions, agent activity, personalization, and presentational settings; accessibility, keyboard and focus behavior; useful micro-interactions, animation, visual polish, and frontend testing.

The frontend consumes protected shared contracts rather than duplicating backend business logic. The backend/platform owner remains responsible for retrieval, AI orchestration, persistence, source correctness, security architecture, monitoring, and deployment architecture. The frontend must never invent a conversation fact, personalization value, source, citation, agent activity, error category, or completion outcome. Contract changes require coordinated frontend/backend work and integration validation.

### 10.2 Judged conversation and interaction experience

The product must not be a `textarea + send button + plain response` chatbot. It must provide a polished technical-assistant experience that accounts for:

- a clear user/assistant distinction, information hierarchy, and consistent spacing and presentation
- natural follow-up conversation, previous-message context presentation, message ordering, and contextual continuation
- backend-provided conversation IDs and state; a new-conversation flow; and, if persistence is implemented, history, reopening, and deletion confirmation
- streamed responses, generation/loading indication, stop/cancel, retry, and regeneration where the approved operation supports it
- copy-answer and copy-code actions with useful confirmation feedback
- structured clarification, follow-up suggestions, and honest agent activity or progress
- useful empty, loading, safe error, disabled, and retry states
- stable streaming and scrolling, preservation of reading position, and a scroll-to-bottom interaction where useful

Frontend conversation state must remain consistent with the backend rather than independently reconstructing server decisions.

### 10.3 Technical-content rendering

Developer answers must present Markdown, headings, paragraphs, ordered and unordered lists, inline code, fenced code blocks, shell commands, tables, links, warnings, notes, step-by-step instructions, citations, and source references correctly. Code and commands must be readable, visually distinguishable from prose, easy to copy, and usable on desktop and mobile. Long URLs, code blocks, and technical tables must wrap or overflow safely without breaking the page. The specification does not choose syntax-highlighting colors or a code theme.

Technical and Markdown content must be rendered safely. Links and commands must remain understandable, and the frontend must not add authority or evidence cues that were not supplied by backend contract data.

### 10.4 Sources and citations

The backend is authoritative for citation correctness and supplies all source data through the shared contract. The frontend must present that data professionally and traceably without fabricating or completing missing fields.

Valid implementation options include citation markers or badges, source cards, a source list, drawer or sheet, and source previews showing the title, relevant section, official URL, and optional snippet or metadata when provided. These are flexible UI patterns, not a required component design. Citations and links must remain usable after streaming completes and on mobile.

### 10.5 Agentic flows, suggestions, and personalization

The UI must represent only backend-provided product activity. Contract v1 distinguishes transient activities (`understanding`, `clarification_required`, `retrieving`, `generating`) from terminal outcomes (`completed`, `cancelled`, `failed`). A completed outcome carries `evidenceStatus` (`sufficient`, `partial`, or `none`); `none` must appear as an honest completed no-evidence response rather than a retrieval or application failure. The UI must never expose hidden chain-of-thought or show fake thinking, reasoning, searching, or progress that does not correspond to a real operation.

The experience must support clarification questions, selectable clarification options where useful, bounded multi-step workflows, continuation after clarification, cancellation, and structured next actions. Contract suggestions contain an ID, label, and `prompt` value; the frontend must render them as usable interactions without the specification mandating chips, buttons, cards, or another exact form.

Personalization controls may expose only fields supported by the shared contract, currently including framework, runtime, Liara service, project description, experience level, answer depth, and preferred language. Frontend-only presentational preferences may be offered without pretending they change backend personalization. A response-style preference or any other server-consumed field requires an approved contract evolution; the frontend must not invent backend profile state.

### 10.6 Streaming and error UX

The frontend must follow the approved shared streaming contract in Section 16 and must not invent another protocol. It must handle streamed text, source and suggestion delivery, real activity, completion, failure, cancellation, connection interruption, stable scrolling, and generation-stop behavior.

Safe UX must map typed backend categories for invalid input, rate limiting, timeout, retrieval failure, provider/model unavailability, stream interruption, and internal failure. It must use contract fields such as retryability and show an actionable explanation, retry or disabled state where appropriate. Retry timing is displayed only if a future approved contract supplies it. Deliberate user cancellation is not presented as an application error, and raw stack traces or arbitrary provider messages must never be displayed.

### 10.7 Responsive design, accessibility, and polish

Responsive behavior must be intentional for desktop, mobile, and relevant intermediate/tablet widths; mobile cannot be treated as a final CSS patch. Critical considerations include navigation or sidebar behavior, chat width, prompt input, citations, code blocks, technical tables, dialogs/drawers, touch targets, long links, and scrolling. The input, citations, and overlays must remain mobile-safe, and technical content must not cause destructive horizontal page overflow. Exact breakpoints remain an implementation decision.

Accessibility requirements include semantic HTML, keyboard usability, visible focus, accessible labels, reasonable focus management, screen-reader-conscious controls and status announcements where appropriate, understandable error/status presentation, sufficient interaction affordances, and usable touch targets. Useful animations and micro-interactions may improve feedback, but must not obscure state, block interaction, or simulate nonexistent work. Persian/RTL behavior must be correct if included in the selected language experience.

### 10.8 Frontend security, production safety, and validation

The frontend must never contain provider credentials, expose server-only environment variables, hardcode secrets, log credentials, or display raw backend diagnostics. It may use only browser-safe public variables, must treat backend-provided data as untrusted where appropriate, and must render Markdown, links, and technical content safely. Security architecture remains backend/platform-owned; the frontend owns browser-safe behavior and UX.

Production acceptance requires a successful frontend build, no hardcoded localhost URLs, correct same-origin or configured API handling, production-safe asset paths, a correct public/server-only environment boundary, working production streaming, and verified critical desktop and mobile flows on Liara. Both team members verify the deployed experience after deployment is explicitly authorized.

Pragmatic frontend validation prioritizes chat input/send, streamed rendering, source rendering, suggestions, clarification, error and retry states, responsive critical flows, accessibility-critical interactions, and shared-contract integration. Testing should target demo and regression risk rather than maximize test volume.

### 10.9 Technology guidance

The approved foundation is Next.js, React, TypeScript, and Tailwind CSS. When it improves delivery speed and consistency, shadcn/ui is preferred for reusable general primitives; AI Elements may accelerate AI/chat-specific UI when it improves speed or quality. Both remain optional implementation aids rather than architecture or judging requirements and must not be forced where a simpler project-owned implementation is better.

Do not introduce a competing runtime UI library such as Material UI, Ant Design, Carbon, Fluent UI, or Bootstrap components without a specific approved reason. Those systems may be consulted as design or UX references only.

### 10.10 Visual design intentionally left open

`SPEC.md` deliberately does not predetermine:

- color palette, brand colors, or light/dark visual identity
- exact typography or font choices
- gradients, shadows, border-radius style, or exact spacing scale
- exact component appearance or illustration/icon aesthetic
- animation style or final page composition
- sidebar treatment, chat-bubble design, or citation-card design
- final dashboard or layout aesthetic

These decisions belong to the frontend owner, subject to usability, accessibility, responsiveness, consistency, professional quality, and the judging requirements above. The specification defines what the experience must achieve, not exactly how it must look. Planned requirements must not be presented as implemented or verified, and fake UI must not be created merely to satisfy a checklist.

## 11. Security requirements

- Provider credentials and service secrets are server-only.
- All trust boundaries use runtime schemas and input limits.
- AI endpoints require rate limiting, abuse controls, request/token budgets, and timeouts before production.
- User errors are structured, safe, and free of stack traces or provider internals.
- Logs redact secrets and avoid unnecessary prompt or personal-data capture.
- CI uses least privilege.
- Dependencies and generated code are reviewed before use.
- Authentication and authorization are added only if a validated product flow requires identity.

## 12. Reliability requirements

The system must handle invalid input, no retrieval results, retrieval failure, model timeout/unavailability, malformed provider output, database failure, network loss, client cancellation, stream interruption, and rate limiting. User messages must be actionable; internal diagnostics must retain request correlation and normalized error categories.

Duplicate requests should be detectable through client request identifiers when the backend is implemented. Cancellation must propagate to retrieval and model calls.

## 13. Monitoring and logging requirements

The lightweight observability layer should capture, when available:

- request ID and timestamp
- total, retrieval, and model latency
- selected provider and model
- token usage and budget outcome
- retrieval result count
- completion/cancellation status
- normalized error code

Secrets, credentials, raw stack traces in user responses, and unnecessary sensitive content are forbidden. External observability SaaS is not required unless its scoring value exceeds setup and maintenance cost.

## 14. Cost requirements

The architecture must enable:

- model routing based on task difficulty where quality is preserved
- input/output token ceilings
- bounded retrieval results and context trimming
- conversation summarization when justified
- safe caching of stable work
- duplicate-request prevention
- usage and estimated-cost tracking
- avoidance of unnecessary model calls

Cost savings must not compromise answer correctness or citation integrity.

## 15. Liara deployment requirements

The application will be designed as one Liara-compatible Next.js deployment unless verified platform constraints require a split. Before deployment configuration is accepted, current official Liara documentation must confirm runtime availability, build/start commands, port behavior, environment variables, streaming/proxy behavior, logs, health checks, and any database connectivity requirements.

Production code must not hardcode localhost URLs. Secrets are configured through the platform, and streaming must be validated in the deployed environment. Deployment requires explicit user authorization.

## 16. Stable chat boundary

The v1 foundation is exported from `src/contracts/chat/v1` and includes:

- versioned chat request and optional user context
- typed AI SDK UI message metadata and data parts
- authoritative Liara source/citation shape
- structured suggestions
- stable agent states
- typed terminal outcomes and evidence sufficiency
- stable safe error codes
- input and official-source runtime validation

The planned transport is AI SDK 7’s UI Message Stream Protocol over server-sent events. Text uses native stream parts; citations, suggestions, activity, terminal outcome, and in-stream domain errors use typed data parts. `TIMEOUT` is distinct from provider unavailability or stream interruption so retry UX can respond appropriately. The route itself is not implemented in the foundation phase.

## 17. Explicit anti-patterns

Do not:

- answer Liara-specific questions from memory when retrieval should decide
- fabricate citations or let the frontend construct them
- send the entire documentation repository to a model
- expose provider keys in browser code
- place orchestration and retrieval inside a React component or giant route
- reveal chain-of-thought
- emit fake progress states
- add a database, vector store, queue, auth vendor, or monitoring service for appearance
- use an expensive model for every request without measured justification
- add a second UI framework
- treat an optional tool, skill catalog, or infrastructure component as a product requirement
- spend foundation time on optional tooling without a concrete scored outcome
- claim planned behavior is implemented
- create or delete branches, push, merge, rebase or rewrite history, or deploy without explicit permission

## 18. Definition of done

The product is demo-ready only when:

- representative answers are grounded, correct, and cite official sources
- no-result and ambiguous queries behave honestly and usefully
- the full chat and source experience is accessible and responsive
- agentic states correspond to real operations
- bounded context and personalization work across turns
- validation, rate limits, timeouts, safe errors, and secret boundaries are implemented
- useful latency, retrieval, usage, and error telemetry is observable
- cost controls are measurable
- lint, typecheck, tests, and production build pass in CI
- the application is successfully validated on Liara with production streaming and logs
- judging evidence is recorded in `docs/JUDGING-MATRIX.md`
- no known critical security, citation-integrity, or deployment issue remains

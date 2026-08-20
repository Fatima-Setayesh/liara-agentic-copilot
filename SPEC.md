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

Foundation status: only the application scaffold, governance, versioned chat contract, and validation infrastructure exist.

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

Stable v1 states are `understanding`, `clarification_required`, `retrieving`, `generating`, `completed`, and `failed`. Hidden chain-of-thought must never be transmitted or displayed. Additional states such as `executing` require an implemented operation and a protected contract change.

## 9. Context and personalization

Useful optional context includes framework, runtime, Liara service, project description, experience level, answer depth, and preferred language. The system must never infer a durable profile without evidence or user control.

Conversation architecture must support bounded history, relevance filtering, summarization, and token budgets. It must not resend unlimited history indefinitely. Users must eventually be able to understand or reset retained preferences.

## 10. UI and UX requirements

The frontend owner defines the visual implementation on the Next.js, React, and Tailwind CSS foundation. shadcn/ui and AI Elements are optional accelerators, not acceptance criteria or architectural dependencies. The final experience must include:

- responsive, accessible desktop and mobile chat
- clear source and citation presentation
- readable code and commands
- real streaming, loading, cancellation, retry, empty, and error states
- conversation navigation and continuation
- suggested next actions
- visible but honest agent activity
- personalization controls
- keyboard and focus behavior
- appropriate Persian/RTL support if included in the chosen language experience

The frontend consumes typed message parts; it must not parse arbitrary backend strings for sources, suggestions, status, or errors. The current page is intentionally only a scaffold.

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
- stable safe error codes
- input and official-source runtime validation

The planned transport is AI SDK 7’s UI Message Stream Protocol over server-sent events. Text uses native stream parts; citations, suggestions, states, and in-stream domain errors use typed data parts. The route itself is not implemented in the foundation phase.

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

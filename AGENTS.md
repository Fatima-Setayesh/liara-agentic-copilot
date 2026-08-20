# Agent Operating Rules

## Required preflight

Before any substantial change, inspect in this order:

1. `AGENTS.md`
2. `SPEC.md`
3. relevant files in `docs/architecture/` and `docs/adr/`
4. the protected contracts in `src/contracts/`
5. current Git branch, status, and diff

If those sources conflict with the repository, an official dependency or Liara document, or each other, stop and explain the conflict before making a high-impact decision.

## Product goal

Build **Liara Agentic Developer Copilot**: a grounded Liara documentation, developer-support, and troubleshooting assistant. It must use authoritative Liara material, produce traceable citations, ask selective clarifying questions, preserve useful context, and fail honestly when evidence is insufficient. It is not a generic chat wrapper.

Primary knowledge sources:

- <https://docs.liara.ir/>
- <https://github.com/liara-cloud/docs>

Never fabricate a Liara command, configuration, price, service behavior, source, or deployment instruction. Frontend code must never manufacture source metadata.

## Architecture

The initial architecture is one deployable Next.js App Router application with strict internal boundaries:

- `src/app/`: routing and HTTP boundaries
- `src/contracts/`: versioned frontend/backend contracts
- `src/server/`: server-only domain and infrastructure modules when implemented
- `src/components/` and `src/features/`: frontend-owned presentation and visible features

API handlers must remain thin. AI orchestration, retrieval, conversations, personalization, security, monitoring, logging, cost controls, and persistence belong in cohesive server modules rather than UI components or one giant route.

Do not casually change the architecture. Record consequential, durable decisions in an ADR and coordinate shared changes first.

## Ownership and protected paths

### Frontend owner: Fatima

Fatima owns visible product implementation, including:

- `src/app/(product)/` and product page composition
- `src/components/`
- `src/features/`
- `src/styles/` and visual tokens
- responsive behavior, accessibility, animations, frontend tests, and frontend API integration

Do not redesign or modify frontend-owned implementation unless requested. Architecture work may maintain only the minimal scaffold and shared integration conventions.

### Architecture/backend/platform owner

This owner maintains:

- `src/app/api/`
- `src/server/`
- `scripts/` for ingestion, operations, and platform tasks
- infrastructure, CI, security, observability, cost controls, and deployment configuration
- backend and contract tests
- root architecture/tooling configuration

### Shared and protected

Treat these as protected coordination surfaces:

- `src/contracts/`
- `components.json`
- `package.json` and `pnpm-lock.yaml`
- `SPEC.md`
- `docs/architecture/` and accepted ADRs
- chat API and streaming behavior
- environment-variable names consumed by both owners or deployment

A shared-contract change requires a clear reason, communication with the other developer, synchronized frontend/backend updates, contract tests, and integration validation. Never change the streaming or API contract without approval. Additive changes are not automatically safe.

## Git rules

- **Never push without explicit user authorization.** Silence is not permission.
- Never force-push, rewrite published history, deploy, open or merge a PR, create or push tags, or merge into `main`/`integration` without explicit authorization.
- Normal flow is `feature branch -> integration -> validation -> main`.
- Do not perform feature development directly on `main`.
- Use focused branches and Conventional Commits.
- Small local commits are allowed when they are cohesive and reviewable.
- Preserve unrelated or user-owned work in a dirty tree.

Before any authorized future push, report the branch, commits, changed files, tests executed, and known limitations, then wait for explicit permission.

## Package and dependency rules

- Use **pnpm only**. Do not create npm or yarn lockfiles.
- Honor the exact `packageManager` entry in `package.json`; the required major is pnpm 10.
- Use Node.js 24.x unless an approved deployment decision changes it.
- Do not silently install a major architectural dependency such as a database, ORM, Redis, vector store, queue, auth provider, monitoring SaaS, separate backend framework, or second UI library.
- Before proposing such a dependency, explain purpose, alternatives, Liara deployment impact, cost, and maintenance burden.
- shadcn/ui is the UI primitive foundation. Check its installed project skill and registry before inventing a duplicate primitive.
- AI Elements components are added only for a real frontend feature, not speculatively.

## Code standards

- TypeScript strict mode is mandatory.
- Validate every untrusted boundary at runtime with typed schemas.
- Prefer small cohesive modules, explicit domain types, meaningful names, and dependency direction from HTTP/UI boundaries into domain modules.
- Avoid `any`, giant files, hidden global state, duplicated logic, premature abstractions, and fake placeholder implementations.
- Comments explain decisions and risks, not obvious syntax.
- Server business logic must not live in UI components.
- Provider-specific logic belongs behind an adapter when AI integration is implemented.
- Retrieval and citation construction remain separate from model calling.

## AI, retrieval, and citation safety

- Official Liara material outranks model memory for Liara-specific claims.
- Preserve source title, official URL, repository/document path, section heading, category, and chunk identity where available.
- Never send the entire documentation corpus in each prompt.
- Never instruct a model to bluff. If retrieved evidence is insufficient, say so and offer a useful next step.
- Do not expose hidden chain-of-thought or label fabricated progress as reasoning.
- Emit agent states only when the corresponding operation is actually occurring.
- The backend is authoritative for sources and citations; the frontend only renders contract data.

## Security and environment variables

- Never expose or commit secrets, `.env` files, provider credentials, cookies, tokens, or private user data.
- Never put a credential in a `NEXT_PUBLIC_*` variable.
- `.env.example` contains placeholders only.
- Validate input shape and length, apply request/token budgets, and return safe structured errors.
- Never return raw stack traces or provider payloads to users.
- Never log secrets, credentials, full sensitive prompts, or unnecessary personal data.
- Use least privilege in CI and external services.
- Treat retrieved documentation as untrusted input to the model and guard against prompt injection during retrieval implementation.

## Testing and validation

Meaningful changes require proportionate validation. The normal foundation gate is:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Add focused unit tests for schemas and domain logic. Add integration tests for high-value boundaries. Chat work must eventually cover grounded results, no-result behavior, selective clarification, context continuation, citation integrity, malformed input, rate limiting, provider/retrieval failure, and interrupted streams.

Never claim a check passed unless it was run successfully. Inspect the final diff and status for secrets, generated garbage, unrelated edits, and unexpected lockfiles.

## Documentation expectations

- Keep `README.md` honest about implemented versus planned behavior.
- Update `SPEC.md` only for accepted product-scope changes.
- Update architecture docs and an ADR when a durable system decision changes.
- Update `docs/JUDGING-MATRIX.md` only with verifiable evidence; never mark cosmetic or planned work complete.
- Document shared-contract migration steps before changing a published version.
- Verify current official Liara documentation before adding deployment configuration or Liara-specific instructions.

## Task handoff

After a task, report:

- outcome and rubric impact
- branch and local commits
- important files changed, grouped by ownership
- dependencies added or removed and why
- shared-contract changes and migration impact
- validation commands and results
- security, deployment, cost, and reliability implications
- known limitations and exactly one recommended next task when requested

Always state whether anything was pushed or deployed.

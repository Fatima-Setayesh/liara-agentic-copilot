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

## Decision priorities

The 300-point judging rubric is the product priority order:

1. Answer Quality & Correctness — 80
2. UI & User Experience — 55
3. Agentic Features & Personalization — 50
4. Security, Reliability & Monitoring — 50
5. Liara Deployment — 40
6. Cost Optimization — 25

Every significant technical decision must improve scoring evidence, maintainability, security, reliability, parallel team delivery, or Liara deployability. Prefer the simplest professional implementation that meets the requirement. Documentation, infrastructure, dependency, or tooling work without a concrete product outcome is not progress.

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

- The coding agent performs authorized Git operations for the user. Do not ask the user to create branches, commit, push, merge, or run other Git commands manually.
- On an already-approved branch, the agent may inspect Git state, edit files, install already-approved dependencies, run validation, and create focused local commits without additional permission.
- **Explicit user approval is required before every branch creation, push, merge, branch deletion, rebase or other history rewrite, and deployment.** Silence, task completion, or an earlier approval for a different operation is not permission.
- Opening a PR and creating or pushing tags also require explicit user authorization because they change remote state.
- Never force-push. This prohibition is absolute, including after approval for another history operation.
- Normal flow is `feature branch -> integration -> validation -> main`.
- Do not perform feature development directly on `main`.
- Use focused branches and Conventional Commits.
- Small local commits are allowed when they are cohesive and reviewable.
- Preserve unrelated or user-owned work in a dirty tree.

Before creating a branch, report:

- proposed branch name
- base branch
- why the branch is needed
- intended scope of work

Then wait for explicit approval. After approval, the agent creates the branch.

Before every push, report:

- current branch
- remote destination
- commits that will be pushed
- important files changed
- validation results
- whether the working tree is clean
- known risks or limitations

Then wait for explicit approval. After approval, the agent performs the push. A push approval applies only to the described branch, destination, and commits; new commits or a changed destination require a new approval.

Before a merge, branch deletion, rebase/history rewrite, or deployment, identify the exact target and impact, then wait for explicit approval. Never treat a previously approved foundation task or development task as standing permission to push or deploy.

## Package and dependency rules

- Use **pnpm only**. Do not create npm or yarn lockfiles.
- Honor the exact `packageManager` entry in `package.json`; the required major is pnpm 10.
- Use Node.js 24.x unless an approved deployment decision changes it.
- Do not silently install a major architectural dependency such as a database, ORM, Redis, vector store, queue, auth provider, monitoring SaaS, separate backend framework, or second UI library.
- Before proposing such a dependency, explain purpose, alternatives, Liara deployment impact, cost, and maintenance burden.
- shadcn/ui, AI Elements, and their coding skills are optional frontend accelerators, not architecture or judging requirements.
- Use optional UI tooling only for a concrete frontend-owned feature where it saves time or improves quality. Do not browse catalogs, add components, or install related dependencies speculatively.
- When Fatima chooses an existing project primitive, reuse it instead of creating a duplicate. Backend and shared-contract design must remain independent of optional UI tooling.

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

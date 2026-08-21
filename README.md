# Liara Agentic Developer Copilot

A production-minded, grounded developer and troubleshooting copilot for Liara. The intended product answers Liara questions from authoritative documentation, provides traceable citations, asks selective clarifying questions, and guides developers through multi-step support workflows.

## Current status

**Integrated grounded chat vertical slice.** The repository currently includes:

- a responsive product chat UI connected to the real API by default, with an optional preview mode
- strict TypeScript and Tailwind CSS with a minimal optional shadcn-compatible scaffold
- an AvalAI OpenAI-compatible provider adapter built on Vercel AI SDK 7
- versioned runtime-validated chat contracts and contract tests
- server-only ingestion, structural MDX normalization, section-aware chunking,
  source policy, and an in-memory lexical retriever for the official Liara corpus
- bounded evidence-context construction, backend-owned citations, honest no-evidence handling, and a streamed `POST /api/chat` route
- architecture, governance, rubric tracking, and lightweight CI

The route has automated provider/retrieval boundary coverage and has been validated locally against a configured AvalAI model and a clean, revision-pinned official Liara documentation checkout. Selective clarification, durable conversation persistence, rate limiting, full monitoring, and production deployment remain **planned**.

## Architecture summary

The initial direction is one deployable Next.js full-stack application with protected internal boundaries:

```text
product UI -> versioned chat/API boundary -> server orchestration
                                            |- context and personalization
                                            |- authoritative retrieval
                                            |- model provider adapter
                                            `- citations and next actions
```

- `src/app/`: App Router pages and thin API boundaries
- `src/contracts/`: shared, versioned, protected request/stream/error contracts
- `src/server/`: server-only retrieval, AI provider, grounded orchestration, and chat transport
- `src/components/` and `src/features/`: frontend-owned product UI and chat API integration

See [the architecture document](docs/architecture/ARCHITECTURE.md) and [product specification](SPEC.md).

## Technology stack

- Node.js 24.x
- pnpm 10.34.5 (pinned through `packageManager`)
- Next.js 16 App Router
- React 19 and TypeScript 5 in strict mode
- Tailwind CSS 4
- Vercel AI SDK 7 for typed streaming and shared message contracts
- the AI SDK OpenAI-compatible provider for AvalAI
- Zod 4 for trust-boundary schemas
- unified/remark for non-executing structural MDX parsing
- Vitest 4 for focused unit tests

The checked-in Radix-based shadcn configuration and base stylesheet are replaceable frontend scaffold details, not scoring requirements or architecture drivers. Repo-scoped UI skills are development-only aids and do not ship in the application bundle. No shadcn or AI Elements component is checked in; Fatima can add only the components justified by real UI work.

## Local setup

Prerequisites:

- Node.js 24.x
- Corepack or pnpm 10.x
- Git

Install and run:

```powershell
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm dev
```

Open <http://localhost:3000>.

On Windows systems where PowerShell blocks the `pnpm.ps1` shim, use `pnpm.cmd` or the `corepack pnpm` form shown above. Do not use npm or yarn and do not create their lockfiles.

## Environment

`.env.example` separates browser-safe values from server-only configuration. Its values are placeholders. Local chat execution requires an AvalAI API key/model plus an absolute, clean, revision-pinned checkout of `liara-cloud/docs`.

The backend reads `AVALAI_API_KEY`, `AVALAI_BASE_URL`, `AVALAI_MODEL`, bounded AI settings, `LIARA_DOCS_REPOSITORY_PATH`, and `LIARA_DOCS_REVISION`. `AVALAI_API_KEY` is not a Liara management API key.

Rules:

- never commit `.env` or `.env.local`
- never place credentials in `NEXT_PUBLIC_*`
- configure provider credentials only on the server
- do not log secrets or return them in API errors

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm lint` | Run ESLint with zero warnings allowed |
| `pnpm typecheck` | Run strict TypeScript checking without emitting files |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm build` | Create a production Next.js build |
| `pnpm start` | Start a previously built production server |

## Shared chat contract

The protected v1 contract lives in [`src/contracts/chat/v1`](src/contracts/chat/v1). It defines:

- `ChatRequest` with optional conversation and user context
- typed `ChatUIMessage` metadata and AI SDK data parts
- official Liara source/citation metadata
- structured suggestions
- real agent activity states
- terminal outcomes with evidence sufficiency and non-error cancellation
- safe stable error codes
- runtime input and official-source validation

`POST /api/chat` implements AI SDK 7’s UI Message Stream Protocol over SSE. It emits real activity states, backend-created citations, streamed text, typed failures, and terminal evidence outcomes. Contract changes require coordination between both owners and integration validation.

## Branch workflow

```text
focused feature branch -> integration -> validation -> main
```

- `main`: stable, reviewed, demo-ready
- `integration`: frontend/backend integration and pre-production validation
- feature branches: scoped implementation work using Conventional Commits

The coding agent performs Git operations after authorization; the user should not need to run Git commands manually. Routine work and focused local commits are allowed on an already-approved branch.

Explicit user approval is required before creating or deleting a branch, pushing, merging, rebasing or rewriting history, opening a PR, creating or pushing tags, or deploying. Before branch creation, the agent reports the proposed name, base, reason, and scope. Before every push, it reports the branch, destination, commits, important files, validation, worktree state, and known risks, then waits for approval. Force-push is never allowed. See [`AGENTS.md`](AGENTS.md).

## Testing and CI

Run the local validation gate:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

GitHub CI performs frozen-lockfile install, lint, typecheck, tests, and build using Node 24 with read-only repository permissions. It contains no deployment credentials or deployment step.

## Authoritative Liara knowledge

Liara-specific answers must prefer:

- [Published Liara documentation](https://docs.liara.ir/)
- [Official Liara documentation repository](https://github.com/liara-cloud/docs)

The implemented retrieval baseline reads `src/pages/**/*.mdx` from an explicit local checkout at a caller-supplied full Git revision. It preserves canonical URL, revision-pinned repository URL, repository path, page/section identity, conservative category metadata, content hash, and chunk identity/order. It parses MDX structurally without compiling or executing it, and represents an empty or irrelevant query as `no_matches` rather than a backend failure.

The generated `public/llms` Markdown is not the authoritative input: audit fixtures showed dropped table cells and corrupted code. Fetch/refresh automation and a persisted production index remain deferred until the deployment shape is known. If official evidence is insufficient, the later assistant flow must say so.

## Liara deployment

Deployment is intentionally not configured or performed in this foundation task.

Verified current direction:

- Liara provides a dedicated Next.js platform.
- Its current official version page lists Node 20, 22 (default), and 24.
- A standard `package.json` needs `build` and `start` scripts, which this project has.
- `liara.json` can configure the Next platform, port, Node version, and health check.

Open deployment gate: the current official Next.js deployment page describes `npm install` and `npm run build`, while this repository is required to use pnpm and its lockfile. Before adding `liara.json`, verify Liara’s pnpm lockfile behavior and production SSE/cancellation behavior. Do not silently fall back to npm.

Relevant official sources:

- [Next.js deployment source page](https://github.com/liara-cloud/docs/blob/master/src/pages/paas/nextjs/how-tos/deploy-app.mdx)
- [Next.js Node version source page](https://github.com/liara-cloud/docs/blob/master/src/pages/paas/nextjs/how-tos/choose-version.mdx)
- [Health-check source page](https://github.com/liara-cloud/docs/blob/master/src/pages/paas/details/health-check.mdx)

## Security

The backend validates bounded JSON requests and official citation hosts, keeps AvalAI credentials server-only, isolates retrieved text as untrusted evidence, applies request/output/context limits and timeouts, returns safe typed errors, and logs only request ID/error category on failure. Rate limiting, abuse prevention, richer redacted observability, and production validation remain required.

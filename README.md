# Liara Agentic Developer Copilot

A production-minded, grounded developer and troubleshooting copilot for Liara. The intended product answers Liara questions from authoritative documentation, provides traceable citations, asks selective clarifying questions, and guides developers through multi-step support workflows.

## Current status

**Foundation only.** The repository currently includes:

- a minimal Next.js App Router scaffold
- strict TypeScript and Tailwind CSS with a minimal optional shadcn-compatible scaffold
- Vercel AI SDK streaming contract planning without a chat implementation
- versioned runtime-validated chat contracts and contract tests
- architecture, governance, rubric tracking, and lightweight CI

The chat API, model provider, RAG pipeline, persistence, rate limiting, monitoring, deployment configuration, and product UI are **planned, not implemented**.

## Architecture summary

The initial direction is one deployable Next.js full-stack application with protected internal boundaries:

```text
product UI -> versioned chat/API boundary -> server orchestration
                                            |- context and personalization
                                            |- authoritative retrieval
                                            |- model provider adapter
                                            `- citations and next actions
```

- `src/app/`: App Router pages and future API boundaries
- `src/contracts/`: shared, versioned, protected request/stream/error contracts
- `src/server/`: future server-only domain and infrastructure modules
- `src/components/` and `src/features/`: frontend-owned UI implementation when added

See [the architecture document](docs/architecture/ARCHITECTURE.md) and [product specification](SPEC.md).

## Technology stack

- Node.js 24.x
- pnpm 10.34.5 (pinned through `packageManager`)
- Next.js 16 App Router
- React 19 and TypeScript 5 in strict mode
- Tailwind CSS 4
- Vercel AI SDK 7 for typed streaming and shared message contracts
- Zod 4 for trust-boundary schemas
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

`.env.example` separates browser-safe values from server-only configuration. Its values are placeholders. No model call is made by the current foundation.

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
- safe stable error codes
- runtime input and official-source validation

The planned transport is AI SDK 7’s UI Message Stream Protocol over SSE. The API route is not implemented yet. Contract changes require coordination between both owners and integration validation.

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

The future ingestion pipeline must preserve canonical URL, repository path, page and section title, category, chunk identity/order, and source revision. If official evidence is insufficient, the assistant must say so.

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

The foundation validates contract inputs and official citation hosts, disables the framework-identifying response header, adds baseline browser security headers, ignores secret files, and gives CI least-privilege access. Rate limiting, abuse prevention, provider timeouts, logging redaction, and operational monitoring remain required before production.

# ADR-0003: Pinned raw MDX retrieval baseline

Status: Accepted
Date: 2026-08-20

## Context

Grounded answers need traceable evidence from the official `liara-cloud/docs`
repository. Its generated `public/llms` Markdown looks simpler to ingest, but an
audit found dropped CLI table rows, corrupted code/JSX, and generated content for
an empty source page. Choosing database/vector infrastructure before measuring a
local baseline would add deployment, cost, and maintenance risk.

## Decision

- Treat pinned `src/pages/**/*.mdx` files as the authoritative corpus.
- Parse MDX into an AST and extract only supported static content; never compile
  or execute repository code or dynamic expressions.
- Preserve revision, content hash, source/canonical paths, section identity, and
  conservative classification through every chunk and result.
- Prepare an exact official checkout under `.liara-docs` during production
  builds; allow an explicit absolute checkout override for development only.
- Start with bounded in-memory lexical ranking and an explicit `no_matches`
  outcome. Do not add embeddings, a database, or an external retrieval service.

## Consequences

The baseline is cheap, deterministic, testable, and simple to deploy, while the
full-corpus test catches silent extraction loss. Production requires a pinned
revision and Git during the build; each server process builds and reuses one
in-memory index. Index persistence remains deferred. Hybrid/vector retrieval is
justified only if evaluation demonstrates a material quality gain worth its
Liara deployment and operating costs.

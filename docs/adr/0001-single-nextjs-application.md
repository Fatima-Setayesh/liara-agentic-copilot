# ADR-0001: Use one Next.js full-stack deployment

Date: 2026-08-20
Status: Accepted for the foundation

## Context

Two developers must deliver a grounded, observable, secure Liara copilot within hackathon time. The product needs a responsive frontend, streaming API, server-only orchestration, retrieval, context, and platform controls. Separate frontend and backend deployments would introduce another build, deployment, URL, CORS, secret, logging, and integration boundary.

## Decision

Use one Next.js App Router application as the initial deployable. Keep visible product code, protected contracts, thin API handlers, and server-only modules in explicit directories with enforced ownership.

## Consequences

Benefits:

- same-origin streaming and simpler frontend/backend integration
- one dependency graph, CI gate, and Liara deployment
- lower demo and operational failure surface
- fast shared TypeScript contracts without publishing a package

Costs:

- frontend and backend releases are coupled
- process-level scaling cannot be independent
- directory and import boundaries require discipline

## Revisit when

Split the deployment only if verified Liara constraints, independent scaling, security isolation, or a measured workload require it. Architecture aesthetics alone are not sufficient.

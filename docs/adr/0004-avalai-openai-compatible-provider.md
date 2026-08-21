# ADR-0004: Use AvalAI through the AI SDK OpenAI-compatible provider

Status: Accepted
Date: 2026-08-21

## Context

The product requires AvalAI for model access while the chat route already uses AI SDK 7 streaming primitives. A handwritten `fetch` adapter would duplicate response parsing, streaming, retries, usage handling, cancellation, and provider-error behavior.

## Decision

- Use `@ai-sdk/openai-compatible` for AvalAI chat models.
- Keep `AVALAI_API_KEY` server-only and distinct from every Liara management credential.
- Configure base URL and model through validated environment values; default only the official `https://api.avalai.ir/v1` base URL, never a model ID.
- Keep model selection behind the existing provider-neutral interface.

## Consequences

This reuses the same tested AI SDK stream lifecycle as the chat contract and keeps model choice deploy-time configurable. AvalAI compatibility, selected-model quality, latency, usage reporting, and production streaming still require a real integration test before deployment.

Reference: <https://docs.avalai.ir/en/libraries>

# ADR-0002: Use AI SDK UI Message Stream Protocol

Date: 2026-08-20
Status: Accepted for contract planning; route implementation pending

## Context

The frontend needs streamed text plus typed citations, suggestions, agent activity, completion, errors, and cancellation. A custom protocol would add parsing, lifecycle, compatibility, and testing risk. Plain text streams cannot carry the required structured metadata safely.

## Decision

Use Vercel AI SDK 7’s UI Message Stream Protocol over SSE with `useChat` and `DefaultChatTransport` on the client and the standalone `createUIMessageStream`, `toUIMessageStream`, and `createUIMessageStreamResponse` helpers on the server.

Map v1 content as follows:

- answer: native text parts
- source/citation: persistent `data-citation`
- suggested next actions: persistent `data-suggestions`
- real workflow transition: transient `data-agent-state`
- anticipated post-header failure: safe `data-error`
- pre-stream failure: JSON `ChatErrorResponse` with an appropriate HTTP status
- success: native finish and `completed`

Do not send reasoning parts. Do not use deprecated AI SDK result-instance response helpers. The client sends `ChatRequest` v1 rather than unbounded UI history.

Cancellation propagates the request abort signal through retrieval and generation. Resume support is deferred because it conflicts with cancellation behavior and is not required for the initial demo.

## Consequences

Benefits:

- official, typed client/server lifecycle
- structured metadata without string parsing
- standard cancellation and stream handling
- direct fit with AI Elements and current AI SDK APIs

Costs:

- shared message types depend on AI SDK’s protocol vocabulary
- upgrades require contract and integration review
- Liara proxy buffering and disconnect behavior still require production validation

## Compatibility rule

Any protocol or part-name change requires coordination, synchronized frontend/backend updates, contract tests, and integration validation. It must never be changed silently.

## References

- [AI SDK UI stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [AI SDK typed streaming data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [AI SDK transport customization](https://ai-sdk.dev/docs/ai-sdk-ui/transport)
- [AI SDK stopping streams](https://ai-sdk.dev/docs/advanced/stopping-streams)
- [AI SDK error handling](https://ai-sdk.dev/docs/ai-sdk-ui/error-handling)

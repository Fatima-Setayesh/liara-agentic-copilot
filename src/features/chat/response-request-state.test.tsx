import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ResponseCancelledState, ResponseErrorState } from "./response-request-state";

describe("response request states", () => {
  it("renders a safe retryable error with its request ID", () => {
    const html = renderToStaticMarkup(
      <ResponseErrorState
        error={{ code: "STREAM_INTERRUPTED", message: "The connection ended before completion.", requestId: "request-42", retryable: true }}
        onRetry={vi.fn()}
      />,
    );

    expect(html).toContain("The response stream was interrupted");
    expect(html).toContain("request-42");
    expect(html).toContain("Retry request");
  });

  it("renders a recoverable cancellation state", () => {
    const html = renderToStaticMarkup(<ResponseCancelledState onRetry={vi.fn()} />);
    expect(html).toContain("This response was cancelled");
    expect(html).toContain("Generate again");
  });
});

"use client";

import { AlertTriangle, Ban, RefreshCw, ShieldAlert } from "lucide-react";

import type { ChatError } from "@/contracts";

import styles from "./response-request-state.module.css";

const errorTitles: Record<ChatError["code"], string> = {
  RATE_LIMITED: "Request limit reached",
  INVALID_INPUT: "This request needs an adjustment",
  RETRIEVAL_FAILED: "Official sources could not be checked",
  MODEL_UNAVAILABLE: "The AI service is temporarily unavailable",
  STREAM_INTERRUPTED: "The response stream was interrupted",
  INTERNAL_ERROR: "Liara could not complete this request",
};

export function ResponseErrorState({ error, onRetry }: { error: ChatError; onRetry: () => void }) {
  return (
    <section className={styles.requestState} data-tone="error" role="alert">
      <span className={styles.stateIcon} aria-hidden="true"><AlertTriangle size={20} /></span>
      <div className={styles.stateCopy}>
        <span className={styles.stateEyebrow}><ShieldAlert size={12} /> Safe failure</span>
        <h3>{errorTitles[error.code]}</h3>
        <p>{error.message}</p>
        <small>Request ID: <code>{error.requestId}</code></small>
      </div>
      {error.retryable && (
        <button type="button" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" /> Retry request
        </button>
      )}
    </section>
  );
}

export function ResponseCancelledState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={styles.requestState} data-tone="cancelled" role="status">
      <span className={styles.stateIcon} aria-hidden="true"><Ban size={19} /></span>
      <div className={styles.stateCopy}>
        <span className={styles.stateEyebrow}>Generation stopped</span>
        <h3>This response was cancelled</h3>
        <p>No additional response content will be generated unless you retry.</p>
      </div>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={15} aria-hidden="true" /> Generate again
      </button>
    </section>
  );
}

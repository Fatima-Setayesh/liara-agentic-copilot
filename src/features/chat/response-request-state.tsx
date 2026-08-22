"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Ban, RefreshCw, ShieldAlert } from "lucide-react";

import type { ChatError } from "@/contracts";

import styles from "./response-request-state.module.css";

const errorTitles: Record<ChatError["code"], string> = {
  RATE_LIMITED: "Request limit reached",
  INVALID_INPUT: "This request needs an adjustment",
  RETRIEVAL_FAILED: "Official sources could not be checked",
  MODEL_UNAVAILABLE: "The AI service is temporarily unavailable",
  STREAM_INTERRUPTED: "The response stream was interrupted",
  TIMEOUT: "The request timed out",
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

export function ClarificationRequestState({
  originalQuestion,
  onSubmit,
}: {
  originalQuestion: string;
  onSubmit: (prompt: string) => void;
}) {
  const [framework, setFramework] = useState("");
  const [errorStage, setErrorStage] = useState("");
  const [errorLog, setErrorLog] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const frameworkError = submitted && !framework;
  const stageError = submitted && !errorStage;

  function submitClarification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!framework || !errorStage) return;

    onSubmit([
      `Original question: ${originalQuestion}`,
      `Framework/runtime: ${framework}`,
      `Error stage: ${errorStage}`,
      `Error message/log:\n${errorLog.trim() || "Not provided"}`,
      `Additional details:\n${details.trim() || "Not provided"}`,
    ].join("\n\n"));
  }

  return (
    <form className={styles.clarificationState} onSubmit={submitClarification} noValidate>
      <div className={styles.clarificationHeading}>
        <span className={styles.stateEyebrow}>Clarification needed</span>
        <h3>Tell us where the issue occurs</h3>
        <p>The original question will stay attached to your next request.</p>
      </div>
      <label>
        <span>Framework or runtime</span>
        <select
          value={framework}
          onChange={(event) => setFramework(event.target.value)}
          aria-invalid={frameworkError}
          aria-describedby={frameworkError ? "framework-error" : undefined}
        >
          <option value="">Select one</option>
          <option>Next.js</option>
          <option>Node.js</option>
          <option>React</option>
          <option>Python</option>
          <option>PHP</option>
          <option>Docker</option>
          <option>Other</option>
        </select>
        {frameworkError && <small id="framework-error" role="alert">Select a framework or runtime.</small>}
      </label>
      <label>
        <span>Error stage</span>
        <select
          value={errorStage}
          onChange={(event) => setErrorStage(event.target.value)}
          aria-invalid={stageError}
          aria-describedby={stageError ? "stage-error" : undefined}
        >
          <option value="">Select one</option>
          <option>Build</option>
          <option>Deploy</option>
          <option>Runtime</option>
        </select>
        {stageError && <small id="stage-error" role="alert">Select the error stage.</small>}
      </label>
      <label className={styles.clarificationWide}>
        <span>Error message or log</span>
        <textarea
          value={errorLog}
          onChange={(event) => setErrorLog(event.target.value)}
          placeholder="Paste the relevant error output"
          dir="ltr"
          rows={4}
        />
      </label>
      <label className={styles.clarificationWide}>
        <span>Additional details</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="What changed, and what have you already tried?"
          rows={3}
        />
      </label>
      <button type="submit" className={styles.clarificationSubmit}>Continue investigation</button>
    </form>
  );
}

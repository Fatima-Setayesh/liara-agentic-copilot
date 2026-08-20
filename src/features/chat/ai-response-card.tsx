"use client";

import Image from "next/image";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Lightbulb,
  SearchCheck,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useId, useState } from "react";

import type { AgentState, Citation, Suggestion } from "@/contracts";

import { AgentStatus } from "./agent-status";
import {
  createPendingPresentation,
  formatPresentationCopy,
  type AiResponsePresentation,
} from "./ai-response-model";
import styles from "./ai-response-card.module.css";
import workspaceStyles from "./chat-workspace.module.css";
import { LoadingState } from "./loading-state";
import { ProfessionalCodeBlock } from "./professional-code-block";
import { RecommendedActions } from "./recommended-actions";
import { ResponseSection } from "./response-section";
import { StreamingMessage } from "./streaming-message";
import type { ResponseLifecycle } from "./streaming-types";
import streamingStyles from "./streaming-states.module.css";

type ResponseCardProps = {
  prompt: string;
  timestamp: string;
  citations: Citation[];
  presentation?: AiResponsePresentation;
  agentState?: AgentState;
  suggestions?: Suggestion[];
  onSuggestedPrompt: (prompt: string) => void;
  onFeedback?: (feedback: Feedback) => void;
  lifecycle?: ResponseLifecycle;
};

type Feedback = "helpful" | "not-helpful" | null;

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function SourcesPanel({ citations, headingId }: { citations: Citation[]; headingId: string }) {
  if (citations.length === 0) return null;

  return (
    <section className={styles.sourcesPanel} aria-labelledby={headingId}>
      <header>
        <BookOpen size={16} aria-hidden="true" />
        <h3 id={headingId}>Official sources</h3>
        <span>{citations.length}</span>
      </header>
      <div className={styles.sourceGrid}>
        {citations.map((citation) => (
          <a href={citation.source.url} target="_blank" rel="noreferrer" key={citation.id}>
            <span className={styles.sourceIndex}>{citation.displayIndex}</span>
            <span className={styles.sourceCopy}>
              <strong>{citation.source.title}</strong>
              <small>{citation.source.sectionHeading ?? citation.source.documentationPath ?? "Liara documentation"}</small>
            </span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function AiResponseCard({
  prompt,
  timestamp,
  citations,
  presentation,
  agentState,
  suggestions = [],
  onSuggestedPrompt,
  onFeedback,
  lifecycle,
}: ResponseCardProps) {
  const agentStatusId = useId();
  const sourcesId = useId();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const response = presentation ?? createPendingPresentation(prompt);
  const isLoading = lifecycle?.phase === "loading";
  const isStreaming = lifecycle?.phase === "streaming";
  const streamProgress = lifecycle?.progress ?? 1;
  const showDiagnostics = !isStreaming || streamProgress >= .24;
  const showRecommendation = !isStreaming || streamProgress >= .63;
  const showCode = !isStreaming || streamProgress >= .84;
  const showSources = !isStreaming || streamProgress >= .96;
  const responseReady = !lifecycle || lifecycle.phase === "complete";

  async function copyResponse() {
    const sourceText = citations.length > 0
      ? `\n\nOfficial sources\n${citations
          .map((citation) => `[${citation.displayIndex}] ${citation.source.title}\n${citation.source.url}`)
          .join("\n")}`
      : "";

    try {
      await navigator.clipboard.writeText(`${formatPresentationCopy(response)}${sourceText}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function toggleFeedback(nextFeedback: Exclude<Feedback, null>) {
    const updatedFeedback = feedback === nextFeedback ? null : nextFeedback;
    setFeedback(updatedFeedback);
    onFeedback?.(updatedFeedback);
  }

  return (
    <article className={workspaceStyles.responseMessage} aria-label="Liara Copilot response">
      <span className={workspaceStyles.responseAvatar} aria-hidden="true">
        <Image src="/liara-logo.png" alt="" width={28} height={28} />
      </span>

      <div className={workspaceStyles.responseColumn}>
        <header className={workspaceStyles.responseHeader}>
          <strong>Liara Copilot</strong>
          <span>AI</span>
          <time dateTime={timestamp}>{formatTimestamp(timestamp)}</time>
        </header>

        {isLoading ? (
          <LoadingState activeStep={lifecycle.activeStep} />
        ) : (
        <div className={`${styles.presentationGrid} ${isStreaming ? streamingStyles.streamingRegion : ""}`}>
          <div className={styles.responseSurface}>
            <ResponseSection title="Analysis" icon={SearchCheck} tone="analysis" delay={40}>
              <p>
                <StreamingMessage text={response.analysis} progress={streamProgress} range={[0, .29]} streaming={isStreaming} />
              </p>
            </ResponseSection>

            {showDiagnostics && <div className={styles.diagnosticGrid}>
              <ResponseSection title="Problem detected" icon={ShieldAlert} tone="warning" delay={100}>
                <p>
                  <StreamingMessage text={response.problemDetected} progress={streamProgress} range={[.24, .51]} streaming={isStreaming} />
                </p>
              </ResponseSection>
              <ResponseSection title="Why this happens" icon={Lightbulb} tone="explanation" delay={160}>
                <p>
                  <StreamingMessage text={response.whyThisHappens} progress={streamProgress} range={[.48, .72]} streaming={isStreaming} />
                </p>
              </ResponseSection>
            </div>}

            {showRecommendation && <ResponseSection title="Recommended fix" icon={Wrench} tone="success" delay={220}>
              <p>
                <StreamingMessage text={response.recommendedFix} progress={streamProgress} range={[.63, .88]} streaming={isStreaming} />
              </p>
              {response.codeExample && showCode && (
                <>
                  <ProfessionalCodeBlock
                    fileName={response.codeExample.fileName}
                    language={response.codeExample.language}
                    lines={response.codeExample.lines}
                    revealing={isStreaming}
                  />
                  {response.codeExample.note && (
                    <p className={styles.codeNote}>{response.codeExample.note}</p>
                  )}
                </>
              )}
            </ResponseSection>}

            {showSources && <SourcesPanel citations={citations} headingId={sourcesId} />}
            {isStreaming && (
              <span className={streamingStyles.streamingStatus} role="status">
                Liara is generating the response.
              </span>
            )}
          </div>

          <AgentStatus agentState={agentState} headingId={agentStatusId} />
        </div>
        )}

        {responseReady && <div className={styles.responseInteractions} aria-label="Response actions">
          <button
            type="button"
            className={feedback === "helpful" ? styles.interactionActive : ""}
            onClick={() => toggleFeedback("helpful")}
            aria-label="Mark response as helpful"
            aria-pressed={feedback === "helpful"}
          >
            <ThumbsUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={feedback === "not-helpful" ? styles.interactionActive : ""}
            onClick={() => toggleFeedback("not-helpful")}
            aria-label="Mark response as not helpful"
            aria-pressed={feedback === "not-helpful"}
          >
            <ThumbsDown size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.copyResponse} onClick={copyResponse} aria-label={copied ? "Response copied" : "Copy response"}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            <span>{copied ? "Copied" : "Copy response"}</span>
          </button>
          <span className={styles.interactionStatus} aria-live="polite">
            {copied ? "Response copied" : feedback === "helpful" ? "Marked helpful" : feedback === "not-helpful" ? "Feedback noted" : ""}
          </span>
        </div>}

        {responseReady && <RecommendedActions
          suggestions={suggestions}
          onSuggestedPrompt={onSuggestedPrompt}
          onRetry={() => onSuggestedPrompt(prompt)}
        />}
      </div>
    </article>
  );
}

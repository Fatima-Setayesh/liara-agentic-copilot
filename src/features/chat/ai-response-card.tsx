"use client";

import Image from "next/image";
import {
  Check,
  Copy,
  Lightbulb,
  MessageSquareText,
  SearchCheck,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useId, useState } from "react";

import type { AgentState, ChatError, ChatOutcomeStatus, Citation, Suggestion } from "@/contracts";

import { AgentStatus } from "./agent-status";
import {
  createPendingPresentation,
  formatPresentationCopy,
  type AiResponsePresentation,
} from "./ai-response-model";
import styles from "./ai-response-card.module.css";
import workspaceStyles from "./chat-workspace.module.css";
import { LoadingState } from "./loading-state";
import { MarkdownContent } from "./markdown-content";
import { ProfessionalCodeBlock } from "./professional-code-block";
import { RecommendedActions } from "./recommended-actions";
import { ResponseSection } from "./response-section";
import { ResponseCancelledState, ResponseErrorState } from "./response-request-state";
import type { ProjectEvidence } from "./source-experience-model";
import { SourcesSection } from "./sources-section";
import { StreamingMessage } from "./streaming-message";
import { TypingCursor } from "./typing-cursor";
import type { ResponseLifecycle } from "./streaming-types";
import streamingStyles from "./streaming-states.module.css";

type ResponseCardProps = {
  prompt: string;
  timestamp: string;
  citations: Citation[];
  presentation?: AiResponsePresentation;
  agentState?: AgentState;
  outcomeStatus?: ChatOutcomeStatus;
  suggestions?: Suggestion[];
  onSuggestedPrompt: (prompt: string) => void;
  onFeedback?: (feedback: Feedback) => void;
  lifecycle?: ResponseLifecycle;
  projectEvidence?: ProjectEvidence;
  liveText?: string;
  error?: ChatError;
  cancelled?: boolean;
  onRetry?: () => void;
  transportMode?: "preview" | "live";
};

type Feedback = "helpful" | "not-helpful" | null;

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function AiResponseCard({
  prompt,
  timestamp,
  citations,
  presentation,
  agentState,
  outcomeStatus,
  suggestions = [],
  onSuggestedPrompt,
  onFeedback,
  lifecycle,
  projectEvidence,
  liveText,
  error,
  cancelled,
  onRetry,
  transportMode = "live",
}: ResponseCardProps) {
  const agentStatusId = useId();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const response = presentation ?? createPendingPresentation(prompt);
  const retryResponse = onRetry ?? (() => onSuggestedPrompt(prompt));
  const isLoading = lifecycle?.phase === "loading";
  const isStreaming = lifecycle?.phase === "streaming";
  const hasLiveAnswerText = typeof liveText === "string" && liveText.trim().length > 0;
  const isAwaitingLiveAnswer = transportMode === "live" && presentation === undefined && isStreaming && !hasLiveAnswerText;
  const streamProgress = lifecycle?.progress ?? 1;
  const showDiagnostics = !isStreaming || streamProgress >= .24;
  const showRecommendation = !isStreaming || streamProgress >= .63;
  const showCode = !isStreaming || streamProgress >= .84;
  const responseReady = (!lifecycle || lifecycle.phase === "complete") && !error && !cancelled;

  async function copyResponse() {
    const sourceText = citations.length > 0
      ? `\n\nOfficial sources\n${citations
          .map((citation) => `[${citation.displayIndex}] ${citation.source.title}\n${citation.source.url}`)
          .join("\n")}`
      : "";

    try {
      await navigator.clipboard.writeText(`${liveText ?? formatPresentationCopy(response)}${sourceText}`);
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

        {error ? (
          <ResponseErrorState error={error} onRetry={retryResponse} />
        ) : cancelled ? (
          <ResponseCancelledState onRetry={retryResponse} />
        ) : isLoading || isAwaitingLiveAnswer ? (
          <LoadingState activeStep={lifecycle.activeStep} mode={transportMode} />
        ) : liveText !== undefined ? (
          <div className={`${styles.presentationGrid} ${isStreaming ? streamingStyles.streamingRegion : ""}`}>
            <div className={styles.responseSurface}>
              <ResponseSection title="Grounded answer" icon={MessageSquareText} tone="analysis" delay={40}>
                <div className={styles.liveAnswer}>
                  <MarkdownContent content={liveText} />
                  <TypingCursor visible={isStreaming} />
                </div>
              </ResponseSection>
              {isStreaming && <span className={streamingStyles.streamingStatus} role="status">Liara is generating the response.</span>}
            </div>
            <AgentStatus
              headingId={agentStatusId}
              {...(agentState ? { agentState } : {})}
              {...(outcomeStatus ? { outcomeStatus } : {})}
            />
          </div>
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

            {isStreaming && (
              <span className={streamingStyles.streamingStatus} role="status">
                Liara is generating the response.
              </span>
            )}
          </div>

          <AgentStatus
            headingId={agentStatusId}
            {...(agentState ? { agentState } : {})}
            {...(outcomeStatus ? { outcomeStatus } : {})}
          />
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

        {responseReady && (
          <SourcesSection
            citations={citations}
            {...(projectEvidence ? { projectEvidence } : {})}
          />
        )}

        {responseReady && <RecommendedActions
          suggestions={suggestions}
          onSuggestedPrompt={onSuggestedPrompt}
          onRetry={retryResponse}
          allowFallback={liveText === undefined}
        />}
      </div>
    </article>
  );
}

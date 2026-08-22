"use client";

import { ReactNode, useEffect, useRef } from "react";

import type { AgentState, ChatError, ChatOutcomeStatus, Citation, Suggestion } from "@/contracts";

import { AiResponseCard } from "./ai-response-card";
import type { AiResponsePresentation } from "./ai-response-model";
import type { ProjectEvidence } from "./source-experience-model";
import type { ResponseLifecycle } from "./streaming-types";
import { getTextDirection } from "./text-direction";
import styles from "./chat-workspace.module.css";

export type ChatEntry = {
  id: string;
  prompt: string;
  sentAt: string;
  response?: AiResponsePresentation;
  agentState?: AgentState;
  outcomeStatus?: ChatOutcomeStatus;
  citations?: Citation[];
  suggestions?: Suggestion[];
  lifecycle?: ResponseLifecycle;
  projectEvidence?: ProjectEvidence;
  liveText?: string;
  error?: ChatError;
  cancelled?: boolean;
  transportMode?: "preview" | "live";
};

type ChatWorkspaceProps = {
  entries: ChatEntry[];
  composer: ReactNode;
  citations?: Citation[];
  onSuggestedPrompt: (prompt: string) => void;
  onRetryEntry: (entryId: string) => void;
  onSubmitClarification: (prompt: string) => void;
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function UserMessage({ entry }: { entry: ChatEntry }) {
  return (
    <article className={styles.userMessageRow} aria-label="Your message">
      <div className={styles.userMessageColumn}>
        <time dateTime={entry.sentAt}>{formatTimestamp(entry.sentAt)}</time>
        <div className={styles.userMessageBubble} dir={getTextDirection(entry.prompt)}>
          <p>{entry.prompt}</p>
        </div>
      </div>
      <span className={styles.userAvatar} aria-hidden="true">L</span>
    </article>
  );
}

export function ChatWorkspace({ entries, composer, citations = [], onSuggestedPrompt, onRetryEntry, onSubmitClarification }: ChatWorkspaceProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const latestLifecycle = entries.at(-1)?.lifecycle;

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream || !latestLifecycle) return;

    const distanceFromBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
    if (distanceFromBottom < 180) {
      stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
    }
  }, [latestLifecycle]);

  return (
    <section className={styles.chatWorkspace} aria-label="Chat workspace">
      <div className={styles.conversationStream} ref={streamRef}>
        <div className={entries.length === 0 ? `${styles.conversationInner} ${styles.conversationInnerEmpty}` : styles.conversationInner}>
          {entries.length === 0 ? (
            <div className={styles.emptyTranscript} role="status">
              <strong>This conversation has no saved messages.</strong>
              <p>You can continue here, or start a new conversation from the sidebar.</p>
            </div>
          ) : entries.map((entry, index) => (
            <div className={styles.exchange} key={entry.id}>
              <UserMessage entry={entry} />
              <AiResponseCard
                prompt={entry.prompt}
                timestamp={entry.sentAt}
                citations={entry.citations ?? (index === entries.length - 1 ? citations : [])}
                onRetry={() => onRetryEntry(entry.id)}
                onSuggestedPrompt={onSuggestedPrompt}
                {...(index === entries.length - 1 && entry.agentState === "clarification_required"
                  ? { onSubmitClarification }
                  : {})}
                {...(entry.response ? { presentation: entry.response } : {})}
                {...(entry.agentState ? { agentState: entry.agentState } : {})}
                {...(entry.outcomeStatus ? { outcomeStatus: entry.outcomeStatus } : {})}
                {...(entry.suggestions ? { suggestions: entry.suggestions } : {})}
                {...(entry.lifecycle ? { lifecycle: entry.lifecycle } : {})}
                {...(entry.projectEvidence ? { projectEvidence: entry.projectEvidence } : {})}
                {...(entry.liveText !== undefined ? { liveText: entry.liveText } : {})}
                {...(entry.error ? { error: entry.error } : {})}
                {...(entry.cancelled !== undefined ? { cancelled: entry.cancelled } : {})}
                {...(entry.transportMode ? { transportMode: entry.transportMode } : {})}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.composerDock}>{composer}</div>
      <p className={styles.disclaimer}>Liara can make mistakes. Verify important information and cited documentation.</p>
    </section>
  );
}

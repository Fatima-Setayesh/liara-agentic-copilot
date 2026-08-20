"use client";

import { ReactNode, useEffect, useRef } from "react";

import type { AgentState, Citation, Suggestion } from "@/contracts";

import { AiResponseCard } from "./ai-response-card";
import type { AiResponsePresentation } from "./ai-response-model";
import type { ResponseLifecycle } from "./streaming-types";
import styles from "./chat-workspace.module.css";

export type ChatEntry = {
  id: string;
  prompt: string;
  sentAt: string;
  response?: AiResponsePresentation;
  agentState?: AgentState;
  citations?: Citation[];
  suggestions?: Suggestion[];
  lifecycle?: ResponseLifecycle;
};

type ChatWorkspaceProps = {
  entries: ChatEntry[];
  composer: ReactNode;
  citations?: Citation[];
  onSuggestedPrompt: (prompt: string) => void;
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
        <div className={styles.userMessageBubble}>
          <p>{entry.prompt}</p>
        </div>
      </div>
      <span className={styles.userAvatar} aria-hidden="true">L</span>
    </article>
  );
}

export function ChatWorkspace({ entries, composer, citations = [], onSuggestedPrompt }: ChatWorkspaceProps) {
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
        <div className={styles.conversationInner}>
          {entries.map((entry, index) => (
            <div className={styles.exchange} key={entry.id}>
              <UserMessage entry={entry} />
              <AiResponseCard
                prompt={entry.prompt}
                timestamp={entry.sentAt}
                presentation={entry.response}
                agentState={entry.agentState}
                citations={entry.citations ?? (index === entries.length - 1 ? citations : [])}
                suggestions={entry.suggestions}
                lifecycle={entry.lifecycle}
                onSuggestedPrompt={onSuggestedPrompt}
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

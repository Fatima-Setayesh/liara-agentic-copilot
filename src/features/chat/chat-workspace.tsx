"use client";

import { ReactNode, useEffect, useRef } from "react";

import type { Citation } from "@/contracts";

import { AiResponseCard } from "./ai-response-card";
import styles from "./chat-workspace.module.css";

export type ChatEntry = {
  id: string;
  prompt: string;
  sentAt: string;
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

export function ChatWorkspace({ entries, composer, citations = [] }: ChatWorkspaceProps) {
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
  }, [entries.length]);

  return (
    <section className={styles.chatWorkspace} aria-label="Chat workspace">
      <div className={styles.conversationStream} ref={streamRef}>
        <div className={styles.conversationInner}>
          {entries.map((entry, index) => (
            <div className={styles.exchange} key={entry.id}>
              <UserMessage entry={entry} />
              <AiResponseCard
                timestamp={entry.sentAt}
                citations={index === entries.length - 1 ? citations : []}
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

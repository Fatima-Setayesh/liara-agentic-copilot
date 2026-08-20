"use client";

import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  FileSearch,
  Info,
  ListChecks,
  MessageSquareText,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

import type { Citation } from "@/contracts";

import { MarkdownContent } from "./markdown-content";
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

const suggestedActions = [
  {
    label: "Add project context",
    prompt: "I can share my framework, runtime, Liara service, and project context.",
    icon: MessageSquareText,
  },
  {
    label: "Attach relevant logs",
    prompt: "Help me identify which logs or files would be useful to attach.",
    icon: Paperclip,
  },
  {
    label: "Refine the question",
    prompt: "Help me turn this into a more specific troubleshooting question.",
    icon: ListChecks,
  },
];

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function responseFor(prompt: string) {
  const preservedPrompt = prompt.length > 520 ? `${prompt.slice(0, 517)}…` : prompt;

  return `### Conversation workspace ready
Your request is now part of this conversation. **No Liara guidance has been generated locally** because a grounded answer service is not connected in this interface build.

I will keep the request intact for the response service:

\`\`\`text
${preservedPrompt}
\`\`\`

Verified citations and source-backed recommendations will appear here only when they are returned by the authoritative chat backend.`;
}

function UserMessage({ entry }: { entry: ChatEntry }) {
  return (
    <article className={styles.userMessage} aria-label="Your message">
      <div className={styles.messageMeta}>
        <span className={styles.userAvatar}>L</span>
        <strong>You</strong>
        <time dateTime={entry.sentAt}>{formatTimestamp(entry.sentAt)}</time>
      </div>
      <p>{entry.prompt}</p>
    </article>
  );
}

function AssistantMessage({ entry }: { entry: ChatEntry }) {
  const [copied, setCopied] = useState(false);
  const response = responseFor(entry.prompt);

  async function copyResponse() {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className={styles.assistantMessage} aria-label="Liara response">
      <div className={styles.assistantAvatar} aria-hidden="true">
        <Image src="/liara-logo.png" alt="" width={26} height={26} />
      </div>
      <div className={styles.assistantBody}>
        <div className={styles.messageMeta}>
          <strong>Liara</strong>
          <time dateTime={entry.sentAt}>{formatTimestamp(entry.sentAt)}</time>
          <button className={styles.copyResponse} type="button" onClick={copyResponse} aria-label="Copy response">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <MarkdownContent content={response} />
        <aside className={styles.accuracyNote} aria-label="Grounding status">
          <Info size={16} />
          <span>Grounding pending — no product claims or citations have been invented by the client.</span>
        </aside>
      </div>
    </article>
  );
}

function AgentProgress() {
  return (
    <section className={styles.progressPanel} aria-labelledby="agent-progress-title" aria-live="polite">
      <div className={styles.sectionTitle}>
        <Sparkles size={17} />
        <h2 id="agent-progress-title">Agent progress</h2>
      </div>
      <div className={styles.progressSteps}>
        <div className={styles.progressComplete}><Check size={15} /><span>Request received</span></div>
        <div className={styles.progressComplete}><Check size={15} /><span>Conversation workspace prepared</span></div>
        <div className={styles.progressCurrent}><Circle size={15} /><span>Awaiting grounded answer service</span></div>
      </div>
    </section>
  );
}

function SourcesSection({ citations }: { citations: Citation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className={styles.sourcesSection} aria-labelledby="sources-title">
      <div className={styles.sectionTitle}>
        <FileSearch size={17} />
        <h2 id="sources-title">Sources</h2>
        <span>{citations.length}</span>
      </div>
      <div className={styles.sourceGrid}>
        {citations.length > 0 ? citations.map((citation) => {
          const expanded = expandedId === citation.id;
          return (
            <article className={styles.sourceCard} key={citation.id}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : citation.id)}
                aria-expanded={expanded}
              >
                <span className={styles.sourceIndex}>{citation.displayIndex}</span>
                <span className={styles.sourceCopy}>
                  <strong>{citation.source.title}</strong>
                  <small>{citation.source.sectionHeading ?? citation.source.documentationPath ?? "Official Liara documentation"}</small>
                </span>
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expanded && (
                <div className={styles.sourceDetails}>
                  <p>{citation.source.snippet ?? "No source excerpt was included with this citation."}</p>
                  <a href={citation.source.url} target="_blank" rel="noreferrer">Open official source</a>
                </div>
              )}
            </article>
          );
        }) : (
          <details className={`${styles.sourceCard} ${styles.emptySource}`}>
            <summary>
              <span className={styles.sourceIndex}>0</span>
              <span className={styles.sourceCopy}>
                <strong>No verified sources attached</strong>
                <small>Source cards populate from backend citations</small>
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className={styles.sourceDetails}>
              <p>The client will only display allowlisted official Liara sources returned by the chat service.</p>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function SuggestedActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <section className={styles.suggestedSection} aria-labelledby="suggested-actions-title">
      <div className={styles.sectionTitle}>
        <Sparkles size={17} />
        <h2 id="suggested-actions-title">Suggested next actions</h2>
      </div>
      <div className={styles.actionGrid}>
        {suggestedActions.map(({ label, prompt, icon: Icon }) => (
          <button type="button" key={label} onClick={() => onSelect(prompt)}>
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function ChatWorkspace({ entries, composer, citations = [], onSuggestedPrompt }: ChatWorkspaceProps) {
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
              <AssistantMessage entry={entry} />
              {index === entries.length - 1 && (
                <>
                  <AgentProgress />
                  <SourcesSection citations={citations} />
                  <SuggestedActions onSelect={onSuggestedPrompt} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.composerDock}>{composer}</div>
      <p className={styles.disclaimer}>Liara can make mistakes. Verify important information and cited documentation.</p>
    </section>
  );
}

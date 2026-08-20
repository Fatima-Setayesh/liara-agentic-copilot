"use client";

import Image from "next/image";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useId, useState } from "react";

import type { Citation } from "@/contracts";

import { MarkdownContent } from "./markdown-content";
import styles from "./chat-workspace.module.css";

type ResponseCardProps = {
  timestamp: string;
  citations: Citation[];
};

type Feedback = "helpful" | "not-helpful" | null;

const responseText = `I have your question. This conversation workspace is ready to display a Liara-specific answer, but the current frontend has not received verified documentation or project context from the chat service.

The response area is designed for long-form guidance, lists, inline \`configuration\` values, and code examples without interrupting the conversation flow.`;

const responseDetails = `- The original message and timestamp remain in this conversation.
- Verified source metadata stays owned by the backend.
- Liara commands, settings, and diagnoses are never invented by the interface.`;

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
      <div className={styles.panelHeading}>
        <BookOpen size={16} aria-hidden="true" />
        <h3 id={headingId}>Official sources</h3>
        <span>{citations.length}</span>
      </div>
      <div className={styles.sourceList}>
        {citations.map((citation) => (
          <a
            className={styles.sourceCard}
            href={citation.source.url}
            target="_blank"
            rel="noreferrer"
            key={citation.id}
          >
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

export function AiResponseCard({ timestamp, citations }: ResponseCardProps) {
  const recommendationId = useId();
  const sourcesId = useId();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function copyResponse() {
    try {
      await navigator.clipboard.writeText(`${responseText}\n\nGrounded response pending\n${responseDetails}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={styles.responseMessage} aria-label="Liara Copilot response">
      <span className={styles.responseAvatar} aria-hidden="true">
        <Image src="/liara-logo.png" alt="" width={28} height={28} />
      </span>

      <div className={styles.responseColumn}>
        <header className={styles.responseHeader}>
          <strong>Liara Copilot</strong>
          <span>AI</span>
          <time dateTime={timestamp}>{formatTimestamp(timestamp)}</time>
        </header>

        <div className={styles.responseBubble}>
          <MarkdownContent content={responseText} />

          <section className={styles.recommendationPanel} aria-labelledby={recommendationId}>
            <div className={styles.recommendationHeader}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <h3 id={recommendationId}>Grounded response pending</h3>
            </div>
            <p>Connect the versioned chat stream and render its verified answer here. Until authoritative Liara sources arrive, this interface will not invent a command, setting, or diagnosis.</p>

            <details className={styles.responseDetails}>
              <summary>
                <span>Show technical details</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <div>
                <ShieldCheck size={17} aria-hidden="true" />
                <MarkdownContent content={responseDetails} />
              </div>
            </details>
          </section>

          <SourcesPanel citations={citations} headingId={sourcesId} />
        </div>

        <div className={styles.responseActions} aria-label="Response actions">
          <button
            type="button"
            className={feedback === "helpful" ? styles.toolActive : ""}
            onClick={() => setFeedback(feedback === "helpful" ? null : "helpful")}
            aria-label="Mark response as helpful"
            aria-pressed={feedback === "helpful"}
          >
            <ThumbsUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={feedback === "not-helpful" ? styles.toolActive : ""}
            onClick={() => setFeedback(feedback === "not-helpful" ? null : "not-helpful")}
            aria-label="Mark response as not helpful"
            aria-pressed={feedback === "not-helpful"}
          >
            <ThumbsDown size={16} aria-hidden="true" />
          </button>
          <button type="button" onClick={copyResponse} aria-label={copied ? "Response copied" : "Copy response"}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          </button>
          <span className={styles.actionStatus} aria-live="polite">{copied ? "Copied" : ""}</span>
        </div>
      </div>
    </article>
  );
}

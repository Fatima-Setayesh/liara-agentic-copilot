"use client";

import Image from "next/image";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileQuestion,
  Info,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import type { Citation } from "@/contracts";

import { CodeBlock } from "./markdown-content";
import styles from "./chat-workspace.module.css";

type ResponseCardProps = {
  prompt: string;
  timestamp: string;
  citations: Citation[];
  onSuggestedPrompt: (prompt: string) => void;
};

type Feedback = "helpful" | "not-helpful" | null;

const nextActions = [
  {
    label: "Add project context",
    prompt: "I can share my framework, runtime, Liara service, and project context.",
    icon: MessageSquareText,
  },
  {
    label: "Attach relevant logs",
    prompt: "Help me identify which production logs or files would be useful to attach.",
    icon: Paperclip,
  },
  {
    label: "Clarify expected behavior",
    prompt: "Help me clarify the expected behavior and the exact failure I am seeing.",
    icon: ListChecks,
  },
  {
    label: "Retry grounded answer",
    prompt: "Retry this request when the grounded chat service is available.",
    icon: ClipboardCheck,
  },
];

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function requestPreview(prompt: string) {
  const message = prompt.length > 420 ? `${prompt.slice(0, 417)}…` : prompt;
  return JSON.stringify({
    version: "1",
    message,
    userContext: {
      answerDepth: "detailed",
    },
  }, null, 2);
}

function AgentProgress() {
  const steps = [
    { label: "Understanding request", status: "Completed", state: "complete" },
    { label: "Preparing workspace context", status: "Completed", state: "complete" },
    { label: "Waiting for authoritative retrieval", status: "In progress", state: "current" },
    { label: "Preparing recommendation", status: "Pending", state: "pending" },
  ] as const;

  return (
    <section className={styles.progressPanel} aria-labelledby="agent-progress-title" aria-live="polite">
      <div className={styles.panelHeading}>
        <Sparkles size={17} />
        <h3 id="agent-progress-title">Agent progress</h3>
      </div>
      <div className={styles.progressTimeline}>
        {steps.map((step) => (
          <div className={styles.progressStep} data-state={step.state} key={step.label}>
            <span className={styles.progressIcon}>
              {step.state === "complete" ? <CheckCircle2 size={17} /> : step.state === "current" ? <LoaderCircle size={17} /> : <Circle size={17} />}
            </span>
            <span className={styles.progressLabel}>{step.label}</span>
            <small>{step.status}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourcesPanel({ citations }: { citations: Citation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section className={styles.sourcesPanel} aria-labelledby="response-sources-title">
      <div className={styles.panelHeading}>
        <BookOpen size={17} />
        <h3 id="response-sources-title">Sources</h3>
        <span className={styles.countBadge}>{citations.length}</span>
      </div>
      {citations.length > 0 ? (
        <div className={styles.sourceGrid}>
          {citations.map((citation) => {
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
                  {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {expanded && (
                  <div className={styles.sourceDetails}>
                    <p>{citation.source.snippet ?? "No excerpt was returned for this citation."}</p>
                    <a href={citation.source.url} target="_blank" rel="noreferrer">
                      Open official source <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.sourceEmpty}>
          <FileQuestion size={19} />
          <div>
            <strong>No verified sources returned yet</strong>
            <p>Official documentation cards will appear only when the backend provides typed citations.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function SuggestedActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <section className={styles.actionsPanel} aria-labelledby="next-actions-title">
      <div className={styles.panelHeading}>
        <Wrench size={17} />
        <h3 id="next-actions-title">Suggested next actions</h3>
      </div>
      <div className={styles.actionList}>
        {nextActions.map(({ label, prompt, icon: Icon }) => (
          <button type="button" key={label} onClick={() => onSelect(prompt)}>
            <Icon size={16} />
            <span>{label}</span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function AiResponseCard({ prompt, timestamp, citations, onSuggestedPrompt }: ResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const responseText = "The conversation workspace is ready. A product-specific diagnosis is waiting for authoritative documentation and project context from the chat service.";

  async function copyResponse() {
    await navigator.clipboard.writeText(`${responseText}\n\n${requestPreview(prompt)}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className={styles.responseCard} aria-label="Liara Copilot response">
      <header className={styles.responseHeader}>
        <span className={styles.responseAvatar} aria-hidden="true">
          <Image src="/liara-logo.png" alt="" width={28} height={28} />
        </span>
        <div className={styles.responseIdentity}>
          <strong>Liara Copilot</strong>
          <span>AI</span>
          <time dateTime={timestamp}>{formatTimestamp(timestamp)}</time>
        </div>
        <div className={styles.responseTools}>
          <button
            type="button"
            className={feedback === "helpful" ? styles.toolActive : ""}
            onClick={() => setFeedback(feedback === "helpful" ? null : "helpful")}
            aria-label="Mark response as helpful"
            aria-pressed={feedback === "helpful"}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            type="button"
            className={feedback === "not-helpful" ? styles.toolActive : ""}
            onClick={() => setFeedback(feedback === "not-helpful" ? null : "not-helpful")}
            aria-label="Mark response as not helpful"
            aria-pressed={feedback === "not-helpful"}
          >
            <ThumbsDown size={16} />
          </button>
          <button type="button" onClick={copyResponse} aria-label="Copy full response">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button type="button" aria-label="More response actions"><MoreHorizontal size={17} /></button>
        </div>
      </header>

      <p className={styles.responseLead}>{responseText}</p>

      <div className={styles.responseGrid}>
        <div className={styles.responseMainColumn}>
          <section className={styles.diagnosisPanel} aria-labelledby="diagnosis-title">
            <div className={styles.panelHeading}>
              <Stethoscope size={18} />
              <h3 id="diagnosis-title">Diagnosis</h3>
              <span className={styles.pendingBadge}>Grounding required</span>
            </div>
            <p>The client has received the question, but it has not received verified Liara evidence or project configuration. A platform-specific diagnosis would be speculative at this stage.</p>

            <div className={styles.answerSection}>
              <h4><ShieldCheck size={15} /> Recommended fix</h4>
              <p>Send the request through the versioned chat stream, then render the grounded answer, citations, suggestions, and agent states returned by the backend.</p>
            </div>

            <div className={styles.answerSection}>
              <h4><Info size={15} /> Technical details</h4>
              <ul>
                <li>The original prompt is preserved in the conversation.</li>
                <li>Source metadata remains backend-owned.</li>
                <li>No Liara command or configuration is invented by the client.</li>
              </ul>
            </div>

            <CodeBlock content={requestPreview(prompt)} language="json" label="chat-request.json" />
          </section>

          <SourcesPanel citations={citations} />
        </div>

        <div className={styles.responseSideColumn}>
          <AgentProgress />
          <SuggestedActions onSelect={onSuggestedPrompt} />
        </div>
      </div>
    </article>
  );
}

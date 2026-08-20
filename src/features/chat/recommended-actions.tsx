"use client";

import { BookOpen, ExternalLink, FileSearch, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import type { Suggestion } from "@/contracts";

import styles from "./ai-response-card.module.css";

type RecommendedActionsProps = {
  suggestions: Suggestion[];
  onSuggestedPrompt: (prompt: string) => void;
  onRetry: () => void;
};

const fallbackActions = [
  {
    label: "Review project logs",
    prompt: "Help me analyze these Liara build or runtime logs. Ask me to paste the relevant log lines.",
    icon: FileSearch,
  },
  {
    label: "Share configuration",
    prompt: "Help me review my Liara runtime configuration. Ask me for the relevant configuration file.",
    icon: Settings2,
  },
] as const;

export function RecommendedActions({ suggestions, onSuggestedPrompt, onRetry }: RecommendedActionsProps) {
  const headingId = useId();
  const [status, setStatus] = useState("");
  const promptActions = suggestions.length > 0
    ? suggestions.slice(0, 2).map((suggestion) => ({
        label: suggestion.label,
        prompt: suggestion.prompt,
        icon: Sparkles,
      }))
    : fallbackActions;

  function runPromptAction(label: string, prompt: string) {
    setStatus(`${label} sent to the conversation.`);
    onSuggestedPrompt(prompt);
  }

  function retryAnalysis() {
    setStatus("Analysis requested again.");
    onRetry();
  }

  return (
    <section className={styles.recommendedActions} aria-labelledby={headingId}>
      <header>
        <Sparkles size={16} aria-hidden="true" />
        <h3 id={headingId}>Recommended actions</h3>
      </header>
      <div className={styles.actionGrid}>
        {promptActions.map(({ label, prompt, icon: Icon }) => (
          <button type="button" onClick={() => runPromptAction(label, prompt)} key={label}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <a href="https://docs.liara.ir/" target="_blank" rel="noreferrer">
          <BookOpen size={16} aria-hidden="true" />
          <span>Open documentation</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        <button type="button" onClick={retryAnalysis}>
          <RotateCcw size={16} aria-hidden="true" />
          <span>Retry analysis</span>
        </button>
      </div>
      <p className={styles.actionFeedback} aria-live="polite">{status}</p>
    </section>
  );
}

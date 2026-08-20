"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import styles from "./ai-response-card.module.css";

export type CodeToken = {
  text: string;
  tone?: "property" | "string" | "keyword" | "punctuation" | "plain";
};

export type CodeLine = {
  tokens: CodeToken[];
  important?: boolean;
};

type ProfessionalCodeBlockProps = {
  fileName: string;
  language: string;
  lines: CodeLine[];
};

export function ProfessionalCodeBlock({ fileName, language, lines }: ProfessionalCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = lines.map((line) => line.tokens.map((token) => token.text).join("")).join("\n");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <div className={styles.fileIdentity}>
          <strong>{fileName}</strong>
          <span>{language}</span>
        </div>
        <button type="button" onClick={copyCode} aria-label={copied ? "Code copied" : `Copy ${fileName}`}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <pre className={styles.codeBody} aria-label={`${language} code example`}>
        <code>
          {lines.map((line, lineIndex) => (
            <span className={`${styles.codeLine} ${line.important ? styles.importantLine : ""}`} key={`${lineIndex}-${line.tokens.map((token) => token.text).join("")}`}>
              <span className={styles.lineNumber} aria-hidden="true">{lineIndex + 1}</span>
              <span className={styles.lineContent}>
                {line.tokens.map((token, tokenIndex) => (
                  <span className={styles[`token${token.tone ?? "plain"}`]} key={`${token.text}-${tokenIndex}`}>{token.text}</span>
                ))}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

"use client";

import { Check, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import type { UserContext } from "@/contracts";

import type { ConnectionMode, CopilotPreferences } from "./copilot-preferences-model";
import styles from "./settings-dialog.module.css";

type SettingsDialogProps = {
  open: boolean;
  preferences: CopilotPreferences;
  onClose: () => void;
  onUpdateUserContext: (patch: Partial<UserContext>) => void;
  onConnectionModeChange: (mode: ConnectionMode) => void;
  onSendOnEnterChange: (enabled: boolean) => void;
  onReset: () => void;
};

function optionalValue(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}

export function SettingsDialog({
  open,
  preferences,
  onClose,
  onUpdateUserContext,
  onConnectionModeChange,
  onSendOnEnterChange,
  onReset,
}: SettingsDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const context = preferences.userContext;

  return (
    <div className={styles.settingsLayer}>
      <button className={styles.settingsBackdrop} type="button" onClick={onClose} aria-label="Close preferences" />
      <div
        className={styles.settingsDialog}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className={styles.settingsHeader}>
          <span className={styles.settingsMark} aria-hidden="true"><Settings2 size={18} /></span>
          <span>
            <h2 id={titleId}>Copilot preferences</h2>
            <p id={descriptionId}>Control the explicit context Liara may use for future requests.</p>
          </span>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close preferences"><X size={18} /></button>
        </header>

        <div className={styles.settingsBody}>
          <section className={styles.settingsSection} aria-labelledby={`${titleId}-context`}>
            <header><SlidersHorizontal size={15} aria-hidden="true" /><h3 id={`${titleId}-context`}>Developer context</h3></header>
            <div className={styles.settingsGrid}>
              <label>
                <span>Framework</span>
                <input value={context.framework ?? ""} onChange={(event) => onUpdateUserContext({ framework: optionalValue(event.target.value) })} placeholder="Next.js, Laravel, Django…" maxLength={80} />
              </label>
              <label>
                <span>Runtime</span>
                <input value={context.runtime ?? ""} onChange={(event) => onUpdateUserContext({ runtime: optionalValue(event.target.value) })} placeholder="Node.js 24, PHP 8.3…" maxLength={80} />
              </label>
              <label>
                <span>Liara service</span>
                <input value={context.liaraService ?? ""} onChange={(event) => onUpdateUserContext({ liaraService: optionalValue(event.target.value) })} placeholder="App, PostgreSQL, Object Storage…" maxLength={80} />
              </label>
              <label>
                <span>Preferred language</span>
                <input value={context.preferredLanguage ?? ""} onChange={(event) => onUpdateUserContext({ preferredLanguage: optionalValue(event.target.value) })} placeholder="English or فارسی" maxLength={35} />
              </label>
              <label>
                <span>Experience level</span>
                <select value={context.experienceLevel ?? ""} onChange={(event) => onUpdateUserContext({ experienceLevel: optionalValue(event.target.value) as UserContext["experienceLevel"] })}>
                  <option value="">Not set</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label>
                <span>Answer depth</span>
                <select value={context.answerDepth ?? "balanced"} onChange={(event) => onUpdateUserContext({ answerDepth: event.target.value as UserContext["answerDepth"] })}>
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
              <label className={styles.projectDescription}>
                <span>Project description</span>
                <textarea value={context.projectDescription ?? ""} onChange={(event) => onUpdateUserContext({ projectDescription: optionalValue(event.target.value) })} placeholder="Share only the context you want Liara to retain." maxLength={1200} rows={3} />
              </label>
            </div>
          </section>

          <section className={styles.settingsSection} aria-labelledby={`${titleId}-behavior`}>
            <header><ShieldCheck size={15} aria-hidden="true" /><h3 id={`${titleId}-behavior`}>Connection and interaction</h3></header>
            <div className={styles.modeChoice} role="radiogroup" aria-label="Chat connection mode">
              <button type="button" role="radio" aria-checked={preferences.connectionMode === "preview"} data-active={preferences.connectionMode === "preview" || undefined} onClick={() => onConnectionModeChange("preview")}>
                <strong>Interface preview</strong><small>Runs the safe local presentation without claiming backend results.</small>
              </button>
              <button type="button" role="radio" aria-checked={preferences.connectionMode === "live"} data-active={preferences.connectionMode === "live" || undefined} onClick={() => onConnectionModeChange("live")}>
                <strong>Live chat API</strong><small>Consumes the protected `/api/chat` SSE contract.</small>
              </button>
            </div>
            <label className={styles.switchRow}>
              <span><strong>Enter to send</strong><small>Use Shift + Enter for a new line.</small></span>
              <input type="checkbox" checked={preferences.sendOnEnter} onChange={(event) => onSendOnEnterChange(event.target.checked)} />
              <i aria-hidden="true"><Check size={12} /></i>
            </label>
          </section>
        </div>

        <footer className={styles.settingsFooter}>
          <button type="button" onClick={onReset}><RotateCcw size={14} /> Reset preferences</button>
          <button type="button" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

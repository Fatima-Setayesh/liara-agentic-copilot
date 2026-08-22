import { BookOpenCheck, FileSearch2, GitBranch, ShieldCheck } from "lucide-react";

import type { SourceItem } from "./source-experience-model";
import styles from "./sources-section.module.css";
import { getTextDirection } from "./text-direction";

type SourceCardProps = {
  item: SourceItem;
  selected: boolean;
  onSelect: () => void;
};

function SourceIcon({ kind }: { kind: SourceItem["kind"] }) {
  if (kind === "project-context") return <FileSearch2 size={16} strokeWidth={1.8} />;
  if (kind === "official-repository") return <GitBranch size={16} strokeWidth={1.8} />;
  return <BookOpenCheck size={16} strokeWidth={1.8} />;
}

export function SourceCard({ item, selected, onSelect }: SourceCardProps) {
  return (
    <button
      type="button"
      className={styles.sourceCard}
      data-selected={selected || undefined}
      data-kind={item.kind}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={styles.sourceCardIcon} aria-hidden="true">
        <SourceIcon kind={item.kind} />
      </span>
      <span className={styles.sourceCardCopy}>
        <strong dir={getTextDirection(item.title)}>{item.title}</strong>
        <small dir={getTextDirection(item.descriptor)}>{item.descriptor}</small>
        <span className={styles.sourceLabels} dir="ltr">
          <i>{item.typeLabel}</i>
          <i className={styles.trustLabel}>
            <ShieldCheck size={11} aria-hidden="true" />
            {item.trustLabel}
          </i>
        </span>
      </span>
    </button>
  );
}

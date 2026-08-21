import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import styles from "./ai-response-card.module.css";

type ResponseSectionProps = {
  title: string;
  icon: LucideIcon;
  tone: "analysis" | "warning" | "explanation" | "success";
  delay: number;
  children: ReactNode;
};

export function ResponseSection({ title, icon: Icon, tone, delay, children }: ResponseSectionProps) {
  return (
    <section
      className={`${styles.responseSection} ${styles[tone]}`}
      style={{ "--section-delay": `${delay}ms` } as CSSProperties}
    >
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon} aria-hidden="true">
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <h3>{title}</h3>
      </header>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

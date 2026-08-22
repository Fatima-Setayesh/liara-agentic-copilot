import { ArrowUpRight, BookOpenCheck, FileSearch2, FolderTree } from "lucide-react";

import type { SourceItem } from "./source-experience-model";
import styles from "./sources-section.module.css";
import { getTextDirection } from "./text-direction";

type SourceDetailsPanelProps = {
  source: SourceItem;
};

export function SourceDetailsPanel({ source }: SourceDetailsPanelProps) {
  if (source.kind === "project-context") {
    const technologies = source.evidence.technologies ?? [];

    return (
      <section className={styles.sourceDetailsPanel} aria-label="Project context details" dir={getTextDirection(`${source.title} ${source.evidence.summary ?? ""}`)}>
        <header className={styles.detailsHeader}>
          <span aria-hidden="true"><FileSearch2 size={18} strokeWidth={1.8} /></span>
          <div>
            <small>{source.typeLabel}</small>
            <h4>{source.title}</h4>
          </div>
        </header>
        <p>{source.evidence.summary ?? "Project evidence supplied with this response."}</p>
        <dl className={styles.contextFacts}>
          <div>
            <dt><FolderTree size={13} aria-hidden="true" /> Files analyzed</dt>
            <dd>{source.evidence.files.length}</dd>
          </div>
          <div>
            <dt>Configuration reviewed</dt>
            <dd>{source.evidence.configurationReviewed ? "Yes" : "Not indicated"}</dd>
          </div>
        </dl>
        {technologies.length > 0 && (
          <div className={styles.technologyList} aria-label="Detected technologies">
            <small>Detected technologies</small>
            <div>{technologies.map((technology) => <span key={technology}>{technology}</span>)}</div>
          </div>
        )}
      </section>
    );
  }

  const { source: citationSource } = source.citation;

  return (
    <section className={styles.sourceDetailsPanel} aria-label={`${source.title} details`} dir={getTextDirection(`${source.title} ${citationSource.snippet ?? ""}`)}>
      <header className={styles.detailsHeader}>
        <span aria-hidden="true"><BookOpenCheck size={18} strokeWidth={1.8} /></span>
        <div>
          <small>{source.typeLabel}</small>
          <h4>{source.title}</h4>
        </div>
      </header>
      <p>{citationSource.snippet ?? "This official source was attached to the response by Liara's grounded retrieval flow."}</p>
      <dl className={styles.documentationFacts}>
        {citationSource.sectionHeading && <div><dt>Relevant section</dt><dd>{citationSource.sectionHeading}</dd></div>}
        {citationSource.documentationPath && <div><dt>Documentation path</dt><dd>{citationSource.documentationPath}</dd></div>}
        {citationSource.serviceCategory && <div><dt>Service</dt><dd>{citationSource.serviceCategory}</dd></div>}
      </dl>
      <a href={citationSource.url} target="_blank" rel="noreferrer">
        View full documentation
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    </section>
  );
}

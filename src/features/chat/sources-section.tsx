"use client";

import { ChevronDown, DatabaseZap, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState } from "react";

import type { Citation } from "@/contracts";

import { AnalyzedFilesList } from "./analyzed-files-list";
import { GroundingBadgeRow } from "./grounding-badge-row";
import { SourceCard } from "./source-card";
import { SourceDetailsPanel } from "./source-details-panel";
import { createSourceItems, type ProjectEvidence } from "./source-experience-model";
import styles from "./sources-section.module.css";

type SourcesSectionProps = {
  citations: Citation[];
  projectEvidence?: ProjectEvidence;
};

export function SourcesSection({ citations, projectEvidence }: SourcesSectionProps) {
  const contentId = useId();
  const sourceItems = useMemo(
    () => createSourceItems(citations, projectEvidence),
    [citations, projectEvidence],
  );
  const [expanded, setExpanded] = useState(sourceItems.length > 0);
  const [selectedSourceId, setSelectedSourceId] = useState(sourceItems[0]?.id);
  const selectedSource = sourceItems.find((source) => source.id === selectedSourceId) ?? sourceItems[0];
  const sourceLabel = `${sourceItems.length} ${sourceItems.length === 1 ? "source" : "sources"}`;

  return (
    <section className={styles.sourcesSection} aria-label="Sources and grounding">
      <button
        type="button"
        className={styles.sourcesToggle}
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        <span className={styles.sourcesTitleIcon} aria-hidden="true"><DatabaseZap size={17} strokeWidth={1.8} /></span>
        <span className={styles.sourcesTitle}>
          <strong>Sources</strong>
          <small>{sourceLabel} used for this response</small>
        </span>
        <span className={styles.sourceCount}>{sourceItems.length}</span>
        <ChevronDown className={styles.sourcesChevron} size={17} aria-hidden="true" />
      </button>

      <div
        className={styles.sourcesCollapse}
        data-open={expanded || undefined}
        id={contentId}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className={styles.sourcesCollapseInner}>
          <GroundingBadgeRow
            citations={citations}
            {...(projectEvidence ? { projectEvidence } : {})}
          />

          {sourceItems.length === 0 ? (
            <div className={styles.emptySources}>
              <span aria-hidden="true"><ShieldCheck size={18} strokeWidth={1.7} /></span>
              <div>
                <strong>No verified sources attached</strong>
                <p>This response does not claim documentation or project evidence that was not provided by the grounded chat stream.</p>
              </div>
            </div>
          ) : (
            <div className={styles.sourcesLayout} data-has-files={Boolean(projectEvidence?.files.length) || undefined}>
              <div className={styles.sourceCardList} aria-label="Available sources">
                {sourceItems.map((item) => (
                  <SourceCard
                    item={item}
                    selected={item.id === selectedSource?.id}
                    onSelect={() => setSelectedSourceId(item.id)}
                    key={item.id}
                  />
                ))}
              </div>
              {selectedSource && <SourceDetailsPanel source={selectedSource} key={selectedSource.id} />}
              {projectEvidence && projectEvidence.files.length > 0 && (
                <AnalyzedFilesList files={projectEvidence.files} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

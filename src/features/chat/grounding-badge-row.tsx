import { BadgeCheck, FileCheck2, Settings2, ShieldAlert } from "lucide-react";

import type { Citation } from "@/contracts";

import type { ProjectEvidence } from "./source-experience-model";
import styles from "./sources-section.module.css";

type GroundingBadgeRowProps = {
  citations: Citation[];
  projectEvidence?: ProjectEvidence;
};

export function GroundingBadgeRow({ citations, projectEvidence }: GroundingBadgeRowProps) {
  const hasOfficialSources = citations.length > 0;
  const hasProjectContext = Boolean(projectEvidence?.files.length);
  const hasConfigurationAnalysis = projectEvidence?.configurationReviewed === true;

  if (!hasOfficialSources && !hasProjectContext && !hasConfigurationAnalysis) {
    return (
      <div className={styles.groundingBadgeRow} aria-label="Grounding status">
        <span className={styles.pendingGroundingBadge}>
          <ShieldAlert size={13} aria-hidden="true" />
          No grounding data attached
        </span>
      </div>
    );
  }

  return (
    <div className={styles.groundingBadgeRow} aria-label="Answer grounding">
      {hasOfficialSources && (
        <span>
          <BadgeCheck size={13} aria-hidden="true" />
          Official documentation
        </span>
      )}
      {hasProjectContext && (
        <span>
          <FileCheck2 size={13} aria-hidden="true" />
          Project context
        </span>
      )}
      {hasConfigurationAnalysis && (
        <span>
          <Settings2 size={13} aria-hidden="true" />
          Configuration analysis
        </span>
      )}
    </div>
  );
}

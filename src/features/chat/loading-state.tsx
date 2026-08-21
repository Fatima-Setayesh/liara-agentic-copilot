import { AgentActivityTimeline } from "./agent-activity-timeline";
import { ResponseSkeleton } from "./response-skeleton";
import styles from "./streaming-states.module.css";

type LoadingStateProps = {
  activeStep: number;
  mode?: "preview" | "live";
};

export function LoadingState({ activeStep, mode = "live" }: LoadingStateProps) {
  return (
    <div className={styles.loadingGrid} data-testid="liara-loading-state">
      <ResponseSkeleton mode={mode} />
      <AgentActivityTimeline activeStep={activeStep} mode={mode} />
    </div>
  );
}

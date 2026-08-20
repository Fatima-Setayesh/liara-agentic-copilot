import { AgentActivityTimeline } from "./agent-activity-timeline";
import { ResponseSkeleton } from "./response-skeleton";
import styles from "./streaming-states.module.css";

type LoadingStateProps = {
  activeStep: number;
};

export function LoadingState({ activeStep }: LoadingStateProps) {
  return (
    <div className={styles.loadingGrid} data-testid="liara-loading-state">
      <ResponseSkeleton />
      <AgentActivityTimeline activeStep={activeStep} />
    </div>
  );
}

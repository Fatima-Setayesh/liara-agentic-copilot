import { Activity, Check, Circle, LoaderCircle, Radio, TriangleAlert } from "lucide-react";

import type { AgentState } from "@/contracts";

import { getAgentStatusSteps } from "./ai-response-model";
import styles from "./ai-response-card.module.css";

type AgentStatusProps = {
  agentState?: AgentState;
  headingId: string;
};

function StatusIcon({ state }: { state: ReturnType<typeof getAgentStatusSteps>[number]["state"] }) {
  if (state === "complete") return <Check size={14} />;
  if (state === "working") return <LoaderCircle size={14} />;
  if (state === "waiting") return <Radio size={14} />;
  if (state === "failed") return <TriangleAlert size={14} />;
  return <Circle size={13} />;
}

export function AgentStatus({ agentState, headingId }: AgentStatusProps) {
  const steps = getAgentStatusSteps(agentState);

  return (
    <aside className={styles.agentStatus} aria-labelledby={headingId} aria-live="polite">
      <header>
        <Activity size={17} aria-hidden="true" />
        <h3 id={headingId}>Workflow status</h3>
      </header>
      <ol className={styles.statusList}>
        {steps.map((step) => (
          <li data-state={step.state} key={step.label}>
            <span className={styles.statusMarker} aria-hidden="true">
              <StatusIcon state={step.state} />
            </span>
            <span className={styles.statusCopy}>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

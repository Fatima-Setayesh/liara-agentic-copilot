import { Check, Circle, LoaderCircle, RadioTower } from "lucide-react";

import styles from "./streaming-states.module.css";

type AgentActivityTimelineProps = {
  activeStep: number;
  mode?: "preview" | "live";
};

const activitySteps = [
  {
    label: "Understanding your request",
    detail: "Identifying intent and constraints",
  },
  {
    label: "Reviewing available context",
    detail: "Checking the conversation and project details",
  },
  {
    label: "Checking official sources",
    detail: "Looking for authoritative Liara guidance",
  },
  {
    label: "Preparing a grounded response",
    detail: "Structuring the recommendation",
  },
] as const;

const previewSteps = [
  { label: "Validating request input", detail: "Applying the frontend request boundary" },
  { label: "Preparing interface preview", detail: "Using safe local presentation data" },
  { label: "Checking grounding boundaries", detail: "Keeping sources empty without backend evidence" },
  { label: "Rendering preview response", detail: "No external action is performed" },
] as const;

export function AgentActivityTimeline({ activeStep, mode = "live" }: AgentActivityTimelineProps) {
  const steps = mode === "preview" ? previewSteps : activitySteps;
  const currentStep = activeStep >= 0 ? steps[Math.min(activeStep, steps.length - 1)] : undefined;

  return (
    <aside className={styles.activityTimeline} aria-label="Liara activity" aria-live="polite">
      <header className={styles.activityHeader}>
        <span className={styles.activityHeaderIcon} aria-hidden="true">
          <RadioTower size={16} strokeWidth={1.8} />
        </span>
        <span>
          <strong>Agent activity</strong>
          <small>{activeStep < 0 ? "Waiting for a verified activity event" : activeStep >= steps.length ? "Context ready" : currentStep?.detail}</small>
        </span>
      </header>

      <ol className={styles.activityList}>
        {steps.map((step, index) => {
          const state = index < activeStep ? "complete" : index === activeStep ? "active" : "pending";

          return (
            <li data-state={state} key={step.label}>
              <span className={styles.activityMarker} aria-hidden="true">
                {state === "complete" ? (
                  <Check size={13} strokeWidth={2.2} />
                ) : state === "active" ? (
                  <LoaderCircle size={13} strokeWidth={1.9} />
                ) : (
                  <Circle size={11} strokeWidth={1.7} />
                )}
              </span>
              <span className={styles.activityCopy}>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

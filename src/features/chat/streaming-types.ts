export type ResponsePhase = "loading" | "streaming" | "complete";

export type ResponseLifecycle = {
  phase: ResponsePhase;
  progress: number;
  activeStep: number;
};

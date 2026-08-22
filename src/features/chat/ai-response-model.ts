import type { AgentState, ChatOutcomeStatus } from "@/contracts";

import type { CodeLine } from "./professional-code-block";

export type AiResponseCodeExample = {
  fileName: string;
  language: string;
  lines: CodeLine[];
  note?: string;
};

export type AiResponsePresentation = {
  analysis: string;
  problemDetected: string;
  whyThisHappens: string;
  recommendedFix: string;
  codeExample?: AiResponseCodeExample;
};

export type AgentStatusStep = {
  label: string;
  detail: string;
  state: "complete" | "working" | "waiting" | "pending" | "failed";
};

function requestLines(prompt: string): CodeLine[] {
  const serializedPrompt = JSON.stringify(prompt);

  return [
    { tokens: [{ text: "{", tone: "punctuation" }] },
    {
      tokens: [
        { text: '  "version"', tone: "property" },
        { text: ": ", tone: "punctuation" },
        { text: '"1"', tone: "string" },
        { text: ",", tone: "punctuation" },
      ],
    },
    {
      important: true,
      tokens: [
        { text: '  "message"', tone: "property" },
        { text: ": ", tone: "punctuation" },
        { text: serializedPrompt, tone: "string" },
        { text: ",", tone: "punctuation" },
      ],
    },
    {
      tokens: [
        { text: '  "userContext"', tone: "property" },
        { text: ": {", tone: "punctuation" },
      ],
    },
    {
      important: true,
      tokens: [
        { text: '    "answerDepth"', tone: "property" },
        { text: ": ", tone: "punctuation" },
        { text: '"detailed"', tone: "string" },
      ],
    },
    { tokens: [{ text: "  }", tone: "punctuation" }] },
    { tokens: [{ text: "}", tone: "punctuation" }] },
  ];
}

export function createPendingPresentation(prompt: string): AiResponsePresentation {
  return {
    analysis:
      "Your request has been captured and the response surface is ready for a structured, developer-focused answer.",
    problemDetected:
      "The chat service has not returned a verified answer payload or project evidence for this message yet.",
    whyThisHappens:
      "Liara-specific guidance must be backed by official documentation and typed stream data. The interface will not invent a diagnosis while that evidence is unavailable.",
    recommendedFix:
      "Send this versioned request through the grounded chat stream, then render its verified answer, activity events, suggestions, and citations in this presentation.",
    codeExample: {
      fileName: "chat-request.json",
      language: "JSON",
      lines: requestLines(prompt),
      note: "This preview mirrors the existing request boundary and contains no fabricated Liara configuration.",
    },
  };
}

function codeToText(lines: CodeLine[]): string {
  return lines
    .map((line) => line.tokens.map((token) => token.text).join(""))
    .join("\n");
}

export function formatPresentationCopy(presentation: AiResponsePresentation): string {
  const sections = [
    `Analysis\n${presentation.analysis}`,
    `Problem detected\n${presentation.problemDetected}`,
    `Why this happens\n${presentation.whyThisHappens}`,
    `Recommended fix\n${presentation.recommendedFix}`,
  ];

  if (presentation.codeExample) {
    sections.push(
      `${presentation.codeExample.fileName} (${presentation.codeExample.language})\n${codeToText(presentation.codeExample.lines)}`,
    );
  }

  return sections.join("\n\n");
}

const pendingSteps: AgentStatusStep[] = [
  { label: "Waiting for chat service", detail: "No activity event received", state: "waiting" },
  { label: "Searching official Liara sources", detail: "Pending", state: "pending" },
  { label: "Preparing grounded answer", detail: "Pending", state: "pending" },
  { label: "Response ready", detail: "Pending", state: "pending" },
];

export function getAgentStatusSteps(
  agentState?: AgentState,
  outcomeStatus?: ChatOutcomeStatus,
): AgentStatusStep[] {
  if (agentState === "clarification_required") {
    return [
      { label: "Understanding your request", detail: "Completed", state: "complete" },
      { label: "Clarification needed", detail: "Waiting for your input", state: "waiting" },
      { label: "Searching official Liara sources", detail: "Not started", state: "pending" },
      { label: "Response ready", detail: "Pending", state: "pending" },
    ];
  }

  if (outcomeStatus === "completed") {
    return [
      { label: "Understanding your request", detail: "Completed", state: "complete" },
      { label: "Searching official Liara sources", detail: "Completed", state: "complete" },
      { label: "Preparing grounded answer", detail: "Completed", state: "complete" },
      { label: "Response ready", detail: "Completed", state: "complete" },
    ];
  }

  if (outcomeStatus === "failed") {
    return [
      { label: "Request processing", detail: "Stopped safely", state: "failed" },
      { label: "Searching official Liara sources", detail: "Not completed", state: "pending" },
      { label: "Preparing grounded answer", detail: "Not completed", state: "pending" },
      { label: "Retry available", detail: "Choose an action below", state: "waiting" },
    ];
  }

  if (outcomeStatus === "cancelled") {
    return [
      { label: "Request processing", detail: "Cancelled", state: "waiting" },
      { label: "Searching official Liara sources", detail: "Stopped", state: "pending" },
      { label: "Preparing grounded answer", detail: "Stopped", state: "pending" },
      { label: "Response ready", detail: "Not generated", state: "pending" },
    ];
  }

  switch (agentState) {
    case "understanding":
      return [
        { label: "Understanding your request", detail: "In progress", state: "working" },
        { label: "Searching official Liara sources", detail: "Pending", state: "pending" },
        { label: "Preparing grounded answer", detail: "Pending", state: "pending" },
        { label: "Response ready", detail: "Pending", state: "pending" },
      ];
    case "clarification_required":
      return pendingSteps;
    case "retrieving":
      return [
        { label: "Understanding your request", detail: "Completed", state: "complete" },
        { label: "Searching official Liara sources", detail: "In progress", state: "working" },
        { label: "Preparing grounded answer", detail: "Pending", state: "pending" },
        { label: "Response ready", detail: "Pending", state: "pending" },
      ];
    case "generating":
      return [
        { label: "Understanding your request", detail: "Completed", state: "complete" },
        { label: "Searching official Liara sources", detail: "Completed", state: "complete" },
        { label: "Preparing grounded answer", detail: "In progress", state: "working" },
        { label: "Response ready", detail: "Pending", state: "pending" },
      ];
    default:
      return pendingSteps;
  }
}

import type { DataUIPart, UIMessage } from "ai";
import { z } from "zod";

import {
  AGENT_STATES,
  CHAT_CONTRACT_VERSION,
  CHAT_ERROR_CODES,
  CHAT_OUTCOME_STATUSES,
  EVIDENCE_STATUSES,
} from "./constants";

const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Must be an opaque identifier");

function isOfficialLiaraUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return false;
    }

    if (url.hostname === "docs.liara.ir") {
      return true;
    }

    return (
      url.hostname === "github.com" &&
      (url.pathname === "/liara-cloud/docs" ||
        url.pathname.startsWith("/liara-cloud/docs/"))
    );
  } catch {
    return false;
  }
}

export const liaraSourceSchema = z.strictObject({
  id: opaqueIdSchema,
  title: z.string().trim().min(1).max(200),
  url: z
    .string()
    .url()
    .refine(isOfficialLiaraUrl, "Must be an allowlisted official Liara URL"),
  sectionHeading: z.string().trim().min(1).max(200).optional(),
  documentationPath: z.string().trim().min(1).max(500).optional(),
  snippet: z.string().trim().min(1).max(1_000).optional(),
  serviceCategory: z.string().trim().min(1).max(80).optional(),
});

export const citationSchema = z.strictObject({
  id: opaqueIdSchema,
  displayIndex: z.number().int().positive().max(99),
  source: liaraSourceSchema,
});

export const suggestionSchema = z.strictObject({
  id: opaqueIdSchema,
  label: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(1_000),
});

export const suggestionsPayloadSchema = z.strictObject({
  items: z.array(suggestionSchema).max(4),
});

export const agentStateSchema = z.enum(AGENT_STATES);

export const agentStateEventSchema = z.strictObject({
  state: agentStateSchema,
});

export const evidenceStatusSchema = z.enum(EVIDENCE_STATUSES);

export const chatOutcomeStatusSchema = z.enum(CHAT_OUTCOME_STATUSES);

export const chatOutcomeSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("completed"),
    evidenceStatus: evidenceStatusSchema,
  }),
  z.strictObject({
    status: z.literal("cancelled"),
  }),
  z.strictObject({
    status: z.literal("failed"),
  }),
]);

export const chatErrorCodeSchema = z.enum(CHAT_ERROR_CODES);

export const chatErrorSchema = z.strictObject({
  code: chatErrorCodeSchema,
  message: z.string().trim().min(1).max(500),
  requestId: opaqueIdSchema,
  retryable: z.boolean(),
});

export const chatErrorResponseSchema = z.strictObject({
  version: z.literal(CHAT_CONTRACT_VERSION),
  error: chatErrorSchema,
});

export const chatMessageMetadataSchema = z.strictObject({
  contractVersion: z.literal(CHAT_CONTRACT_VERSION),
  requestId: opaqueIdSchema,
  conversationId: opaqueIdSchema,
});

export type LiaraSource = z.infer<typeof liaraSourceSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestionsPayload = z.infer<typeof suggestionsPayloadSchema>;
export type AgentState = z.infer<typeof agentStateSchema>;
export type AgentStateEvent = z.infer<typeof agentStateEventSchema>;
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;
export type ChatOutcomeStatus = z.infer<typeof chatOutcomeStatusSchema>;
export type ChatOutcome = z.infer<typeof chatOutcomeSchema>;
export type ChatErrorCode = z.infer<typeof chatErrorCodeSchema>;
export type ChatError = z.infer<typeof chatErrorSchema>;
export type ChatErrorResponse = z.infer<typeof chatErrorResponseSchema>;
export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;

export type ChatDataParts = {
  citation: Citation;
  suggestions: SuggestionsPayload;
  "agent-state": AgentStateEvent;
  outcome: ChatOutcome;
  error: ChatError;
};

export type ChatDataPart = DataUIPart<ChatDataParts>;
export type ChatUIMessage = UIMessage<ChatMessageMetadata, ChatDataParts>;

import { z } from "zod";

import { CHAT_CONTRACT_VERSION, MAX_CHAT_MESSAGE_CHARACTERS } from "./constants";

const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "Must be an opaque identifier");

export const recentConversationMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

export const recentConversationContextSchema = z.array(recentConversationMessageSchema)
  .max(6)
  .refine(
    (messages) => messages.reduce((total, message) => total + message.content.length, 0) <= 6_000,
    "Recent conversation context exceeds its character budget",
  );

export const userContextSchema = z.strictObject({
  framework: z.string().trim().min(1).max(80).optional(),
  runtime: z.string().trim().min(1).max(80).optional(),
  liaraService: z.string().trim().min(1).max(80).optional(),
  projectDescription: z.string().trim().min(1).max(1_200).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  answerDepth: z.enum(["concise", "balanced", "detailed"]).optional(),
  preferredLanguage: z.string().trim().min(2).max(35).optional(),
});

export const chatRequestSchema = z.strictObject({
  version: z.literal(CHAT_CONTRACT_VERSION),
  conversationId: opaqueIdSchema.optional(),
  clientRequestId: opaqueIdSchema.optional(),
  message: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_CHARACTERS),
  recentContext: recentConversationContextSchema.optional(),
  userContext: userContextSchema.optional(),
});

export type UserContext = z.infer<typeof userContextSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type RecentConversationMessage = z.infer<typeof recentConversationMessageSchema>;

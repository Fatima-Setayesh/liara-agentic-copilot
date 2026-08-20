export const CHAT_CONTRACT_VERSION = "1" as const;

export const CHAT_API_PATH = "/api/chat" as const;

export const CHAT_STREAM_PROTOCOL = "ai-sdk-ui-message-stream-v1" as const;

export const MAX_CHAT_MESSAGE_CHARACTERS = 8_000;

export const AGENT_STATES = [
  "understanding",
  "clarification_required",
  "retrieving",
  "generating",
  "completed",
  "failed",
] as const;

export const CHAT_ERROR_CODES = [
  "RATE_LIMITED",
  "INVALID_INPUT",
  "RETRIEVAL_FAILED",
  "MODEL_UNAVAILABLE",
  "STREAM_INTERRUPTED",
  "INTERNAL_ERROR",
] as const;

import type { ChatErrorCode, ChatOutcomeStatus } from "@/contracts";

export type ChatLogEvent =
  | {
      readonly event: "chat_request_started";
      readonly requestId: string;
    }
  | {
      readonly event:
        | "chat_request_completed"
        | "chat_request_failed"
        | "chat_request_cancelled";
      readonly requestId: string;
      readonly durationMs: number;
      readonly outcome: ChatOutcomeStatus;
      readonly errorCode?: ChatErrorCode;
    };

export interface ChatLogger {
  write(event: ChatLogEvent): void;
}

function structuredRecord(event: ChatLogEvent): Record<string, unknown> {
  return {
    component: "chat",
    timestamp: new Date().toISOString(),
    ...event,
  };
}

export const consoleChatLogger: ChatLogger = Object.freeze({
  write(event: ChatLogEvent): void {
    const record = structuredRecord(event);
    if (event.event === "chat_request_failed") {
      console.error(record);
      return;
    }
    console.info(record);
  },
});

export function writeChatLog(logger: ChatLogger, event: ChatLogEvent): void {
  try {
    logger.write(event);
  } catch {
    // Logging must never break or alter the response lifecycle.
  }
}

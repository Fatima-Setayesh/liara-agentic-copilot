import {
  chatRequestSchema,
  chatErrorResponseSchema,
  CHAT_CONTRACT_VERSION,
  type ChatError,
  type ChatErrorResponse,
  type ChatMessageMetadata,
  type ChatRequest,
  type RecentConversationMessage,
  type UserContext,
} from "../../contracts";

export class LiaraChatClientError extends Error {
  readonly details: ChatError;

  constructor(details: ChatError) {
    super(details.message);
    this.name = "LiaraChatClientError";
    this.details = details;
  }
}

async function readStructuredError(response: Response): Promise<ChatErrorResponse | null> {
  try {
    const result = chatErrorResponseSchema.safeParse(await response.clone().json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function liaraChatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, init);
  if (response.ok) return response;

  const structuredError = await readStructuredError(response);
  if (structuredError) throw new LiaraChatClientError(structuredError.error);
  return response;
}

export function toSafeChatError(error: unknown, requestId: string): ChatError {
  if (error instanceof LiaraChatClientError) return error.details;

  return {
    code: "INTERNAL_ERROR",
    message: "Liara could not reach the grounded chat service. Check the connection and try again.",
    requestId,
    retryable: true,
  };
}

export function createChatRequestBody({
  message,
  metadata,
  userContext,
  recentContext,
}: {
  message: string;
  metadata: ChatMessageMetadata;
  userContext?: UserContext;
  recentContext?: RecentConversationMessage[];
}): ChatRequest {
  return chatRequestSchema.parse({
    version: CHAT_CONTRACT_VERSION,
    conversationId: metadata.conversationId,
    clientRequestId: metadata.requestId,
    message,
    ...(recentContext?.length ? { recentContext } : {}),
    userContext: userContext && Object.keys(userContext).length > 0 ? userContext : undefined,
  });
}

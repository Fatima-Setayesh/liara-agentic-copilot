"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  agentStateEventSchema,
  chatErrorSchema,
  chatMessageMetadataSchema,
  citationSchema,
  suggestionsPayloadSchema,
  CHAT_API_PATH,
  CHAT_CONTRACT_VERSION,
  type AgentState,
  type ChatError,
  type ChatMessageMetadata,
  type ChatUIMessage,
  type Citation,
  type Suggestion,
  type UserContext,
} from "@/contracts";
import type { ConnectionMode } from "@/features/settings/copilot-preferences-model";

import type { ChatEntry } from "./chat-workspace";
import { createChatRequestBody, liaraChatFetch, toSafeChatError } from "./liara-chat-client";
import { useStreamingConversation } from "./use-streaming-conversation";

type LiveEntryState = {
  agentState?: AgentState;
  error?: ChatError;
  cancelled?: boolean;
};

function getMessageText(message: ChatUIMessage | undefined) {
  return message?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("") ?? "";
}

function getAssistantData(message: ChatUIMessage | undefined) {
  const citations: Citation[] = [];
  const suggestions: Suggestion[] = [];
  let agentState: AgentState | undefined;
  let error: ChatError | undefined;

  message?.parts.forEach((part) => {
    if (part.type === "data-citation") citations.push(part.data);
    if (part.type === "data-suggestions") suggestions.splice(0, suggestions.length, ...part.data.items);
    if (part.type === "data-agent-state") agentState = part.data.state;
    if (part.type === "data-error") error = part.data;
  });

  return {
    citations: citations.filter((citation, index) => citations.findIndex((item) => item.id === citation.id) === index),
    suggestions,
    agentState,
    error,
  };
}

function getActiveStep(agentState?: AgentState) {
  switch (agentState) {
    case "retrieving": return 2;
    case "generating": return 3;
    case "completed": return 4;
    case "clarification_required": return 1;
    case "understanding": return 0;
    default: return -1;
  }
}

export function useLiaraConversation({
  mode,
  userContext,
}: {
  mode: ConnectionMode;
  userContext: UserContext;
}) {
  const preview = useStreamingConversation();
  const latestUserIdRef = useRef<string | null>(null);
  const latestRequestIdRef = useRef<string>(`request-${crypto.randomUUID()}`);
  const [activeLiveMessageId, setActiveLiveMessageId] = useState<string | null>(null);
  const [sentAtByMessage, setSentAtByMessage] = useState<Record<string, string>>({});
  const [liveEntryState, setLiveEntryState] = useState<Record<string, LiveEntryState>>({});

  const transport = useMemo(() => new DefaultChatTransport<ChatUIMessage>({
    api: CHAT_API_PATH,
    fetch: liaraChatFetch,
    prepareSendMessagesRequest: ({ messages, body }) => {
      const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
      const metadata = latestUserMessage?.metadata;
      const prompt = getMessageText(latestUserMessage);
      const requestedContext = (body as { userContext?: UserContext } | undefined)?.userContext;
      if (!metadata) throw new Error("A validated chat request requires message metadata.");
      const request = createChatRequestBody({ message: prompt, metadata, userContext: requestedContext });

      return {
        body: request,
        headers: { Accept: "text/event-stream" },
        credentials: "same-origin",
      };
    },
  }), []);

  const live = useChat<ChatUIMessage>({
    transport,
    throttle: 50,
    messageMetadataSchema: chatMessageMetadataSchema,
    dataPartSchemas: {
      citation: citationSchema,
      suggestions: suggestionsPayloadSchema,
      "agent-state": agentStateEventSchema,
      error: chatErrorSchema,
    },
    onData: (part) => {
      const messageId = latestUserIdRef.current;
      if (!messageId) return;
      setLiveEntryState((current) => {
        const previous = current[messageId] ?? {};
        if (part.type === "data-agent-state") {
          return { ...current, [messageId]: { ...previous, agentState: part.data.state } };
        }
        if (part.type === "data-error") {
          return { ...current, [messageId]: { ...previous, agentState: "failed", error: part.data } };
        }
        return current;
      });
    },
    onFinish: ({ isAbort, isDisconnect, isError }) => {
      const messageId = latestUserIdRef.current;
      if (!messageId) return;
      setLiveEntryState((current) => {
        const previous = current[messageId] ?? {};
        if (isAbort) return { ...current, [messageId]: { ...previous, cancelled: true } };
        if (isDisconnect || isError) {
          return {
            ...current,
            [messageId]: {
              ...previous,
              agentState: "failed",
              error: previous.error ?? toSafeChatError(undefined, latestRequestIdRef.current),
            },
          };
        }
        return { ...current, [messageId]: { ...previous, agentState: "completed" } };
      });
    },
    onError: (error) => {
      const messageId = latestUserIdRef.current;
      if (!messageId) return;
      setLiveEntryState((current) => ({
        ...current,
        [messageId]: {
          ...current[messageId],
          agentState: "failed",
          error: toSafeChatError(error, latestRequestIdRef.current),
        },
      }));
    },
  });

  const liveEntries = useMemo(() => {
    const entries: ChatEntry[] = [];

    live.messages.forEach((message, index) => {
      if (message.role !== "user") return;
      const nextMessages = live.messages.slice(index + 1);
      const nextUserIndex = nextMessages.findIndex((candidate) => candidate.role === "user");
      const messageWindow = nextUserIndex === -1 ? nextMessages : nextMessages.slice(0, nextUserIndex);
      const assistantMessage = messageWindow.find((candidate) => candidate.role === "assistant");
      const data = getAssistantData(assistantMessage);
      const localState = liveEntryState[message.id] ?? {};
      const isLatest = message.id === activeLiveMessageId;
      const submitted = isLatest && live.status === "submitted";
      const streaming = isLatest && live.status === "streaming";
      const agentState = data.agentState ?? localState.agentState;

      entries.push({
        id: message.id,
        prompt: getMessageText(message),
        sentAt: sentAtByMessage[message.id] ?? new Date().toISOString(),
        liveText: assistantMessage ? getMessageText(assistantMessage) : undefined,
        agentState,
        citations: data.citations,
        suggestions: data.suggestions,
        error: data.error ?? localState.error,
        cancelled: localState.cancelled,
        transportMode: "live",
        lifecycle: {
          phase: submitted ? "loading" : streaming ? "streaming" : "complete",
          progress: streaming ? .5 : submitted ? 0 : 1,
          activeStep: getActiveStep(agentState),
        },
      });
    });

    return entries;
  }, [activeLiveMessageId, live.messages, live.status, liveEntryState, sentAtByMessage]);

  const addChatEntry = useCallback((prompt: string, conversationId: string) => {
    if (mode === "preview") {
      preview.addChatEntry(prompt);
      return;
    }

    const messageId = `user-${crypto.randomUUID()}`;
    const requestId = `request-${crypto.randomUUID()}`;
    const metadata: ChatMessageMetadata = {
      contractVersion: CHAT_CONTRACT_VERSION,
      requestId,
      conversationId,
    };
    latestUserIdRef.current = messageId;
    setActiveLiveMessageId(messageId);
    latestRequestIdRef.current = requestId;
    setSentAtByMessage((current) => ({ ...current, [messageId]: new Date().toISOString() }));
    setLiveEntryState((current) => ({ ...current, [messageId]: {} }));
    live.clearError();
    void live.sendMessage({ id: messageId, role: "user", parts: [{ type: "text", text: prompt }], metadata }, { body: { userContext } });
  }, [live, mode, preview, userContext]);

  const retryEntry = useCallback((entryId: string) => {
    if (mode === "preview") {
      const entry = preview.chatEntries.find((candidate) => candidate.id === entryId);
      if (entry) preview.addChatEntry(entry.prompt);
      return;
    }

    latestUserIdRef.current = entryId;
    setActiveLiveMessageId(entryId);
    const requestId = `request-${crypto.randomUUID()}`;
    latestRequestIdRef.current = requestId;
    live.setMessages((messages) => messages.map((message) => (
      message.id === entryId && message.role === "user" && message.metadata
        ? { ...message, metadata: { ...message.metadata, requestId } }
        : message
    )));
    setLiveEntryState((current) => ({ ...current, [entryId]: {} }));
    live.clearError();
    void live.regenerate({ messageId: entryId, body: { userContext } });
  }, [live, mode, preview, userContext]);

  const cancelGeneration = useCallback(() => {
    if (mode === "preview") preview.cancelGeneration();
    else {
      live.stop();
      const messageId = latestUserIdRef.current;
      if (messageId) setLiveEntryState((current) => ({ ...current, [messageId]: { ...current[messageId], cancelled: true } }));
    }
  }, [live, mode, preview]);

  const resetConversation = useCallback(() => {
    preview.resetConversation();
    live.stop();
    live.clearError();
    live.setMessages([]);
    latestUserIdRef.current = null;
    setActiveLiveMessageId(null);
    setSentAtByMessage({});
    setLiveEntryState({});
  }, [live, preview]);

  const chatEntries = mode === "preview" ? preview.chatEntries : liveEntries;
  const busy = mode === "preview"
    ? preview.busy
    : live.status === "submitted" || live.status === "streaming";

  return {
    chatEntries,
    busy,
    addChatEntry,
    retryEntry,
    cancelGeneration,
    resetConversation,
  };
}

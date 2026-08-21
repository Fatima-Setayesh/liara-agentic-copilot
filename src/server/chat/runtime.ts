import {
  createAIProvider,
  loadAIConfig,
} from "@/server/ai";
import {
  createGroundedChatService,
  type GroundedChatService,
} from "@/server/agent";
import {
  getRuntimeRetriever,
  loadRuntimeRetrievalConfig,
} from "@/server/retrieval";

let service: GroundedChatService | null = null;

export function getRuntimeGroundedChatService(): GroundedChatService {
  if (service !== null) {
    return service;
  }

  const aiConfig = loadAIConfig();
  const retrievalConfig = loadRuntimeRetrievalConfig();
  const aiProvider = createAIProvider(aiConfig);

  service = createGroundedChatService({
    aiConfig,
    aiProvider,
    getRetriever: () => getRuntimeRetriever(retrievalConfig),
  });

  return service;
}

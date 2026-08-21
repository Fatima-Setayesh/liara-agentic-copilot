import { scheduler } from "node:timers/promises";

import { createLexicalRanker } from "./rank";
import type {
  DocumentationChunk,
  RetrievalOutcome,
  RetrievalOptions,
  RetrievalQuery,
  Retriever,
} from "./types";

const EMPTY_MATCHES: readonly [] = Object.freeze([]);

/**
 * Creates a provider-neutral retriever whose index is built once and reused for
 * each request. The caller remains responsible for refreshing the corpus.
 */
export function createInMemoryLexicalRetriever(
  chunks: readonly DocumentationChunk[],
): Retriever {
  const ranker = createLexicalRanker(chunks);
  const retriever: Retriever = {
    async retrieve(
      query: RetrievalQuery,
      options: RetrievalOptions,
    ): Promise<RetrievalOutcome> {
      options.signal?.throwIfAborted();
      if (options.signal !== null) {
        await scheduler.yield();
        options.signal.throwIfAborted();
      }
      const result = ranker.rank(query, options.signal);

      if (result.matches.length === 0) {
        return Object.freeze({
          kind: "no_matches",
          matches: EMPTY_MATCHES,
          consideredChunkCount: result.consideredChunkCount,
        });
      }

      return Object.freeze({
        kind: "matches",
        matches: result.matches,
        consideredChunkCount: result.consideredChunkCount,
      });
    },
  };

  return Object.freeze(retriever);
}

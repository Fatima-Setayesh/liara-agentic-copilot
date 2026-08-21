import type { LanguageModel } from "ai";

export interface AIProvider {
  readonly providerId: "avalai";
  readonly modelId: string;
  readonly model: LanguageModel;
}

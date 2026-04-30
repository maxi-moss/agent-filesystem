import type { LanguageModel, ToolSet } from "ai";

export interface Agent {
  readonly name: string;
  readonly model: LanguageModel;
  readonly maxSteps: number;
  readonly namespaces: readonly string[];
  readonly tools: ToolSet;
  buildSystem(): string;
}

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  DB_PATH: z.string().default("./memory-store.db"),
  GNEWS_API_KEY: z.string().min(1).optional(),
  MAIN_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(10),
  MAIN_AGENT_MODEL: z.string().default("gpt-4.1-mini"),
  MEMORY_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(15),
  MEMORY_AGENT_MODEL: z.string().default("gpt-4.1-mini"),
  NEWS_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(20),
  NEWS_AGENT_MODEL: z.string().default("gpt-4.1-mini"),
  NEWS_HEADLINES_MAX: z.coerce.number().int().positive().default(10),
  NEWS_SEARCH_MAX: z.coerce.number().int().positive().default(10),
  OPENAI_API_KEY: z.string().min(1).optional(),
  SUMMARIZER_MODEL: z.string().default("gpt-4.1-mini"),
  SUMMARY_DIR: z.string().default("/summaries")
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", z.treeifyError(parsed.error));
  process.exit(1);
}
const env = parsed.data;

const openai = createOpenAI({
  ...(env.OPENAI_API_KEY && { apiKey: env.OPENAI_API_KEY }),
});

export const apiKeyConfig = {
  anthropic: env.ANTHROPIC_API_KEY,
  openai: env.OPENAI_API_KEY
} as const;

export const dbConfig = {
  path: env.DB_PATH,
} as const;

export const mainAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.MAIN_AGENT_MODEL),
  maxSteps: env.MAIN_AGENT_MAX_STEPS,
};

export const memoryAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.MEMORY_AGENT_MODEL),
  maxSteps: env.MEMORY_AGENT_MAX_STEPS,
};

export const newsAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.NEWS_AGENT_MODEL),
  maxSteps: env.NEWS_AGENT_MAX_STEPS,
};

export const summarizerConfig: { model: LanguageModel; dir: string } = {
  model: openai(env.SUMMARIZER_MODEL),
  dir: env.SUMMARY_DIR,
};

export const newsConfig = {
  apiKey: env.GNEWS_API_KEY,
  searchMax: env.NEWS_SEARCH_MAX,
  headlinesMax: env.NEWS_HEADLINES_MAX,
} as const;

const agentNamespaces = {
  "main-agent": ["/global/", "/memories/", "/news/", "/notes/", "/summaries/"],
  "memory-agent": ["/memories/", "/news/"],
  "news-agent": ["/news/"],
} as const satisfies Record<string, readonly string[]>;

export type AgentName = keyof typeof agentNamespaces;

export const namespacesFor = (agent: AgentName): readonly string[] =>
  agentNamespaces[agent];

/**
 * Permission table indexed by access-scope name. "all" is a synthetic scope
 * (union of every agent's namespaces) used by the file-browser UI; every
 * other key is an agent name.
 */
export const accessScopes: Record<string, readonly string[]> = {
  ...agentNamespaces,
  all: [...new Set(Object.values(agentNamespaces).flat())].sort(),
};
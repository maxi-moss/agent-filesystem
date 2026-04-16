import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  DB_PATH: z.string().default("./memory-store.db"),
  MAIN_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(10),
  MAIN_AGENT_MODEL: z.string().default("gpt-4.1-mini"),
  MEMORY_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(15),
  MEMORY_AGENT_MODEL: z.string().default("gpt-4.1-mini"),
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

export const summarizerConfig: { model: LanguageModel; dir: string } = {
  model: openai(env.SUMMARIZER_MODEL),
  dir: env.SUMMARY_DIR,
};

/**
 * Namespaces each agent is allowed to see. When an agent calls a discovery
 * tool (e.g. `ls`), output is filtered to only include files under these
 * namespaces. Agents not listed here have no access.
 */
export const agentAccess: Record<string, readonly string[]> = {
  "all": ["/global/", "/memories/", "/news/", "/notes/", "/summaries/"],
  "main-agent": ["/global/", "/memories/", "/news/", "/notes/", "/summaries/"],
  "memory-agent": ["/memories/", "/news/"],
};
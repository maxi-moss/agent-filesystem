import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  DB_PATH: z.string().default("./memory-store.db"),
  GNEWS_API_KEY: z.string().min(1),
  JIRA_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(15),
  JIRA_AGENT_MODEL: z.string().default("gpt-5-nano"),
  JIRA_API_TOKEN: z.string().min(1).optional(),
  JIRA_ASSIGNEE_ACCOUNT_ID: z.string().min(1).optional(),
  JIRA_BASE_URL: z.url().optional(),
  JIRA_EMAIL: z.email().optional(),
  JIRA_WEBHOOK_SECRET: z.string().min(1).optional(),
  MAIN_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(10),
  MAIN_AGENT_MODEL: z.string().default("gpt-5-nano"),
  MEMORY_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(15),
  MEMORY_AGENT_MODEL: z.string().default("gpt-5-nano"),
  NEWS_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(20),
  NEWS_AGENT_MODEL: z.string().default("gpt-5-nano"),
  NEWS_HEADLINES_MAX: z.coerce.number().int().positive().default(10),
  NEWS_SEARCH_MAX: z.coerce.number().int().positive().default(10),
  OPENAI_API_KEY: z.string().min(1).optional(),
  RETRIEVAL_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(20),
  RETRIEVAL_AGENT_MODEL: z.string().default("gpt-5-mini"),
  SLACK_AGENT_MAX_STEPS: z.coerce.number().int().positive().default(20),
  SLACK_AGENT_MODEL: z.string().default("gpt-5-nano"),
  SLACK_BOT_TOKEN: z.string().min(1).optional(),
  SLACK_BOT_USER_ID: z.string().min(1).optional(),
  SLACK_SIGNING_SECRET: z.string().min(1).optional(),
  SUMMARIZER_MODEL: z.string().default("gpt-5-nano"),
  SUMMARY_DIR: z.string().default("/summaries"),
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
  openai: env.OPENAI_API_KEY,
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

export const jiraConfig = {
  apiToken: env.JIRA_API_TOKEN,
  assigneeAccountId: env.JIRA_ASSIGNEE_ACCOUNT_ID,
  baseUrl: env.JIRA_BASE_URL,
  email: env.JIRA_EMAIL,
  webhookSecret: env.JIRA_WEBHOOK_SECRET,
} as const;

export const jiraAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.JIRA_AGENT_MODEL),
  maxSteps: env.JIRA_AGENT_MAX_STEPS,
};

export const slackConfig = {
  signingSecret: env.SLACK_SIGNING_SECRET,
  botToken: env.SLACK_BOT_TOKEN,
  botUserId: env.SLACK_BOT_USER_ID,
} as const;

export const retrievalAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.RETRIEVAL_AGENT_MODEL),
  maxSteps: env.RETRIEVAL_AGENT_MAX_STEPS,
};

export const slackAgentConfig: { model: LanguageModel; maxSteps: number } = {
  model: openai(env.SLACK_AGENT_MODEL),
  maxSteps: env.SLACK_AGENT_MAX_STEPS,
};

export const scheduleFlags: Record<string, boolean> = {
  "news-daily": true,
};

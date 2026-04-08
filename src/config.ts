import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DB_PATH: z.string().default("./memory-store.db"),
  AGENT_MODEL: z.string().default("claude-sonnet-4-5"),
  AGENT_MAX_STEPS: z.coerce.number().int().positive().default(10),
  SUMMARIZER_MODEL: z.string().default("claude-sonnet-4-5"),
  SUMMARY_DIR: z.string().default("/summaries"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", z.treeifyError(parsed.error));
  process.exit(1);
}
const env = parsed.data;

export const dbConfig = {
  path: env.DB_PATH,
} as const;

export const agentConfig = {
  model: env.AGENT_MODEL,
  maxSteps: env.AGENT_MAX_STEPS,
} as const;

export const summarizerConfig = {
  model: env.SUMMARIZER_MODEL,
  dir: env.SUMMARY_DIR,
} as const;

import { newsAgentConfig, namespacesFor } from "../../lib/config.js";
import type { Agent } from "../../lib/agents/index.js";
import { runAgentInBackground } from "../../lib/agents/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import {
  buildGeneralDiscoveryPrompt,
  buildSystemPrompt,
  buildTopicDiscoveryPrompt,
} from "./prompts.js";
import { newsTools } from "./tools.js";

const AGENT_NAME = "news-agent";

export const newsAgent = {
  name: AGENT_NAME,
  model: newsAgentConfig.model,
  maxSteps: newsAgentConfig.maxSteps,
  namespaces: namespacesFor(AGENT_NAME),
  tools: newsTools,
  buildSystem: () =>
    buildSystemPrompt(buildFiletree(AGENT_NAME), todayIso()),
} satisfies Agent;

/**
 * Run the news agent in daily-discovery mode: surface the day's most important
 * stories across all categories and persist them to /news/. Intended for
 * scheduled or general runs (e.g. once per morning).
 */
export function runNewsAgentForDaily(): void {
  runAgentInBackground(newsAgent, [
    { role: "user", content: buildGeneralDiscoveryPrompt() },
  ]);
}

/**
 * Run the news agent in topic-discovery mode: surface today's most important
 * stories about `topic` and persist them to /news/. Intended for ad-hoc,
 * subject-specific runs (e.g. "OpenAI", "EU AI Act").
 */
export function runNewsAgentForTopic(topic: string): void {
  runAgentInBackground(newsAgent, [
    { role: "user", content: buildTopicDiscoveryPrompt(topic) },
  ]);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

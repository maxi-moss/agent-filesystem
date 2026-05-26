import { retrievalAgentConfig } from "../../lib/config.js";
import { resolveAgentAccess } from "../../lib/filesystem/namespaces.js";
import type { Agent } from "../../lib/agents/index.js";
import { runAgentToCompletion } from "../../lib/agents/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import { buildSystemPrompt } from "./prompts.js";
import { retrievalTools } from "./tools.js";

const AGENT_NAME = "retrieval-agent";
const ACCESS_SCOPE = "all";

export const retrievalAgent = {
  name: AGENT_NAME,
  model: retrievalAgentConfig.model,
  maxSteps: retrievalAgentConfig.maxSteps,
  namespaces: resolveAgentAccess(ACCESS_SCOPE),
  tools: retrievalTools,
  buildSystem: () => buildSystemPrompt(buildFiletree(ACCESS_SCOPE)),
} satisfies Agent;

/**
 * Answer a natural-language question by reading across the filesystem and
 * synthesizing a single response. Each call is an independent, stateless run.
 */
export function runRetrievalQuery(query: string): Promise<string> {
  return runAgentToCompletion(retrievalAgent, [{ role: "user", content: query }]);
}

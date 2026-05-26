import {
  streamText,
  generateText,
  stepCountIs,
  type ModelMessage,
} from "ai";
import type { Agent } from "./types.js";
import { logAgentStep, logAgentError } from "./logger.js";

export function runAgent(agent: Agent, messages: ModelMessage[]) {
  return streamText({
    model: agent.model,
    system: agent.buildSystem(),
    messages,
    tools: agent.tools,
    stopWhen: stepCountIs(agent.maxSteps),
    onStepFinish: (step) => logAgentStep(agent.name, step),
    onError: ({ error }) => logAgentError(agent.name, error),
  });
}

export function runAgentInBackground(
  agent: Agent,
  messages: ModelMessage[],
): void {
  Promise.resolve(runAgent(agent, messages).consumeStream()).catch(
    (err: unknown) => logAgentError(agent.name, err),
  );
}

/**
 * Run an agent to completion and return its final text. Drives the same
 * multi-step tool loop as the streaming runner but resolves to one final
 * string instead of a stream, for request/response callers that have no
 * channel to stream into (e.g. an MCP tool handler).
 */
export async function runAgentToCompletion(
  agent: Agent,
  messages: ModelMessage[],
): Promise<string> {
  const { text } = await generateText({
    model: agent.model,
    system: agent.buildSystem(),
    messages,
    tools: agent.tools,
    stopWhen: stepCountIs(agent.maxSteps),
    onStepFinish: (step) => logAgentStep(agent.name, step),
  });
  return text;
}

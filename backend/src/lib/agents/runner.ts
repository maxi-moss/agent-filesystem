import { streamText, stepCountIs, type ModelMessage } from "ai";
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

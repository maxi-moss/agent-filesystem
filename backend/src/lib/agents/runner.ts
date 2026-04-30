import { streamText, stepCountIs, type ModelMessage } from "ai";
import type { Agent } from "./types.js";

export function runAgent(agent: Agent, messages: ModelMessage[]) {
  return streamText({
    model: agent.model,
    system: agent.buildSystem(),
    messages,
    tools: agent.tools,
    stopWhen: stepCountIs(agent.maxSteps),
  });
}

export function runAgentInBackground(
  agent: Agent,
  messages: ModelMessage[],
): void {
  Promise.resolve(runAgent(agent, messages).consumeStream()).catch(
    (err: unknown) => console.error(`[${agent.name}]`, err),
  );
}

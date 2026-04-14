import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ModelMessage } from "ai";
import { dbConfig, summarizerConfig } from "./lib/config.js";
import { createFilesystem, getFilesystem } from "./lib/filesystem/index.js";
import { runMainAgent, summarizeConversation } from "./features/chat/index.js";

createFilesystem(dbConfig.path);
const messages: ModelMessage[] = [];
const rl = readline.createInterface({ input: stdin, output: stdout });

async function endSession(): Promise<never> {
  rl.close();
  if (messages.length > 0) {
    const summary = await summarizeConversation(messages);
    const path = `${summarizerConfig.dir}/${new Date().toISOString()}.md`;
    getFilesystem().upsert(path, summary);
    console.log(`\nsession summary saved to ${path}`);
  }
  process.exit(0);
}

process.on("SIGINT", () => void endSession());

console.log("agent ready. ctrl-c to exit.");
while (true) {
  const input = (await rl.question("> ")).trim();
  if (!input) continue;

  messages.push({ role: "user", content: input });
  const result = runMainAgent(messages);

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const steps = await result.steps;
  for (const step of steps) {
    console.log(`\n[step ${steps.indexOf(step) + 1}] toolCalls: ${step.toolCalls.length}, toolResults: ${step.toolResults.length}, text: ${step.text.length > 0 ? step.text.slice(0, 80) : "(empty)"}`);
  }
  messages.push(...steps.flatMap((s) => s.response.messages));

  const text = await result.text;
  if (!text) console.log("\n[warn] empty response from LLM\n");
  else console.log("\n");
}

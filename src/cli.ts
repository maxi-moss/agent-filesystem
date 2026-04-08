import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { ModelMessage } from "ai";
import { dbConfig, summarizerConfig } from "./config.js";
import { init } from "./index.js";
import * as db from "./filesystem/db.js";
import { createAgent } from "./agents/main-agent/index.js";
import { summarizeConversation } from "./conversation-summary/conversationSummarizer.js";

init(dbConfig.path);
const agent = createAgent();
const messages: ModelMessage[] = [];
const rl = readline.createInterface({ input: stdin, output: stdout });

async function endSession(): Promise<never> {
  rl.close();
  if (messages.length > 0) {
    const summary = await summarizeConversation(messages);
    const path = `${summarizerConfig.dir}/${new Date().toISOString()}.md`;
    db.upsert(path, summary);
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
  const { text, steps } = await agent.run(messages);

  for (const step of steps) messages.push(...step.response.messages);

  console.log(text + "\n");
}

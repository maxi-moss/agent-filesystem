import { Hono, type Context } from "hono";
import { convertToModelMessages, type UIMessage } from "ai";
import { summarizerConfig } from "../../lib/config.js";
import { getFilesystem } from "../../lib/filesystem/index.js";
import { HTTPException } from "hono/http-exception";
import { runMainAgent, summarizeConversation } from "./service.js";

export const chatRoutes = new Hono();

async function parseMessages(context: Context): Promise<UIMessage[]> {
  const body = await context.req.json<{ messages?: UIMessage[] }>();
  if (!body.messages?.length) throw new HTTPException(400, { message: "messages required" });
  return body.messages;
}

chatRoutes.post("/", async (context) => {
  const messages = await parseMessages(context);
  const modelMessages = await convertToModelMessages(messages);
  const result = runMainAgent(modelMessages);
  return result.toUIMessageStreamResponse();
});

chatRoutes.post("/summarize", async (context) => {
  const messages = await parseMessages(context);
  const modelMessages = await convertToModelMessages(messages);
  const summary = await summarizeConversation(modelMessages);
  const summaryPath = `${summarizerConfig.dir}/${new Date().toISOString()}.md`;
  getFilesystem().upsert(summaryPath, summary);
  return context.json({ summary, path: summaryPath });
});

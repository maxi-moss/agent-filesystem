import { Hono, type Context } from "hono";
import { convertToModelMessages, type UIMessage } from "ai";
import { summarizerConfig } from "../../lib/config.js";
import { getFilesystem } from "../../lib/filesystem/index.js";
import { InvalidChatMessagesError } from "./errors.js";
import { runMainAgent, summarizeConversation } from "./service.js";

export const chatRoutes = new Hono();

interface ChatBody {
  messages?: UIMessage[];
  runId?: string;
}

async function parseBody(
  context: Context,
): Promise<{ messages: UIMessage[]; runId: string | undefined }> {
  const body = await context.req.json<ChatBody>();
  if (!body.messages?.length) throw new InvalidChatMessagesError("messages required");
  return { messages: body.messages, runId: body.runId };
}

chatRoutes.post("/", async (context) => {
  const { messages, runId } = await parseBody(context);
  const modelMessages = await convertToModelMessages(messages);
  const result = runMainAgent(modelMessages, runId);
  return result.toUIMessageStreamResponse();
});

chatRoutes.post("/summarize", async (context) => {
  const { messages } = await parseBody(context);
  const modelMessages = await convertToModelMessages(messages);
  const summary = await summarizeConversation(modelMessages);
  const summaryPath = `${summarizerConfig.dir}/${new Date().toISOString()}.md`;
  getFilesystem().upsert(summaryPath, summary);
  return context.json({ summary, path: summaryPath });
});

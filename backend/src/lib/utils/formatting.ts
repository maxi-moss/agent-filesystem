import type {
  ModelMessage,
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from "ai";

type RelevantPart = TextPart | ToolCallPart | ToolResultPart;
type ToolOutput = ToolResultPart["output"];

export type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

/** Render a conversation as a plain-text transcript for summarization. */
export function formatConversationForSummary(messages: ModelMessage[]): string {
  return messages.map(formatMessage).filter(Boolean).join("\n\n");
}

function formatMessage(message: ModelMessage): string {
  if (typeof message.content === "string") {
    const trimmed = message.content.trim();
    return trimmed ? `${message.role.toUpperCase()}:\n${trimmed}` : "";
  }
  const lines = message.content.filter(isRelevantPart).map(formatPart).filter(Boolean);
  return lines.length === 0 ? "" : `${message.role.toUpperCase()}:\n${lines.join("\n")}`;
}

function isRelevantPart(part: { type: string }): part is RelevantPart {
  return (
    part.type === "text" ||
    part.type === "tool-call" ||
    part.type === "tool-result"
  );
}

function formatPart(part: RelevantPart): string {
  switch (part.type) {
    case "text":
      return part.text.trim();
    case "tool-call":
      return `[tool-call ${part.toolName}] ${JSON.stringify(part.input)}`;
    case "tool-result":
      return `[tool-result ${part.toolName}] ${formatToolOutput(part.output)}`;
  }
}

export function formatToolResult(fn: () => string): ToolResult {
  try {
    return { ok: true, output: fn() };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

function formatToolOutput(output: ToolOutput): string {
  if (output.type === "execution-denied") {
    return `execution denied${output.reason ? `: ${output.reason}` : ""}`;
  }
  return typeof output.value === "string" ? output.value : JSON.stringify(output.value);
}
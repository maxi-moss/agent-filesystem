import type { StepResult, ToolSet } from "ai";

const MAX_FIELD_LENGTH = 200;

/**
 * Format one completed agent step into compact, one-line-per-action terminal
 * output. Renders the agent's text as `thinking:`, each tool call as `→`, and
 * each tool result as `✓`/`✗`. Returns the lines without emitting them so the
 * formatting can be unit-tested independently of the console.
 */
export function formatAgentStep(
  agentName: string,
  step: StepResult<ToolSet>,
): string[] {
  const prefix = `[${agentName}]`;
  return step.content
    .map(formatPart)
    .filter((line): line is string => line !== null)
    .map((line) => `${prefix} ${line}`);
}

/** Format and write a completed agent step to the terminal. */
export function logAgentStep(
  agentName: string,
  step: StepResult<ToolSet>,
): void {
  for (const line of formatAgentStep(agentName, step)) {
    console.error(line);
  }
}

/** Format and write an agent run failure to the terminal. */
export function logAgentError(agentName: string, error: unknown): void {
  console.error(`[${agentName}] ✗ run failed → ${describeError(error)}`);
}

function formatPart(part: StepResult<ToolSet>["content"][number]): string | null {
  switch (part.type) {
    case "text": {
      const text = collapse(part.text);
      return text ? `thinking: ${truncate(text)}` : null;
    }
    case "tool-call":
      return `→ ${part.toolName}(${truncate(stringifyInput(part.input))})`;
    case "tool-result": {
      const { ok, body } = describeToolOutput(part.output);
      return `${ok ? "✓" : "✗"} ${part.toolName} → ${truncate(body)}`;
    }
    case "tool-error":
      return `✗ ${part.toolName} → ${truncate(describeError(part.error))}`;
    default:
      return null;
  }
}

function describeToolOutput(output: unknown): { ok: boolean; body: string } {
  if (output && typeof output === "object" && "ok" in output) {
    const result = output as { ok: boolean; output?: unknown; error?: unknown };
    return result.ok
      ? { ok: true, body: collapse(stringify(result.output)) }
      : { ok: false, body: collapse(stringify(result.error)) };
  }
  return { ok: true, body: collapse(stringify(output)) };
}

function stringifyInput(input: unknown): string {
  return typeof input === "object" && input !== null
    ? JSON.stringify(input)
    : stringify(input);
}

function stringify(value: unknown): string {
  if (value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : stringify(error);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function truncate(text: string): string {
  return text.length > MAX_FIELD_LENGTH
    ? `${text.slice(0, MAX_FIELD_LENGTH)}…`
    : text;
}

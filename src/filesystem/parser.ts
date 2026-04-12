import { parse } from "just-bash";
import type { SimpleCommandNode, WordNode } from "just-bash";

type WordPart = WordNode["parts"][number];
type RedirectionNode = SimpleCommandNode["redirections"][number];

export interface ParsedCommand {
  command: string;
  args: string[];
  /** Target path of a `>` redirect, if present. */
  redirect?: string | undefined;
}

function resolveWord(word: WordNode): string {
  return word.parts.map(resolvePart).join("");
}

function resolveRedirect(nodes: RedirectionNode[]): string | undefined {
  const node = nodes.find((n) => n.operator === ">");
  return node ? resolveWord(node.target as WordNode) : undefined;
}

function resolvePart(part: WordPart): string {
  switch (part.type) {
    case "Literal":
    case "SingleQuoted":
    case "Escaped":
      return part.value;
    case "DoubleQuoted":
      return part.parts.map(resolvePart).join("");
    default:
      throw new Error(`Unsupported shell syntax: ${part.type}`);
  }
}

/** Parse a raw bash input string into a structured command. */
export function parseCommand(input: string): ParsedCommand {
  const ast = parse(input);
  const cmd = ast.statements[0]?.pipelines[0]?.commands[0];

  if (!cmd || cmd.type !== "SimpleCommand") {
    throw new Error(`Expected a simple command, got: ${cmd?.type ?? "empty input"}`);
  }

  return {
    command: cmd.name ? resolveWord(cmd.name) : "",
    args: cmd.args.map(resolveWord),
    redirect: resolveRedirect(cmd.redirections),
  };
}

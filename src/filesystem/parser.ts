import { parse } from "just-bash";
import type { WordNode } from "just-bash";

type WordPart = WordNode["parts"][number];

export interface Redirect {
  type: ">";
  target: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
  redirects: Redirect[];
}

function resolveWord(word: WordNode): string {
  return word.parts.map(resolvePart).join("");
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
    redirects: cmd.redirections
      .filter((r) => r.operator === ">")
      .map((r) => ({ type: ">" as const, target: resolveWord(r.target as WordNode) })),
  };
}
